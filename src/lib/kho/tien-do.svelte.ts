// Tien do hoc: luu ngay tren may nguoi dung (localStorage), khong can dang nhap.
// On tap ngat quang kieu hop Leitner (Leitner, "So lernt man lernen", 1972):
// dung -> len mot hop, han on xa dan; sai -> ve hop 1 (on lai ngay mai).
const KHOA = 'vslink-tien-do-v1';
const NGAY_MS = 86_400_000;
/** so ngay cho den lan on tiep theo, theo hop 0..5 */
export const KHOANG_ON = [0, 1, 2, 4, 7, 15];
export const HOP_THUOC = 3;
export const HOP_CAO_NHAT = KHOANG_ON.length - 1;

export type BanGhi = { luot: number; dung: number; hop: number; lanCuoi: number; hanOn: number };
type DuLieu = { tu: Record<number, BanGhi>; ngay: Record<string, number> };

export function ngayKhoa(ms: number): string {
	const d = new Date(ms);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Thuan logic: cap nhat mot ban ghi sau mot lan ky.
 * hopGoc: hop LUC MO TU (mot "buoi" tap mot tu co the ky nhieu lan). Hop moi tinh
 * tu hopGoc theo lan ky GAN NHAT -> ky sai vai lan roi dung chi len DUNG MOT hop,
 * va mot doan cat nham (gai dau, chinh kinh...) khong day tu ve hop 1 mai mai.
 */
export function capNhatBanGhi(cu: BanGhi | undefined, dung: boolean, bayGio: number, hopGoc = cu?.hop ?? 0): BanGhi {
	const b = cu ?? { luot: 0, dung: 0, hop: 0, lanCuoi: 0, hanOn: 0 };
	const hop = dung ? Math.min(hopGoc + 1, HOP_CAO_NHAT) : 1;
	return {
		luot: b.luot + 1,
		dung: b.dung + (dung ? 1 : 0),
		hop,
		lanCuoi: bayGio,
		hanOn: bayGio + KHOANG_ON[hop] * NGAY_MS
	};
}

/** So ngay hoc lien tiep tinh den hom nay (hom nay chua hoc thi tinh den hom qua). */
export function tinhChuoiNgay(ngay: Record<string, number>, bayGio: number): number {
	let n = 0;
	let t = bayGio;
	if (!ngay[ngayKhoa(t)]) t -= NGAY_MS;
	while (ngay[ngayKhoa(t)]) {
		n++;
		t -= NGAY_MS;
	}
	return n;
}

class TienDo {
	tu = $state<Record<number, BanGhi>>({});
	ngay = $state<Record<string, number>>({});
	/** true sau khi da doc localStorage (chi co tren trinh duyet) */
	daNap = $state(false);

	/**
	 * Doc localStorage. Goi trong onMount: trang duoc dung san (prerender) voi tien
	 * do rong, doc sau khi hydrate thi HTML luc dau va luc hydrate khop nhau.
	 */
	nap() {
		if (this.daNap || typeof localStorage === 'undefined') return;
		this.daNap = true;
		try {
			const d = JSON.parse(localStorage.getItem(KHOA) ?? 'null') as DuLieu | null;
			if (d?.tu) this.tu = d.tu;
			if (d?.ngay) this.ngay = d.ngay;
		} catch {
			/* du lieu hong hoac bi chan: bat dau moi */
		}
	}

	private luu() {
		try {
			localStorage.setItem(KHOA, JSON.stringify({ tu: this.tu, ngay: this.ngay }));
		} catch {
			/* che do an danh / het cho: bo qua, chi mat tien do */
		}
	}

	private demNgay(bayGio: number) {
		const k = ngayKhoa(bayGio);
		this.ngay = { ...this.ngay, [k]: (this.ngay[k] ?? 0) + 1 };
	}

	/** Ghi mot lan ky tu i. hopGoc: hop cua tu luc mo tu (xem capNhatBanGhi). */
	ghi(i: number, dung: boolean, { bayGio = Date.now(), hopGoc }: { bayGio?: number; hopGoc?: number } = {}) {
		this.nap();
		this.tu = { ...this.tu, [i]: capNhatBanGhi(this.tu[i], dung, bayGio, hopGoc ?? this.tu[i]?.hop ?? 0) };
		this.demNgay(bayGio);
		this.luu();
	}

	/** Chi danh dau hom nay co hoc (vi du: choi do vui xem video) — giu chuoi ngay. */
	ghiNgay(bayGio = Date.now()) {
		this.nap();
		this.demNgay(bayGio);
		this.luu();
	}

	hop(i: number) {
		return this.tu[i]?.hop ?? 0;
	}

	daThuoc(i: number) {
		return this.hop(i) >= HOP_THUOC;
	}

	denHan(i: number, bayGio = Date.now()) {
		const b = this.tu[i];
		return !!b && b.hanOn <= bayGio;
	}

	get soDaThuoc() {
		return Object.values(this.tu).filter((b) => b.hop >= HOP_THUOC).length;
	}
	get soDaTap() {
		return Object.keys(this.tu).length;
	}
	get tongLuot() {
		return Object.values(this.tu).reduce((s, b) => s + b.luot, 0);
	}
	get tiLeDung() {
		const l = this.tongLuot;
		return l ? Object.values(this.tu).reduce((s, b) => s + b.dung, 0) / l : 0;
	}
	get chuoiNgay() {
		return tinhChuoiNgay(this.ngay, Date.now());
	}

	/** Tu den han on, tu qua han lau nhat den moi nhat. */
	canOn(bayGio = Date.now()): number[] {
		return Object.entries(this.tu)
			.filter(([, b]) => b.hanOn <= bayGio)
			.sort((a, b) => a[1].hanOn - b[1].hanOn)
			.map(([i]) => Number(i));
	}

	xoaHet() {
		this.tu = {};
		this.ngay = {};
		this.luu();
	}
}

export const tienDo = new TienDo();
