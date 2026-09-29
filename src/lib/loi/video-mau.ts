// Video mau cua tung tu. Nguon: static/du-lieu/video-mau.json — tao bang trang
// /cong-cu/video-mau/ (khop ten voi tu dien QIPEDC, cho mo hinh cham xem bien the
// Bac / Trung / Nam nao giong cach ky trong VSL400 nhat, nhom duyet lai).
// Nap luc chay (khong nhung vao ma) de thay video khong can dung lai ca web.
import { DUONG_DAN } from './duong-dan';
import type { Tu } from './tu-vung';

export type Mien = 'bac' | 'trung' | 'nam';
export type VideoMau = {
	url: string;
	ma?: string;
	mien?: Mien | null;
	/** xac suat mo hinh nhan ra dung tu nay khi xem video (0..1) */
	p?: number;
	hang?: number;
	nguon?: 'qipedc' | 'cu';
};
/** tot: hang 1 va >= 50 %; kha: hang 1–5; nghi: moi bien the deu bi cham thap; tay: nhom chon tay;
 *  cho: nhom tam de trong de xem lai (web khong hien video nao, ke ca link cu) */
export type TrangThaiVideo = 'tot' | 'kha' | 'nghi' | 'tay' | 'khong' | 'cho';
export type MucVideo = { trang_thai: TrangThaiVideo; chinh?: VideoMau; khac?: VideoMau[] };
export type TepVideoMau = { phien_ban: number; ngay?: string; tu: Record<string, MucVideo> };

export const TEN_MIEN: Record<Mien, string> = { bac: 'miền Bắc', trung: 'miền Trung', nam: 'miền Nam' };

/** Ma QIPEDC: D0001B / D0001N / D0001T = mien Bac / Nam / Trung; khong duoi = mot cach ky. */
export function mienTuMa(ma: string): Mien | null {
	const d = /([BNT])$/.exec(ma.trim())?.[1];
	return d === 'B' ? 'bac' : d === 'N' ? 'nam' : d === 'T' ? 'trung' : null;
}

const RONG: TepVideoMau = { phien_ban: 0, tu: {} };
let hua: Promise<TepVideoMau> | null = null;
export function napVideoMau(): Promise<TepVideoMau> {
	hua ??= fetch(DUONG_DAN.videoMau, { cache: 'no-cache' })
		.then((r) => (r.ok ? r.json() : RONG))
		.then((j: TepVideoMau) => (j && typeof j.tu === 'object' ? j : RONG))
		.catch(() => RONG);
	return hua;
}

export type VideoCuaTu = {
	/** ds[0] = video chinh (cach Meo cham), sau do la cac cach ky khac */
	ds: VideoMau[];
	/** video da duoc cham / duyet la khop cach ky Meo cham */
	daDuyet: boolean;
	canhBao: string | null;
};

/** Video nen hien cho mot tu. Link cu sai phan lon -> chi giu link cu cua nhom (workers.dev). */
export function videoCua(tep: TepVideoMau, tu: Tu): VideoCuaTu {
	const muc = tep.tu[String(tu.i)];
	if (muc) {
		if (muc.trang_thai === 'khong' || !muc.chinh) return { ds: [], daDuyet: false, canhBao: null };
		const ds = [muc.chinh, ...(muc.khac ?? [])];
		if (muc.trang_thai === 'nghi')
			return { ds, daDuyet: false, canhBao: 'Cách ký trong video có thể khác cách Mèo chấm — nhóm chưa duyệt từ này.' };
		return { ds, daDuyet: true, canhBao: null };
	}
	if (/workers\.dev\//.test(tu.video))
		return { ds: [{ url: tu.video, nguon: 'cu' }], daDuyet: false, canhBao: 'Video cũ, chưa được duyệt lại.' };
	return { ds: [], daDuyet: false, canhBao: null };
}

export function nhanVideo(v: VideoMau, thuTu: number): string {
	const mien = v.mien ? TEN_MIEN[v.mien] : null;
	if (thuTu === 0) return mien ? `Mèo chấm theo cách này (${mien})` : 'Mèo chấm theo cách này';
	return mien ? `Cách ${mien}` : `Cách ký ${thuTu + 1}`;
}
