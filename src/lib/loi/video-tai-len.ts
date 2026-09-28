// Video tai len -> keypoint tung khung. Duong nay CHAC CHAN nhat: khong phu thuoc
// toc do may (tua tung khung mot), dung khi may yeu hoac can ket qua chac chan.
import type { KhungVao } from './cat-doan';
import { docTinHieu, khungTuHolistic, type KetQuaHolistic } from './diem';
import { napHolistic, thoiDiemTang } from './nhan-dang';

const FPS_DOC = 25;
const GIAY_TOI_DA = 12;

function cho(el: HTMLElement, su: string, giay = 10): Promise<void> {
	return new Promise((ok, loi) => {
		const h = setTimeout(() => loi(new Error(`Qua thoi gian cho "${su}"`)), giay * 1000);
		el.addEventListener(su, () => (clearTimeout(h), ok()), { once: true });
		el.addEventListener('error', () => (clearTimeout(h), loi(new Error('Trinh duyet khong doc duoc video nay'))), { once: true });
	});
}

/** Khong tai duoc MediaPipe (mang yeu / bi chan) — khac voi video hong. */
export class LoiMediaPipe extends Error {}

export type KetQuaVideo = { khung: KhungVao[]; thoiLuong: number; rong: number; cao: number; catTu: number; catDen: number };

/**
 * latGuong: video quay kieu "soi guong" (camera truoc cua mot so dien thoai) —
 * lat lai truoc khi nhan dang de tay trai / phai dung nhu du lieu huan luyen.
 */
export async function docVideo(
	tep: File | Blob,
	{ latGuong = false, onTienTrinh }: { latGuong?: boolean; onTienTrinh?: (p: number) => void } = {}
): Promise<KetQuaVideo> {
	let may: Awaited<ReturnType<typeof napHolistic>>;
	try {
		may = await napHolistic();
	} catch (e) {
		throw new LoiMediaPipe(String(e));
	}
	const url = URL.createObjectURL(tep);
	const v = document.createElement('video');
	v.muted = true;
	v.playsInline = true;
	v.preload = 'auto';
	v.src = url;
	try {
		await cho(v, 'loadeddata');
		const rong = v.videoWidth;
		const cao = v.videoHeight;
		if (!rong || !cao) throw new Error('Video không có hình');
		const thoiLuong = Math.min(v.duration || 0, GIAY_TOI_DA);
		const n = Math.max(1, Math.floor(thoiLuong * FPS_DOC));
		let nguon: HTMLVideoElement | HTMLCanvasElement = v;
		let ctx: CanvasRenderingContext2D | null = null;
		if (latGuong) {
			const c = document.createElement('canvas');
			c.width = rong;
			c.height = cao;
			ctx = c.getContext('2d');
			nguon = c;
		}
		const khung: KhungVao[] = [];
		for (let i = 0; i < n; i++) {
			v.currentTime = Math.min(i / FPS_DOC, Math.max(0, (v.duration || 0) - 0.001));
			await cho(v, 'seeked');
			if (ctx) {
				ctx.setTransform(-1, 0, 0, 1, rong, 0);
				ctx.drawImage(v, 0, 0, rong, cao);
			}
			const kq = may.detectForVideo(nguon, thoiDiemTang()) as unknown as KetQuaHolistic;
			const kp = khungTuHolistic(kq, rong, cao);
			khung.push({ t: i / FPS_DOC, kp, tinHieu: docTinHieu(kp) });
			onTienTrinh?.((i + 1) / n);
		}
		const [a, b] = catGon(khung);
		return { khung: khung.slice(a, b + 1), thoiLuong: (b - a) / FPS_DOC, rong, cao, catTu: a / FPS_DOC, catDen: b / FPS_DOC };
	} finally {
		URL.revokeObjectURL(url);
		v.removeAttribute('src');
		v.load();
	}
}

/**
 * Cat gon quanh ky hieu: tu khung dau den khung cuoi co tay nang, chua le 0,3 giay
 * moi ben. Khong co khung nao tay nang thi giu nguyen ca video.
 */
export function catGon(khung: KhungVao[]): [number, number] {
	const co = khung.map((k) => k.tinHieu.tayNang);
	const dau = co.indexOf(true);
	const cuoi = co.lastIndexOf(true);
	if (dau < 0) return [0, Math.max(khung.length - 1, 0)];
	const le = Math.round(0.3 * FPS_DOC);
	return [Math.max(0, dau - le), Math.min(khung.length - 1, cuoi + le)];
}
