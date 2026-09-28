// 400 tu cua VSL400, DUNG THU TU dau ra cua mo hinh (tu.i = chi so lop), kem chu de
// va link video mau (Tu dien Ngon ngu ky hieu — du an QIPEDC, Bo GD&DT).
// Nhung thang vao ma (42 KB) de thu vien tu hien ngay, khong phai cho tai.
// Tao lai bang scripts/du-lieu/tao_tu_vung.py.
import duLieu from '$lib/du-lieu/tu-vung.json';

export type Tu = { i: number; tu: string; chu_de: string; video: string };
export type ChuDe = { ma: string; ten: string };
export type TuVung = { nguon_video: string; chu_de: ChuDe[]; tu: Tu[] };

export const TU_VUNG = duLieu as TuVung;
/** NHAN[i] = ten tu cua lop i */
export const NHAN: string[] = TU_VUNG.tu.map((t) => t.tu);
export const TEN_CHU_DE: Record<string, string> = Object.fromEntries(TU_VUNG.chu_de.map((c) => [c.ma, c.ten]));

export function tuTheoChuDe(ma: string): Tu[] {
	return TU_VUNG.tu.filter((t) => t.chu_de === ma);
}

/** Bo dau tieng Viet de tim kiem: "Bánh xèo" -> "banh xeo". */
export function boDau(s: string): string {
	return s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/đ/g, 'd')
		.replace(/Đ/g, 'D')
		.toLowerCase()
		.trim();
}

/** Xao tron (Fisher–Yates), r thay duoc de unit test. */
export function xaoTron<T>(ds: T[], r: () => number = Math.random): T[] {
	const a = ds.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}
