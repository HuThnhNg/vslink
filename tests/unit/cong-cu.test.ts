import { describe, expect, it } from 'vitest';
import { boNgoac, khoaTu, khopTu, taoChiMuc, urlVideo, type MucQipedc } from '../../src/lib/cong-cu/khop-tu';
import type { Tu } from '../../src/lib/loi/tu-vung';

const tu = (i: number, t: string, video = 'https://qipedc.moet.gov.vn/videos/D9999.mp4'): Tu => ({ i, tu: t, chu_de: 'x', video });
const Q: MucQipedc[] = [
	{ ma: 'D0001B', tu: 'địa chỉ' },
	{ ma: 'D0001N', tu: 'địa chỉ' },
	{ ma: 'D0001T', tu: 'địa chỉ' },
	{ ma: 'D0015', tu: 'Tuy Hoà' },
	{ ma: 'D0100', tu: 'cao', giai_nghia: 'Có chiều cao lớn hơn mức bình thường (người)' },
	{ ma: 'D0101', tu: 'cao', giai_nghia: 'Khoảng cách từ đáy lên đỉnh của đồ vật' },
	{ ma: 'D0200B', tu: 'mèo' },
	{ ma: 'D0200N', tu: 'mèo' },
	{ ma: 'D0300', tu: 'Miến Điện (nước Mi-an-ma)' }
];
const cm = taoChiMuc(Q);
const MAU = '/videos/{ma}.mp4';

describe('khop ten tu voi QIPEDC', () => {
	it('khoa so sanh: hoa thuong, khoang trang, kieu bo dau cu/moi', () => {
		expect(khoaTu('  Tuy   Hoà ')).toBe(khoaTu('tuy hòa'));
		expect(khoaTu('Khoẻ')).toBe(khoaTu('Khỏe'));
		expect(boNgoac('Cao (người)')).toBe('Cao');
	});
	it('trung ten -> moi bien the Bac / Nam / Trung, dung mien, dung link', () => {
		const u = khopTu(tu(1, 'Địa chỉ'), cm, MAU);
		expect(u.map((x) => [x.ma, x.mien, x.cach])).toEqual([
			['D0001B', 'bac', 'khop'],
			['D0001N', 'nam', 'khop'],
			['D0001T', 'trung', 'khop']
		]);
		expect(u[0].url).toBe('https://qipedc.moet.gov.vn/videos/D0001B.mp4');
		expect(khopTu(tu(2, 'Tuy Hòa'), cm, MAU)[0].ma).toBe('D0015');
	});
	it('bo ngoac: "Cao (người)" lay ca hai "cao", muc noi ve nguoi dung truoc', () => {
		const u = khopTu(tu(3, 'Cao (người)'), cm, MAU);
		expect(u.map((x) => x.ma)).toEqual(['D0100', 'D0101']);
		expect(u[0].cach).toBe('bo-ngoac');
		expect(khopTu(tu(4, 'Miến Điện'), cm, MAU)[0].ma).toBe('D0300');
	});
	it('bo tien to "con": "Con mèo" ~ "mèo"; khong tim thay -> rong; giu link cu cua nhom', () => {
		expect(khopTu(tu(5, 'Con mèo'), cm, MAU).map((x) => [x.ma, x.cach])).toEqual([
			['D0200B', 'bo-tien-to'],
			['D0200N', 'bo-tien-to']
		]);
		expect(khopTu(tu(6, 'Bánh xèo'), cm, MAU)).toEqual([]);
		const cu = khopTu(tu(7, 'Bánh xèo', 'https://x.workers.dev/banh-xeo.mp4'), cm, MAU);
		expect(cu).toHaveLength(1);
		expect(cu[0]).toMatchObject({ ma: 'cu:7', cach: 'cu' });
	});
	it('mau link tu trang QIPEDC (duong dan tuong doi hoac day du)', () => {
		expect(urlVideo('https://qipedc.moet.gov.vn/videos/{ma}.mp4', 'D0002')).toBe('https://qipedc.moet.gov.vn/videos/D0002.mp4');
		expect(urlVideo('/videos/{ma}.mp4', 'D0002')).toBe('https://qipedc.moet.gov.vn/videos/D0002.mp4');
	});
});

import { taoTepVideoMau, trangThaiTu, khoaDiem, type BangDiem } from '../../src/lib/cong-cu/xuat';
import { videoCua } from '../../src/lib/loi/video-mau';

describe('xuat video-mau.json va doc lai tren web', () => {
	const uv = [
		khopTu(tu(0, 'Địa chỉ'), cm, MAU), // 3 mien
		khopTu(tu(1, 'Tuy Hòa'), cm, MAU), // 1 cach, bi cham thap
		khopTu(tu(2, 'Bánh xèo'), cm, MAU), // khong co
		khopTu(tu(3, 'Con mèo'), cm, MAU) // nhom chon tay
	];
	const diem: BangDiem = {
		[khoaDiem(0, 'D0001B')]: { p: 0.1, hang: 4, doan: 'x' },
		[khoaDiem(0, 'D0001N')]: { p: 0.82, hang: 1, doan: 'Địa chỉ' },
		[khoaDiem(0, 'D0001T')]: { loi: 'Không thấy rõ người trong video' },
		[khoaDiem(1, 'D0015')]: { p: 0.01, hang: 40, doan: 'y' },
		[khoaDiem(3, 'D0200B')]: { p: 0.3, hang: 2, doan: 'z' },
		[khoaDiem(3, 'D0200N')]: { p: 0.2, hang: 3, doan: 'z' }
	};
	const chon = { 3: 'D0200N' };
	it('trang thai: tot / nghi / chua co / chon tay', () => {
		expect(trangThaiTu(0, uv[0], diem, chon)).toBe('tot');
		expect(trangThaiTu(1, uv[1], diem, chon)).toBe('nghi');
		expect(trangThaiTu(2, uv[2], diem, chon)).toBe('chua-co');
		expect(trangThaiTu(3, uv[3], diem, chon)).toBe('tay');
	});
	it('video chinh = bien the diem cao nhat (hoac chon tay); cac mien con lai la cach khac', () => {
		const tep = taoTepVideoMau(uv, diem, chon, new Date('2026-09-29'));
		expect(tep.tu['0'].chinh).toMatchObject({ ma: 'D0001N', mien: 'nam', p: 0.82, hang: 1 });
		expect(tep.tu['0'].khac!.map((v) => v.ma)).toEqual(['D0001B', 'D0001T']);
		expect(tep.tu['2']).toBeUndefined();
		expect(tep.tu['3'].chinh!.ma).toBe('D0200N');
		const tuWeb = { i: 0, tu: 'Địa chỉ', chu_de: 'x', video: '' };
		expect(videoCua(tep, tuWeb)).toMatchObject({ daDuyet: true, canhBao: null });
		expect(videoCua(tep, { ...tuWeb, i: 1 }).daDuyet).toBe(false); // nghi -> khong dung cho do vui
		expect(videoCua(tep, { ...tuWeb, i: 2, video: 'https://qipedc.moet.gov.vn/videos/D0015B.mp4' }).ds).toEqual([]);
	});
	it('chi dua len tu "Khop tot": tu khac thanh "cho", web de trong ca link cu', () => {
		const tep = taoTepVideoMau(uv, diem, chon, new Date('2026-09-29'), { chiTot: true });
		expect(tep.tu['0'].trang_thai).toBe('tot');
		expect(tep.tu['1']).toEqual({ trang_thai: 'cho' });
		expect(tep.tu['2']).toEqual({ trang_thai: 'cho' });
		expect(tep.tu['3']).toEqual({ trang_thai: 'cho' }); // chon tay cung tam de trong
		const cu = { i: 1, tu: 'x', chu_de: 'x', video: 'https://a.workers.dev/x.mp4' };
		expect(videoCua(tep, cu)).toEqual({ ds: [], daDuyet: false, canhBao: null });
	});
});

import { ghepThem, nhomQipedc, timQipedc } from '../../src/lib/cong-cu/khop-tu';

describe('tra tay trong QIPEDC khi ten khac', () => {
	const nhom = nhomQipedc([...Q, { ma: 'D0400', tu: 'xanh da trời', giai_nghia: 'Màu của bầu trời' }]);
	it('gom cac mien cua cung mot tu thanh mot nhom', () => {
		const dc = nhom.find((n) => n.tu === 'địa chỉ')!;
		expect(dc.ma).toEqual(['D0001B', 'D0001N', 'D0001T']);
		// hai "cao" khac ma -> hai nhom rieng
		expect(nhom.filter((n) => n.tu === 'cao')).toHaveLength(2);
	});
	it('tim khong dau: trung han truoc, roi bat dau bang, co chua, giai nghia', () => {
		expect(timQipedc(nhom, 'dia chi').map((n) => n.goc)).toEqual(['D0001|địa chỉ']);
		expect(timQipedc(nhom, 'XANH  da')[0].ma).toEqual(['D0400']);
		expect(timQipedc(nhom, 'bau troi')[0].ma).toEqual(['D0400']); // chi co trong giai nghia
		expect(timQipedc(nhom, 'meo').map((n) => n.tu)).toEqual(['mèo']);
		expect(timQipedc(nhom, '   ')).toEqual([]);
	});
	it('ghep video them tay: bo trung, bo ma la, danh dau "them"', () => {
		const theoMa = new Map(Q.map((x) => [x.ma, x]));
		const goc = khopTu(tu(8, 'Con mèo'), cm, MAU); // D0200B, D0200N
		const uv = ghepThem(goc, ['D0200N', 'D0015', 'KHONG_CO'], theoMa, MAU);
		expect(uv.map((u) => [u.ma, u.cach])).toEqual([
			['D0200B', 'bo-tien-to'],
			['D0200N', 'bo-tien-to'],
			['D0015', 'them']
		]);
		expect(uv[2]).toMatchObject({ tuQ: 'Tuy Hoà', url: 'https://qipedc.moet.gov.vn/videos/D0015.mp4', mien: null });
		expect(ghepThem(goc, undefined, theoMa, MAU)).toBe(goc);
	});
});
