// Ve duong noi khop len canvas (toa do chuan hoa cua CAMERA, khong phai khung huan luyen).
// Chi de NHIN: MediaPipe va mo hinh van chay ngam du nguoi dung chon an net ve.
//
// Ba kieu:
//   'tay'    — chi hai ban tay (mac dinh): du de biet Meo co thay tay khong, khong roi mat.
//   'day-du' — them vai + canh tay (+ than neu nhin thay). KHONG bao gio ve len mat.
//   'an'     — khong ve gi.
// Net ve duoc lam muot giua cac khung (chi luc hien thi) cho do giat.
import type { DiemMP, KetQuaHolistic } from './diem';

export type KieuVe = 'tay' | 'day-du' | 'an';
export const KIEU_VE: { ma: KieuVe; ten: string }[] = [
	{ ma: 'tay', ten: 'Tay' },
	{ ma: 'day-du', ten: 'Đầy đủ' },
	{ ma: 'an', ten: 'Ẩn' }
];

export const MAU_VE = { than: '#ffffff', tayTrai: '#ff7aa2', tayPhai: '#ffc53d' };

const NOI_TAY: [number, number][] = [
	[0, 1], [1, 2], [2, 3], [3, 4],
	[0, 5], [5, 6], [6, 7], [7, 8],
	[5, 9], [9, 10], [10, 11], [11, 12],
	[9, 13], [13, 14], [14, 15], [15, 16],
	[13, 17], [17, 18], [18, 19], [19, 20], [0, 17]
];
const DAU_NGON = new Set([4, 8, 12, 16, 20]);
const NOI_CANH_TAY: [number, number][] = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16]];
const NOI_THAN: [number, number][] = [[11, 23], [12, 24], [23, 24]];

type Diem = { x: number; y: number; v?: number };

/** Diem than co dang tin: MediaPipe tu tin (visibility) va nam gan trong hinh. */
function tinDuoc(d: Diem | undefined): d is Diem {
	return !!d && (d.v === undefined || d.v >= 0.5) && d.x > -0.05 && d.x < 1.05 && d.y > -0.05 && d.y < 1.05;
}

function coMau(hex: string, alpha: number): string {
	const n = parseInt(hex.slice(1), 16);
	return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export class ButVe {
	private truoc = new Map<string, Diem[]>();

	/** heSo: 1 = khong lam muot; nho hon = muot hon nhung tre hon. */
	constructor(private heSo = 0.6) {}

	datLai() {
		this.truoc.clear();
	}

	private muot(ten: string, d: DiemMP[] | undefined): Diem[] | null {
		if (!d?.length) {
			this.truoc.delete(ten);
			return null;
		}
		const cu = this.truoc.get(ten);
		const a = this.heSo;
		const moi = d.map((p, i) => {
			const c = cu?.[i];
			return c
				? { x: c.x + (p.x - c.x) * a, y: c.y + (p.y - c.y) * a, v: p.visibility }
				: { x: p.x, y: p.y, v: p.visibility };
		});
		this.truoc.set(ten, moi);
		return moi;
	}

	ve(ctx: CanvasRenderingContext2D, kq: KetQuaHolistic | null, kieu: KieuVe, { dauTron = false } = {}) {
		const { width: w, height: h } = ctx.canvas;
		ctx.clearRect(0, 0, w, h);
		if (!kq || kieu === 'an') {
			this.datLai();
			return;
		}
		const s = Math.max(1.5, w / 480); // do day chuan theo kich thuoc hinh
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		const than = this.muot('than', kq.poseLandmarks?.[0]);
		const trai = this.muot('trai', kq.leftHandLandmarks?.[0]);
		const phai = this.muot('phai', kq.rightHandLandmarks?.[0]);

		if (kieu === 'day-du' && than) {
			if (dauTron) veDau(ctx, than, w, h, s);
			veDoan(ctx, than, [...NOI_CANH_TAY, ...NOI_THAN], w, h, s);
		}
		if (trai) veBanTay(ctx, trai, MAU_VE.tayTrai, w, h, s);
		if (phai) veBanTay(ctx, phai, MAU_VE.tayPhai, w, h, s);
	}
}

/** Vai, canh tay, than: net trang mem, vien toi mo de noi tren nen sang. */
function veDoan(ctx: CanvasRenderingContext2D, d: Diem[], noi: [number, number][], w: number, h: number, s: number) {
	const doan = noi.filter(([a, b]) => tinDuoc(d[a]) && tinDuoc(d[b]));
	if (!doan.length) return;
	const duong = () => {
		ctx.beginPath();
		for (const [a, b] of doan) {
			ctx.moveTo(d[a].x * w, d[a].y * h);
			ctx.lineTo(d[b].x * w, d[b].y * h);
		}
	};
	duong();
	ctx.strokeStyle = 'rgba(16, 36, 64, 0.28)';
	ctx.lineWidth = s * 4;
	ctx.stroke();
	duong();
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
	ctx.lineWidth = s * 1.6;
	ctx.stroke();
	ctx.fillStyle = '#ffffff';
	for (const i of new Set(doan.flat())) {
		ctx.beginPath();
		ctx.arc(d[i].x * w, d[i].y * h, s * 2, 0, Math.PI * 2);
		ctx.fill();
	}
}

/** Ban tay: quang mau mo + net manh + khop cham tron, dau ngon to hon mot chut. */
function veBanTay(ctx: CanvasRenderingContext2D, d: Diem[], mau: string, w: number, h: number, s: number) {
	const duong = () => {
		ctx.beginPath();
		for (const [a, b] of NOI_TAY) {
			if (!d[a] || !d[b]) continue;
			ctx.moveTo(d[a].x * w, d[a].y * h);
			ctx.lineTo(d[b].x * w, d[b].y * h);
		}
	};
	duong();
	ctx.strokeStyle = coMau(mau, 0.3);
	ctx.lineWidth = s * 4.2;
	ctx.stroke();
	duong();
	ctx.strokeStyle = mau;
	ctx.lineWidth = s * 1.5;
	ctx.stroke();
	for (let i = 0; i < d.length; i++) {
		ctx.beginPath();
		ctx.arc(d[i].x * w, d[i].y * h, DAU_NGON.has(i) ? s * 2.1 : s * 1.3, 0, Math.PI * 2);
		ctx.fillStyle = '#ffffff';
		ctx.fill();
		ctx.lineWidth = s * 0.9;
		ctx.strokeStyle = mau;
		ctx.stroke();
	}
}

/** Chi cho "nguoi que" gia lap: cai dau tron. Camera that khong bao gio ve len mat. */
function veDau(ctx: CanvasRenderingContext2D, d: Diem[], w: number, h: number, s: number) {
	if (!d[0] || !d[7] || !d[8]) return;
	const r = Math.max(Math.hypot((d[7].x - d[8].x) * w, (d[7].y - d[8].y) * h) * 0.75, 8);
	ctx.beginPath();
	ctx.arc(d[0].x * w, d[0].y * h - r * 0.15, r, 0, Math.PI * 2);
	ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
	ctx.fill();
	ctx.lineWidth = s * 1.6;
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
	ctx.stroke();
}

/** Doc / luu lua chon kieu ve (moi trinh duyet nho rieng). */
const KHOA_KIEU_VE = 'vslink-kieu-ve';
export function docKieuVe(): KieuVe {
	try {
		const k = localStorage.getItem(KHOA_KIEU_VE);
		if (k === 'tay' || k === 'day-du' || k === 'an') return k;
	} catch {
		/* bi chan: dung mac dinh */
	}
	return 'tay';
}
export function luuKieuVe(k: KieuVe) {
	try {
		localStorage.setItem(KHOA_KIEU_VE, k);
	} catch {
		/* bo qua */
	}
}
