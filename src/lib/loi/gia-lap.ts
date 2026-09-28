// Nguoi gia lap (toa do khung huan luyen): dung cho unit test va che do "?gia-lap=1"
// (chay thu toan bo luong ma khong can camera).
import { SO_DIEM } from './hang-so';
import type { DiemMP, KetQuaHolistic, Khung } from './diem';

export type TuThe = {
	coTayTrai?: [number, number] | null; // vi tri co tay trai (pose 15)
	coTayPhai?: [number, number] | null; // vi tri co tay phai (pose 16)
	banTay?: boolean; // co 21 diem ban tay khong
	nguoi?: boolean;
	lech?: number; // dich ca nguoi theo x
};

export function khungGia({
	coTayTrai = [0.62, 0.8],
	coTayPhai = [0.38, 0.8],
	banTay = true,
	nguoi = true,
	lech = 0
}: TuThe = {}): Khung {
	const kp = new Float32Array(SO_DIEM * 2);
	if (!nguoi) return kp;
	const diem = new Map<number, [number, number]>();
	// mat, vai, hong (nguoi ky nhin thang camera: vai TRAI nam ben PHAI anh)
	const MAT: [number, number][] = [
		[0.5, 0.31], // 0 mui
		[0.515, 0.29], [0.525, 0.29], [0.535, 0.29], // 1-3 mat trai (nam ben PHAI anh)
		[0.485, 0.29], [0.475, 0.29], [0.465, 0.29], // 4-6 mat phai
		[0.555, 0.3], [0.445, 0.3], // 7-8 tai
		[0.515, 0.335], [0.485, 0.335] // 9-10 mieng
	];
	MAT.forEach((xy, i) => diem.set(i, xy));
	diem.set(11, [0.6, 0.45]);
	diem.set(12, [0.4, 0.45]);
	diem.set(23, [0.57, 0.75]);
	diem.set(24, [0.43, 0.75]);
	for (let i = 25; i < 33; i++) diem.set(i, [0.45 + 0.01 * (i - 25), 0.95]);
	const tay = (vai: number, khuyu: number, coTay: number, dau: number[], xy: [number, number] | null) => {
		if (!xy) return;
		const [vx, vy] = diem.get(vai)!;
		diem.set(khuyu, [(vx + xy[0]) / 2, (vy + xy[1]) / 2]);
		diem.set(coTay, xy);
		dau.forEach((i, j) => diem.set(i, [xy[0] + 0.01 * (j + 1), xy[1] - 0.02]));
	};
	tay(11, 13, 15, [17, 19, 21], coTayTrai);
	tay(12, 14, 16, [18, 20, 22], coTayPhai);
	if (banTay) {
		for (const [bd, xy] of [[33, coTayTrai], [54, coTayPhai]] as const) {
			if (!xy) continue;
			for (let j = 0; j < 21; j++) diem.set(bd + j, [xy[0] + 0.004 * (j % 5), xy[1] - 0.005 * Math.floor(j / 4)]);
		}
	}
	for (const [i, [x, y]] of diem) {
		kp[i * 2] = x + lech;
		kp[i * 2 + 1] = y;
	}
	return kp;
}

/**
 * Kich ban lap lai moi 5 giay: dung yen 1,6 giay -> ky 1,8 giay (tay phai ve vong
 * tron truoc nguc, ban tay khep mo) -> ha tay 1,6 giay.
 */
export function khungKichBan(t: number): Khung {
	const c = t % 5;
	if (c < 1.6 || c > 3.4) return khungGia();
	const u = (c - 1.6) / 1.8;
	const g = 2 * Math.PI * u * 1.5;
	return khungGia({ coTayPhai: [0.43 + 0.08 * Math.sin(g), 0.5 - 0.06 * Math.cos(g)], coTayTrai: [0.62, 0.8] });
}

/** Khung -> dang ket qua Holistic de ve len canvas. */
export function ketQuaTuKhung(kp: Khung): KetQuaHolistic {
	const lay = (a: number, b: number): DiemMP[] => {
		const d: DiemMP[] = [];
		for (let i = a; i < b; i++) d.push({ x: kp[i * 2], y: kp[i * 2 + 1] });
		return d;
	};
	const co = (a: number, b: number) => lay(a, b).some((d) => d.x !== 0 || d.y !== 0);
	return {
		poseLandmarks: co(0, 33) ? [lay(0, 33)] : [],
		leftHandLandmarks: co(33, 54) ? [lay(33, 54)] : [],
		rightHandLandmarks: co(54, 75) ? [lay(54, 75)] : []
	};
}
