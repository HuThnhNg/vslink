// Phia trang cong cu cua "cau noi" QIPEDC: mo tab QIPEDC, nhan danh sach video, nho
// tab do tai tung video (tab QIPEDC cung nguon nen tai duoc, trang VSLink thi bi
// trinh duyet chan doc hinh cua trang khac). Doi tac: static/cong-cu/lenh-qipedc.js.
import { GOC_QIPEDC, type MucQipedc } from './khop-tu';

type Cho = { ok: (b: Blob) => void; loi: (e: Error) => void; hen: ReturnType<typeof setTimeout> };

export class CauNoiQipedc {
	trangThai = $state<'chua' | 'cho' | 'da-noi'>('chua');
	ds = $state.raw<MucQipedc[]>([]);
	mau = $state('/videos/{ma}.mp4');
	/** lan cuoi nghe tab QIPEDC bao "con song" (ms) */
	lanCuoi = $state(0);

	private cuaSo: Window | null = null;
	private cho = new Map<string, Cho>();
	private dem = 0;

	constructor(private onDs?: (ds: MucQipedc[], mau: string) => void) {}

	batDau() {
		window.addEventListener('message', this.nhan);
	}
	dung() {
		window.removeEventListener('message', this.nhan);
		for (const c of this.cho.values()) {
			clearTimeout(c.hen);
			c.loi(new Error('Đã dừng'));
		}
		this.cho.clear();
	}

	moQipedc() {
		this.cuaSo = window.open(`${GOC_QIPEDC}/dictionary`, 'vslink-qipedc');
		if (this.trangThai === 'chua') this.trangThai = 'cho';
	}

	/** Nap san danh sach (tu file hoac luu truoc do) — van can noi tab de tai video. */
	datDs(ds: MucQipedc[], mau: string) {
		this.ds = ds;
		this.mau = mau || this.mau;
	}

	get conSong() {
		return this.cuaSo !== null && this.trangThai === 'da-noi';
	}

	private nhan = (e: MessageEvent) => {
		if (e.origin !== GOC_QIPEDC) return;
		const d = e.data as Record<string, unknown> | null;
		if (!d || typeof d !== 'object') return;
		if (e.source) this.cuaSo = e.source as Window;
		this.lanCuoi = Date.now();
		if (d.loai === 'vslink-qipedc') {
			if (typeof d.mau === 'string') this.mau = d.mau;
			if (Array.isArray(d.ds)) {
				const ds = (d.ds as MucQipedc[]).filter((x) => x && typeof x.ma === 'string' && typeof x.tu === 'string');
				this.ds = ds;
				this.trangThai = 'da-noi';
				this.onDs?.(ds, this.mau);
			} else if (this.ds.length !== d.so_luong) {
				this.cuaSo?.postMessage({ loai: 'vslink-xin-ds' }, GOC_QIPEDC);
			} else {
				this.trangThai = 'da-noi';
			}
		} else if (d.loai === 'vslink-video' && typeof d.id === 'string') {
			const c = this.cho.get(d.id);
			if (!c) return;
			this.cho.delete(d.id);
			clearTimeout(c.hen);
			if (d.ok && d.buf instanceof ArrayBuffer) c.ok(new Blob([d.buf], { type: String(d.kieu || 'video/mp4') }));
			else c.loi(new Error(String(d.loi || 'không tải được')));
		}
	};

	/** Tai mot video: video QIPEDC qua tab QIPEDC; link khac thi tai thang (can CORS). */
	async layVideo(url: string, choToiDa = 90_000): Promise<Blob> {
		if (!url.startsWith(GOC_QIPEDC + '/')) {
			const r = await fetch(url);
			if (!r.ok) throw new Error(`HTTP ${r.status}`);
			return r.blob();
		}
		const w = this.cuaSo;
		if (!w || w.closed) throw new Error('Chưa nối tab QIPEDC');
		const id = `v${++this.dem}`;
		return new Promise<Blob>((ok, loi) => {
			const hen = setTimeout(() => {
				this.cho.delete(id);
				loi(new Error('Tab QIPEDC không trả lời (đã đóng hoặc tải lại?)'));
			}, choToiDa);
			this.cho.set(id, { ok, loi, hen });
			w.postMessage({ loai: 'vslink-lay-video', id, url }, GOC_QIPEDC);
		});
	}
}
