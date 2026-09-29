// Lay dung 60 khung nhu luc huan luyen: np.linspace(0, T - 1, 60).astype(int).
import { SO_DIEM, SO_KHUNG } from './hang-so';
import type { Khung } from './diem';

/** chi_so[i] = floor(i * (T - 1) / 59). Da doi chieu voi numpy moi T <= 20 000. */
export function chiSoLayMau(T: number, n = SO_KHUNG): number[] {
	if (T <= 0) return [];
	return Array.from({ length: n }, (_, i) => Math.floor((i * (T - 1)) / (n - 1)));
}

/** Nhieu khung -> mot mang phang [60, 75, 2] dua thang vao mo hinh. */
export function dongGoi(khung: Khung[], n = SO_KHUNG): Float32Array {
	const ra = new Float32Array(n * SO_DIEM * 2);
	if (!khung.length) return ra;
	chiSoLayMau(khung.length, n).forEach((j, i) => ra.set(khung[j], i * SO_DIEM * 2));
	return ra;
}

/**
 * Ky truc tiep: camera chay khong deu (may yeu ~13 hinh/giay) nen lay 60 khung theo
 * CHI SO se lap lai hinh, dong tac thanh "giat cuc", khac luc huan luyen (video deu
 * 25–30 hinh/giay). Ham nay lay 60 moc CACH DEU THEO THOI GIAN va noi suy tuyen tinh
 * giua hai khung ke nhau. Diem nao mot trong hai khung khong bat duoc (0, 0) thi lay
 * khung gan hon — khong noi suy voi diem "khong co" (se ra toa do rac).
 * Video tai len van dung dongGoi (hinh deu, giong het notebook).
 */
export function noiSuy(khung: { t: number; kp: Khung }[], n = SO_KHUNG): Float32Array {
	const moi = SO_DIEM * 2;
	const ra = new Float32Array(n * moi);
	if (!khung.length) return ra;
	const t0 = khung[0].t;
	const t1 = khung[khung.length - 1].t;
	if (khung.length === 1 || !(t1 > t0)) return dongGoi(khung.map((k) => k.kp), n);
	let k = 0;
	for (let j = 0; j < n; j++) {
		const tau = t0 + ((t1 - t0) * j) / (n - 1);
		while (k < khung.length - 2 && khung[k + 1].t < tau) k++;
		const a = khung[k];
		const b = khung[k + 1];
		const al = Math.min(Math.max((tau - a.t) / (b.t - a.t), 0), 1);
		const gan = al < 0.5 ? a.kp : b.kp;
		const o = j * moi;
		for (let d = 0; d < SO_DIEM; d++) {
			const x = d * 2;
			const coA = a.kp[x] !== 0 || a.kp[x + 1] !== 0;
			const coB = b.kp[x] !== 0 || b.kp[x + 1] !== 0;
			if (coA && coB) {
				ra[o + x] = a.kp[x] + (b.kp[x] - a.kp[x]) * al;
				ra[o + x + 1] = a.kp[x + 1] + (b.kp[x + 1] - a.kp[x + 1]) * al;
			} else {
				ra[o + x] = gan[x];
				ra[o + x + 1] = gan[x + 1];
			}
		}
	}
	return ra;
}
