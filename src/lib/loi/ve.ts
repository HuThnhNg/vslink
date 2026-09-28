// Ve khung xuong len canvas (toa do chuan hoa cua CAMERA, khong phai khung huan luyen).
import type { DiemMP, KetQuaHolistic } from './diem';

const NOI_THAN: [number, number][] = [
	[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
	[15, 17], [15, 19], [15, 21], [17, 19], [16, 18], [16, 20], [16, 22], [18, 20],
	[0, 2], [0, 5], [2, 7], [5, 8], [9, 10]
];
const NOI_TAY: [number, number][] = [
	[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11],
	[11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]
];

export const MAU_VE = { than: '#ffffff', vien: 'rgba(28, 58, 110, 0.55)', tayTrai: '#ff7aa2', tayPhai: '#ffc53d' };

function veNhom(ctx: CanvasRenderingContext2D, d: DiemMP[] | undefined, noi: [number, number][], mau: string, w: number, h: number, day: number, chiDiem?: number[]) {
	if (!d?.length) return;
	ctx.lineCap = 'round';
	for (const [lop, ve] of [[day + 3, MAU_VE.vien], [day, mau]] as const) {
		ctx.strokeStyle = ve;
		ctx.lineWidth = lop;
		ctx.beginPath();
		for (const [a, b] of noi) {
			if (!d[a] || !d[b]) continue;
			ctx.moveTo(d[a].x * w, d[a].y * h);
			ctx.lineTo(d[b].x * w, d[b].y * h);
		}
		ctx.stroke();
	}
	ctx.fillStyle = mau;
	for (const i of chiDiem ?? d.map((_, i) => i)) {
		if (!d[i]) continue;
		ctx.beginPath();
		ctx.arc(d[i].x * w, d[i].y * h, day * 0.9, 0, Math.PI * 2);
		ctx.fill();
	}
}

/** dauTron: ve them cai dau tron (chi dung cho "nguoi que" gia lap, cho de nhin). */
export function veKhungXuong(ctx: CanvasRenderingContext2D, kq: KetQuaHolistic | null, { dauTron = false } = {}) {
	const { width: w, height: h } = ctx.canvas;
	ctx.clearRect(0, 0, w, h);
	if (!kq) return;
	const day = Math.max(2, Math.round(w / 260));
	const p = kq.poseLandmarks?.[0];
	if (dauTron && p?.[0] && p[7] && p[8]) {
		const r = Math.max(Math.hypot((p[7].x - p[8].x) * w, (p[7].y - p[8].y) * h) * 0.75, 8);
		ctx.beginPath();
		ctx.arc(p[0].x * w, p[0].y * h - r * 0.15, r, 0, Math.PI * 2);
		ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
		ctx.fill();
		ctx.lineWidth = day;
		ctx.strokeStyle = MAU_VE.than;
		ctx.stroke();
	}
	veNhom(ctx, kq.poseLandmarks?.[0], NOI_THAN, MAU_VE.than, w, h, day, [0, 11, 12, 13, 14, 15, 16, 23, 24]);
	veNhom(ctx, kq.leftHandLandmarks?.[0], NOI_TAY, MAU_VE.tayTrai, w, h, Math.max(1.5, day * 0.7));
	veNhom(ctx, kq.rightHandLandmarks?.[0], NOI_TAY, MAU_VE.tayPhai, w, h, Math.max(1.5, day * 0.7));
}
