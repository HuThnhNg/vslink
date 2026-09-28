// Tu xac suat cua mo hinh -> nhung DU KIEN do duoc ve mot lan ky. Meo (LLM) chi
// dien giai cac du kien nay, khong tu cham dung / sai.
//
// "Bo phan nao lech", "giai doan nao lech" duoc do bang phan tich CHE BOT
// (occlusion sensitivity — Zeiler & Fergus, ECCV 2014): bo mot phan dau vao roi
// xem xac suat cua tu muc tieu thay doi the nao.
//   - Bo phan ay di ma mo hinh LAI NGHIENG VE tu muc tieu hon  -> phan ay dang lech.
//   - Bo di ma xac suat tut manh                                -> phan ay khop mau.
// Tat ca chay trong MOT lan goi mo hinh (batch 7), khong can du lieu mau rieng.
import { DANH_GIA, SO_DIEM, SO_KHUNG, SO_LOP } from './hang-so';
import { coVung, VUNG, type Khung } from './diem';
import { dongGoi } from './lay-mau';

export type MucDo = 'dung' | 'gan-dung' | 'chua-dung';
export type DanhGiaPhan = 'khop' | 'on' | 'hoi-lech' | 'lech-nhieu' | 'khong-thay';
export type GiaiDoan = 'dau' | 'giua' | 'cuoi';

export const PHAN = ['tayTrai', 'tayPhai', 'canhTay'] as const;
export type Phan = (typeof PHAN)[number];
export const GIAI_DOAN: GiaiDoan[] = ['dau', 'giua', 'cuoi'];

/** Thu tu cac bien the trong batch che bot. */
export const BIEN_THE = ['goc', 'boTayTrai', 'boTayPhai', 'boCanhTay', 'dungDau', 'dungGiua', 'dungCuoi'] as const;

export type DuDoan = { i: number; tu: string; p: number };

export function topK(p: Float32Array | number[], nhan: string[], k = 5, lech = 0): DuDoan[] {
	const chiSo = Array.from({ length: SO_LOP }, (_, i) => i);
	chiSo.sort((a, b) => p[lech + b] - p[lech + a]);
	return chiSo.slice(0, k).map((i) => ({ i, tu: nhan[i] ?? `#${i}`, p: p[lech + i] }));
}

/** Hang cua lop i (1 = cao nhat). */
export function xepHang(p: Float32Array | number[], i: number, lech = 0): number {
	const pi = p[lech + i];
	let hang = 1;
	for (let j = 0; j < SO_LOP; j++) if (j !== i && p[lech + j] > pi) hang++;
	return hang;
}

export function mucDoTuHang(hang: number): MucDo {
	if (hang <= DANH_GIA.hangDung) return 'dung';
	if (hang <= DANH_GIA.hangGanDung) return 'gan-dung';
	return 'chua-dung';
}

function xoaDiem(x: Float32Array, a: number, b: number) {
	for (let t = 0; t < SO_KHUNG; t++) x.fill(0, (t * SO_DIEM + a) * 2, (t * SO_DIEM + b) * 2);
}

/** Dung yen mot giai doan: moi khung trong doan lay bang khung ngay truoc no. */
function dungYen(x: Float32Array, k: number) {
	const n = SO_KHUNG / 3;
	const a = k * n;
	const b = (k + 1) * n;
	const nguon = k === 0 ? b : a - 1;
	const khung = x.slice(nguon * SO_DIEM * 2, (nguon + 1) * SO_DIEM * 2);
	for (let t = a; t < b; t++) x.set(khung, t * SO_DIEM * 2);
}

/** Batch [7, 60, 75, 2]: ban goc + 3 ban bo bo phan + 3 ban dung yen tung giai doan. */
export function taoBatchCheBot(khung: Khung[]): Float32Array {
	const goc = dongGoi(khung);
	const moi = goc.length;
	const ra = new Float32Array(BIEN_THE.length * moi);
	BIEN_THE.forEach((ten, b) => {
		const x = goc.slice();
		if (ten === 'boTayTrai') xoaDiem(x, ...VUNG.tayTrai);
		else if (ten === 'boTayPhai') xoaDiem(x, ...VUNG.tayPhai);
		else if (ten === 'boCanhTay') xoaDiem(x, ...VUNG.canhTay);
		else if (ten === 'dungDau') dungYen(x, 0);
		else if (ten === 'dungGiua') dungYen(x, 1);
		else if (ten === 'dungCuoi') dungYen(x, 2);
		ra.set(x, b * moi);
	});
	return ra;
}

export type ChatLuong = {
	soKhung: number;
	thoiLuong: number;
	fps: number;
	tiLeTayTrai: number;
	tiLeTayPhai: number;
	tiLeNguoi: number;
};

export function doChatLuong(khung: Khung[], thoiLuong: number): ChatLuong {
	const n = Math.max(khung.length, 1);
	const dem = (f: (k: Khung) => boolean) => khung.filter(f).length / n;
	return {
		soKhung: khung.length,
		thoiLuong,
		fps: thoiLuong > 0 ? (khung.length - 1) / thoiLuong : 0,
		tiLeTayTrai: dem((k) => coVung(k, VUNG.tayTrai)),
		tiLeTayPhai: dem((k) => coVung(k, VUNG.tayPhai)),
		tiLeNguoi: dem((k) => k[22] !== 0 || k[23] !== 0) // vai trai (diem 11)
	};
}

function xepLoai(logTi: number, pMoi: number): DanhGiaPhan {
	if (logTi >= DANH_GIA.lechNhieu && pMoi >= DANH_GIA.xacSuatToiThieu) return 'lech-nhieu';
	if (logTi >= DANH_GIA.hoiLech && pMoi >= DANH_GIA.xacSuatToiThieu) return 'hoi-lech';
	if (logTi <= DANH_GIA.hopMau) return 'khop';
	return 'on';
}

/** Du kien gui cho Meo — du nho gon de LLM khong phai doan. */
export type DuKien = {
	tuMucTieu: string;
	mucDo: MucDo;
	xepHang: number;
	xacSuat: number;
	tuDoan: string;
	xacSuatTuDoan: number;
	top5: { tu: string; p: number }[];
	boPhan: Record<Phan, DanhGiaPhan>;
	giaiDoanLechNhat: GiaiDoan | null;
	chatLuong: ChatLuong;
};

/**
 * probs: dau ra cua mo hinh cho batch taoBatchCheBot (7 x 400).
 * iMucTieu: chi so tu dang tap.
 */
export function danhGia(
	probs: Float32Array,
	iMucTieu: number,
	nhan: string[],
	chatLuong: ChatLuong
): DuKien {
	const p0 = probs.subarray(0, SO_LOP);
	const hang = xepHang(p0, iMucTieu);
	const top = topK(p0, nhan, 5);
	const pGoc = Math.max(p0[iMucTieu], 1e-9);
	const logTi = (b: number) => Math.log(Math.max(probs[b * SO_LOP + iMucTieu], 1e-9)) - Math.log(pGoc);

	const boPhan = {} as Record<Phan, DanhGiaPhan>;
	PHAN.forEach((ten, j) => {
		const b = 1 + j;
		boPhan[ten] = xepLoai(logTi(b), probs[b * SO_LOP + iMucTieu]);
	});
	if (chatLuong.tiLeTayTrai < 1 - DANH_GIA.tayVangNhieu && boPhan.tayTrai !== 'khop') boPhan.tayTrai = 'khong-thay';
	if (chatLuong.tiLeTayPhai < 1 - DANH_GIA.tayVangNhieu && boPhan.tayPhai !== 'khop') boPhan.tayPhai = 'khong-thay';

	// Giai doan lech nhat: dung yen giai doan nao ma mo hinh nghieng ve tu muc tieu nhieu nhat
	let giaiDoan: GiaiDoan | null = null;
	let tot = DANH_GIA.hoiLech;
	GIAI_DOAN.forEach((g, k) => {
		const b = 4 + k;
		const l = logTi(b);
		if (l > tot && probs[b * SO_LOP + iMucTieu] >= DANH_GIA.xacSuatToiThieu) {
			tot = l;
			giaiDoan = g;
		}
	});

	return {
		tuMucTieu: nhan[iMucTieu],
		mucDo: mucDoTuHang(hang),
		xepHang: hang,
		xacSuat: p0[iMucTieu],
		tuDoan: top[0].tu,
		xacSuatTuDoan: top[0].p,
		top5: top.map(({ tu, p }) => ({ tu, p })),
		boPhan,
		giaiDoanLechNhat: hang === 1 ? null : giaiDoan,
		chatLuong
	};
}
