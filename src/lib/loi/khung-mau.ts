// Khung xuong mau cho tu CHUA CO video mau: mot lan ky THAT trong bo VSL400 (goc chinh
// dien) — lan ky tieu bieu nhat trong so cac lan ma chinh mo hinh cua web nhan dung —
// ve lai bang khung xuong. Khong phai trung binh nhieu nguoi (trung binh lam mo dang ban
// tay va thu nho chuyen dong). Tao bang nghien-cuu/khung-mau/xuat_khung_mau_kaggle.py ->
// static/du-lieu/khung-mau/{chi-muc.json, 000.bin ... 399.bin}.
// Moi .bin: so_khung x 75 diem x (x, y) int16 little-endian, toa do x ti_le trong khung
// vuong; (0, 0) = khong bat duoc diem do. Web CHI dung tu co "kiem_chung": true.
import { DUONG_DAN } from './duong-dan';
import type { DiemMP, KetQuaHolistic } from './diem';

export type MucKhungMau = {
	kiem_chung: boolean;
	/** thoi luong lan ky goc (giay) — de phat dung nhip */
	giay: number;
	p?: number;
	hang?: number;
	so_mau?: number;
	so_dung?: number;
	p_hien_thi?: number;
};
export type ChiMucKhungMau = {
	phien_ban: number;
	so_khung: number;
	so_diem: number;
	ti_le: number;
	tu: Record<string, MucKhungMau>;
};
export type KhungMau = {
	soKhung: number;
	soDiem: number;
	/** soKhung * soDiem * 2 toa do trong khung vuong 0..1 */
	xy: Float32Array;
	/** soKhung * soDiem: 1 = bat duoc diem */
	co: Uint8Array;
	giay: number;
	muc: MucKhungMau;
};

const SO_DIEM = 75;
const TAY_TRAI = 33;
const TAY_PHAI = 54;

let chiMucHua: Promise<ChiMucKhungMau | null> | null = null;

export function napChiMucKhung(): Promise<ChiMucKhungMau | null> {
	chiMucHua ??= fetch(`${DUONG_DAN.khungMau}/chi-muc.json`, { cache: 'no-cache' })
		.then((r) => (r.ok ? r.json() : null))
		.then((j: ChiMucKhungMau | null) =>
			j && typeof j.tu === 'object' && j.so_khung > 1 && j.so_diem === SO_DIEM && j.ti_le > 0 ? j : null
		)
		.catch(() => null);
	return chiMucHua;
}

/** Bytes .bin -> toa do + co/khong; sai kich thuoc thi null. */
export function giaiMaKhung(
	buf: ArrayBuffer,
	soKhung: number,
	soDiem: number,
	tiLe: number
): { xy: Float32Array; co: Uint8Array } | null {
	const n = soKhung * soDiem;
	if (buf.byteLength !== n * 4) return null;
	const v = new DataView(buf);
	const xy = new Float32Array(n * 2);
	const co = new Uint8Array(n);
	for (let k = 0; k < n; k++) {
		const x = v.getInt16(k * 4, true);
		const y = v.getInt16(k * 4 + 2, true);
		xy[2 * k] = x / tiLe;
		xy[2 * k + 1] = y / tiLe;
		co[k] = x !== 0 || y !== 0 ? 1 : 0;
	}
	return { xy, co };
}

const daNap = new Map<number, Promise<KhungMau | null>>();

/** Khung xuong mau DA KIEM CHUNG cua tu i, hoac null (chua co / chua dat / loi mang). */
export function napKhungMau(i: number): Promise<KhungMau | null> {
	let h = daNap.get(i);
	if (!h) {
		h = napChiMucKhung()
			.then(async (cm) => {
				const muc = cm?.tu[String(i)];
				if (!cm || !muc?.kiem_chung) return null;
				const r = await fetch(`${DUONG_DAN.khungMau}/${String(i).padStart(3, '0')}.bin`);
				if (!r.ok) return null;
				const g = giaiMaKhung(await r.arrayBuffer(), cm.so_khung, cm.so_diem, cm.ti_le);
				if (!g) return null;
				const giay = muc.giay > 0.3 && muc.giay < 20 ? muc.giay : 2;
				return { soKhung: cm.so_khung, soDiem: cm.so_diem, ...g, giay, muc };
			})
			.catch(() => null);
		daNap.set(i, h);
	}
	return h;
}

/**
 * Tu the o vi tri u (0..1) cua lan ky: noi suy tuyen tinh giua hai khung gan nhat.
 * Diem chi co o mot trong hai khung: dung khung GAN hon neu khung do co, khong thi bo.
 * Ban tay di ca cum (MediaPipe bat ca ban tay hoac khong).
 */
export function tuTheTai(k: KhungMau, u: number): KetQuaHolistic {
	const f = Math.min(Math.max(u, 0), 1) * (k.soKhung - 1);
	const a = Math.floor(f);
	const b = Math.min(a + 1, k.soKhung - 1);
	const t = f - a;
	const { xy, co, soDiem } = k;
	const lay = (khung: number, j: number): DiemMP => {
		const q = khung * soDiem + j;
		return { x: xy[2 * q], y: xy[2 * q + 1], visibility: 1 };
	};
	const coTai = (khung: number, j: number) => co[khung * soDiem + j] === 1;
	const chon = (j: number): 'ca' | 'a' | 'b' | null => {
		const ca = coTai(a, j);
		const cb = coTai(b, j);
		if (ca && cb) return 'ca';
		if (t < 0.5) return ca ? 'a' : null;
		return cb ? 'b' : null;
	};
	const diem = (j: number, cach: 'ca' | 'a' | 'b'): DiemMP => {
		if (cach === 'a') return lay(a, j);
		if (cach === 'b') return lay(b, j);
		const p = lay(a, j);
		const q = lay(b, j);
		return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, visibility: 1 };
	};
	const pose: DiemMP[] = [];
	for (let j = 0; j < 33; j++) {
		const c = chon(j);
		pose.push(c ? diem(j, c) : { x: 0, y: 0, visibility: 0 });
	}
	const tay = (dau: number): DiemMP[][] => {
		const c = chon(dau); // co tay (diem 0) dai dien cho ca ban tay
		if (!c) return [];
		const ra: DiemMP[] = [];
		for (let j = dau; j < dau + 21; j++) {
			const cj = c === 'ca' && !(coTai(a, j) && coTai(b, j)) ? (t < 0.5 ? 'a' : 'b') : c;
			ra.push(diem(j, cj));
		}
		return [ra];
	};
	return { poseLandmarks: [pose], leftHandLandmarks: tay(TAY_TRAI), rightHandLandmarks: tay(TAY_PHAI) };
}
