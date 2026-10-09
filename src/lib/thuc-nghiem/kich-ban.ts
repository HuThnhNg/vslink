// Thuc nghiem nguoi dung (PIISE 2026) — phan thuan, dung duoc trong unit test.
// Ma nguoi tham gia -> phan (online / offline) -> nhom G1–G4 -> danh sach buoc co dinh.
// Moi nguoi cung mot bo cau hoi, cung thu tu cau (xao bang hat giong co dinh), de ket qua
// chi khac nhau o dieu kien hoc (co / khong phan hoi), khong khac o de bai.
import { TU_VUNG, type Tu } from '$lib/loi/tu-vung';
import type { MucDo } from '$lib/loi/danh-gia';

export const PHIEN_BAN_THUC_NGHIEM = 'tn-2026-10-09';

/**
 * TU TAM CHON — nhom chot lai truoc khi chay that. Chi dung tu da co video mau DA DUYET
 * (static/du-lieu/video-mau.json, trang_thai "tot"), vi bai nhan dien can video that.
 * MẸ va ĐỌC (thiet ke ban dau) chua co video duyet nen tam doi sang BỐ, XEM.
 */
export const CAU_HINH = {
	online: {
		hoc: ['Bố', 'Sách', 'Xem'],
		/** tu gay nhieu cho bai nhan dien 6 ky hieu (khong hoc) */
		nhieu: ['Ông nội', 'Giấy nháp', 'Nói chuyện'],
		giayHoc: 300
	},
	offline: {
		boA: ['Con mèo', 'Quả cam', 'Sữa', 'Rửa tay'],
		boB: ['Con chó', 'Quả chuối', 'Trà', 'Rửa mặt'],
		giayHocMoiBo: 300
	},
	soDapAn: 4,
	/** link Google Form online (co ?entry... de dien san ma): de trong thi chi bao "quay lai tab Form" */
	linkFormOnline: '',
	camNhan: [
		'Mình thấy thích khi học bộ từ này.',
		'Cách học vừa rồi giúp mình biết cần sửa chỗ nào.',
		'Mình tự tin sẽ ký đúng các từ vừa học.'
	]
} as const;

export type Phan = 'online' | 'offline';
export type Bo = 'A' | 'B' | 'online';
export type Nhom = 1 | 2 | 3 | 4;
export type NguoiThamGia = { ma: string; phan: Phan; so: number; nhom: Nhom | null };

/** "f7", "F07", " F007 " -> F07. Sai dang -> null. */
export function docMa(vao: string): NguoiThamGia | null {
	const m = /^([OF])0*(\d{1,3})$/.exec(vao.trim().toUpperCase());
	if (!m) return null;
	const so = Number(m[2]);
	if (so < 1) return null;
	const phan: Phan = m[1] === 'O' ? 'online' : 'offline';
	const ma = `${m[1]}${String(so).padStart(2, '0')}`;
	return { ma, phan, so, nhom: phan === 'offline' ? (((so - 1) % 4) + 1) as Nhom : null };
}

/** Thu tu bo + dieu kien cua tung nhom (doi trong): [bo hoc truoc, bo hoc sau]. */
export const THU_TU_NHOM: Record<Nhom, [{ bo: 'A' | 'B'; phanHoi: boolean }, { bo: 'A' | 'B'; phanHoi: boolean }]> = {
	1: [{ bo: 'A', phanHoi: true }, { bo: 'B', phanHoi: false }],
	2: [{ bo: 'A', phanHoi: false }, { bo: 'B', phanHoi: true }],
	3: [{ bo: 'B', phanHoi: true }, { bo: 'A', phanHoi: false }],
	4: [{ bo: 'B', phanHoi: false }, { bo: 'A', phanHoi: true }]
};

/** Bo sinh so gia ngau nhien co hat giong (mulberry32): cung hat -> cung day so. */
export function hatGiong(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function xao<T>(ds: readonly T[], r: () => number): T[] {
	const a = ds.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

/** Ten tu -> muc tu vung. Sai ten la loi cau hinh: bao ngay, khong im lang bo qua. */
export function tuTheoTen(ten: string, tuVung: Tu[] = TU_VUNG.tu): Tu {
	const t = tuVung.find((x) => x.tu === ten);
	if (!t) throw new Error(`[thuc-nghiem] Không có từ “${ten}” trong 400 từ`);
	return t;
}

export type CauNhanDien = { tu: Tu; dapAn: Tu[] };

/**
 * Bai nhan dien: moi tu mot video, chon nghia trong soDapAn dap an. Dap an nhieu lay tu
 * chinh cac tu trong bai (khong phai tu la), nen nguoi hoc phai phan biet cac tu vua hoc.
 * Hat giong co dinh theo ten bai -> moi nguoi cung de, cung thu tu.
 */
export function taoBaiNhanDien(ds: Tu[], seed: number, soDapAn: number = CAU_HINH.soDapAn): CauNhanDien[] {
	const r = hatGiong(seed);
	return xao(ds, r).map((tu) => {
		const khac = xao(
			ds.filter((x) => x.i !== tu.i),
			r
		).slice(0, soDapAn - 1);
		return { tu, dapAn: xao([tu, ...khac], r) };
	});
}

export type Buoc =
	| { loai: 'dong-y'; ten: 'dong-y' }
	| { loai: 'huong-dan'; ten: 'huong-dan' }
	| { loai: 'nhan-dien'; ten: 'truoc-hoc' | 'sau-hoc'; cau: CauNhanDien[] }
	| { loai: 'hoc'; ten: 'hoc' | 'hoc-1' | 'hoc-2'; bo: Bo; tu: Tu[]; phanHoi: boolean; giay: number }
	| { loai: 'cam-nhan'; ten: 'cam-nhan-1' | 'cam-nhan-2'; bo: Bo; phanHoi: boolean }
	| { loai: 'ky-lai'; ten: 'ky-lai'; tu: Tu[] }
	| { loai: 'xong'; ten: 'xong' };

const HAT = { truoc: 101, sau: 202, kyLai: 303 };

/** Toan bo buoc cua mot nguoi, theo dung thu tu trong phieu thiet ke. */
export function taoKichBan(n: NguoiThamGia, tuVung: Tu[] = TU_VUNG.tu): Buoc[] {
	const ten = (ds: readonly string[]) => ds.map((x) => tuTheoTen(x, tuVung));
	if (n.phan === 'online') {
		const hoc = ten(CAU_HINH.online.hoc);
		const sau = [...hoc, ...ten(CAU_HINH.online.nhieu)];
		return [
			{ loai: 'huong-dan', ten: 'huong-dan' },
			{ loai: 'nhan-dien', ten: 'truoc-hoc', cau: taoBaiNhanDien(sau, HAT.truoc) },
			{ loai: 'hoc', ten: 'hoc', bo: 'online', tu: hoc, phanHoi: true, giay: CAU_HINH.online.giayHoc },
			{ loai: 'ky-lai', ten: 'ky-lai', tu: xao(hoc, hatGiong(HAT.kyLai)) },
			{ loai: 'nhan-dien', ten: 'sau-hoc', cau: taoBaiNhanDien(sau, HAT.sau) },
			{ loai: 'xong', ten: 'xong' }
		];
	}
	const bo = { A: ten(CAU_HINH.offline.boA), B: ten(CAU_HINH.offline.boB) };
	const tatCa = [...bo.A, ...bo.B];
	const [mot, hai] = THU_TU_NHOM[n.nhom ?? 1];
	const giay = CAU_HINH.offline.giayHocMoiBo;
	return [
		{ loai: 'dong-y', ten: 'dong-y' },
		{ loai: 'huong-dan', ten: 'huong-dan' },
		{ loai: 'nhan-dien', ten: 'truoc-hoc', cau: taoBaiNhanDien(tatCa, HAT.truoc) },
		{ loai: 'hoc', ten: 'hoc-1', bo: mot.bo, tu: bo[mot.bo], phanHoi: mot.phanHoi, giay },
		{ loai: 'cam-nhan', ten: 'cam-nhan-1', bo: mot.bo, phanHoi: mot.phanHoi },
		{ loai: 'hoc', ten: 'hoc-2', bo: hai.bo, tu: bo[hai.bo], phanHoi: hai.phanHoi, giay },
		{ loai: 'cam-nhan', ten: 'cam-nhan-2', bo: hai.bo, phanHoi: hai.phanHoi },
		{ loai: 'nhan-dien', ten: 'sau-hoc', cau: taoBaiNhanDien(tatCa, HAT.sau) },
		{ loai: 'ky-lai', ten: 'ky-lai', tu: xao(tatCa, hatGiong(HAT.kyLai)) },
		{ loai: 'xong', ten: 'xong' }
	];
}

/** Bo cua mot tu trong phan offline (de ghi kem moi dong, phan tich theo bo khong can tra cuu). */
export function boCuaTu(tu: string): Bo | null {
	if ((CAU_HINH.offline.boA as readonly string[]).includes(tu)) return 'A';
	if ((CAU_HINH.offline.boB as readonly string[]).includes(tu)) return 'B';
	return null;
}

/** Mot lan ky da cham (trong luc hoc hoac ky lai). */
export type LanKy = { tu: Tu; hang: number; mucDo: MucDo; top5: string[]; lan: number; ms: number };
