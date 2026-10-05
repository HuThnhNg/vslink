// Tu ket qua cham + lua chon tay cua nhom -> tep static/du-lieu/video-mau.json.
import type { MucVideo, TepVideoMau, TrangThaiVideo, VideoMau } from '$lib/loi/video-mau';
import type { KetQuaCham } from './cham-video';
import type { UngVien } from './khop-tu';

export type LuaChon = Record<number, string>; // i -> ma chon tay | 'khong'
export type BangDiem = Record<string, KetQuaCham>; // `${i}:${ma}` -> ket qua

export const khoaDiem = (i: number, ma: string) => `${i}:${ma}`;

export function diemCua(diem: BangDiem, i: number, ma: string): { p: number; hang: number; doan: string } | null {
	const d = diem[khoaDiem(i, ma)];
	return d && 'p' in d ? d : null;
}

/** Xep ung vien: da cham theo xac suat giam dan, roi den chua cham / loi. */
export function xepUngVien(i: number, uv: UngVien[], diem: BangDiem): UngVien[] {
	return [...uv].sort((a, b) => (diemCua(diem, i, b.ma)?.p ?? -1) - (diemCua(diem, i, a.ma)?.p ?? -1));
}

/** Chuan "Khop tot": mo hinh xep dung tu hang 1 va chac >= 50 %. */
export const datChuan = (d: { p: number; hang: number } | null) => !!d && d.hang === 1 && d.p >= 0.5;

export function trangThaiTu(i: number, uv: UngVien[], diem: BangDiem, chon: LuaChon): TrangThaiVideo | 'chua-co' | 'chua-cham' {
	if (chon[i] === 'khong') return 'khong';
	if (chon[i]) return 'tay';
	if (!uv.length) return 'chua-co';
	const tot = xepUngVien(i, uv, diem)[0];
	const d = diemCua(diem, i, tot.ma);
	if (!d) return 'chua-cham';
	if (datChuan(d)) return 'tot';
	if (d.hang <= 5) return 'kha';
	return 'nghi';
}

function sangVideo(i: number, u: UngVien, diem: BangDiem): VideoMau {
	const d = diemCua(diem, i, u.ma);
	const v: VideoMau = { url: u.url, nguon: u.cach === 'cu' ? 'cu' : 'qipedc', mien: u.mien };
	if (u.cach !== 'cu') v.ma = u.ma;
	if (d) {
		v.p = Math.round(d.p * 1000) / 1000;
		v.hang = d.hang;
	}
	return v;
}

/** chiTot: chi dua len web cac tu "Khop tot"; moi tu khac de trong (trang_thai 'cho') cho nhom xem lai. */
export function taoTepVideoMau(
	ungVien: UngVien[][],
	diem: BangDiem,
	chon: LuaChon,
	ngay = new Date(),
	{ chiTot = false } = {}
): TepVideoMau {
	const tu: Record<string, MucVideo> = {};
	ungVien.forEach((uv, i) => {
		const tt = trangThaiTu(i, uv, diem, chon);
		if (chiTot && tt !== 'tot') {
			tu[i] = { trang_thai: 'cho' };
			return;
		}
		if (tt === 'khong') {
			tu[i] = { trang_thai: 'khong' };
			return;
		}
		if (tt === 'chua-co' || tt === 'chua-cham') return;
		const xep = xepUngVien(i, uv, diem);
		const chinh = tt === 'tay' ? (uv.find((u) => u.ma === chon[i]) ?? xep[0]) : xep[0];
		// Cach ky khac (mien khac) chi dua len khi CHINH NO cung dat chuan "Khop tot" — video
		// chua kiem chung (vd "Anh (nuoc Anh)" khop nham ten) tuyet doi khong hien cho nguoi hoc.
		const khac = xep.filter((u) => u.ma !== chinh.ma && u.cach !== 'cu' && datChuan(diemCua(diem, i, u.ma))).slice(0, 4);
		tu[i] = { trang_thai: tt, chinh: sangVideo(i, chinh, diem), khac: khac.map((u) => sangVideo(i, u, diem)) };
	});
	return { phien_ban: 1, ngay: ngay.toISOString().slice(0, 10), tu };
}
