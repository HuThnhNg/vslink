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
