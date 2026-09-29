import { describe, expect, it } from 'vitest';
import { capNhatBanGhi, HOP_CAO_NHAT, KHOANG_ON } from '../../src/lib/kho/tien-do.svelte';
import { goiYGhiHinh, phanTram, soGiay } from '../../src/lib/loi/dinh-dang';
import { boDau, NHAN, TEN_CHU_DE, TU_VUNG, tuTheoChuDe, xaoTron } from '../../src/lib/loi/tu-vung';
import type { ChatLuong } from '../../src/lib/loi/danh-gia';
import nhanGoc from '../../src/lib/du-lieu/nhan.json';

describe('hop Leitner theo buoi tap', () => {
	it('sai vai lan roi dung trong CUNG buoi: chi len dung 1 hop tinh tu hop luc mo tu', () => {
		let b = capNhatBanGhi(undefined, true, 0); // hop 1
		b = capNhatBanGhi(b, true, 0); // hop 2
		const hopGoc = b.hop;
		b = capNhatBanGhi(b, false, 0, hopGoc); // doan cat nham -> tam ve hop 1
		expect(b.hop).toBe(1);
		b = capNhatBanGhi(b, true, 0, hopGoc); // ky lai dung
		expect(b.hop).toBe(3);
		b = capNhatBanGhi(b, true, 0, hopGoc); // dung them lan nua trong buoi: khong len tiep
		expect(b.hop).toBe(3);
		expect(b.luot).toBe(5);
		expect(b.dung).toBe(4);
	});
	it('hop cao nhat bi chan tren; han on theo KHOANG_ON', () => {
		let b = capNhatBanGhi(undefined, true, 1000, HOP_CAO_NHAT);
		expect(b.hop).toBe(HOP_CAO_NHAT);
		expect(b.hanOn).toBe(1000 + KHOANG_ON[HOP_CAO_NHAT] * 86_400_000);
		b = capNhatBanGhi(b, false, 2000);
		expect(b.hanOn).toBe(2000 + KHOANG_ON[1] * 86_400_000);
	});
});

describe('dinh dang kieu Viet', () => {
	it('phan tram va giay', () => {
		expect(phanTram(0.8234)).toBe('82%');
		expect(phanTram(0.001)).toBe('<1%');
		expect(phanTram(0.9999)).toBe('>99%');
		expect(phanTram(Number.NaN)).toBe('–');
		expect(phanTram(0)).toBe('0%'); // 0 lan dung tren 1 luot: dung ghi "<1%"
		expect(phanTram(1)).toBe('100%');
		expect(soGiay(1.25)).toBe('1,3 giây');
	});
	it('nhac ghi hinh chi khi co van de ro rang', () => {
		const tot: ChatLuong = { soKhung: 40, thoiLuong: 1.6, fps: 25, tiLeTayTrai: 0, tiLeTayPhai: 1, tiLeNguoi: 1 };
		expect(goiYGhiHinh(tot)).toBeNull(); // ky mot tay: tay kia khong thay la binh thuong
		expect(goiYGhiHinh({ ...tot, tiLeTayPhai: 0.3 })).toContain('bàn tay');
		expect(goiYGhiHinh({ ...tot, tiLeNguoi: 0.4 })).toContain('mất dấu');
		expect(goiYGhiHinh({ ...tot, fps: 5 })).toContain('chậm');
	});
});

describe('tu vung', () => {
	it('400 tu dung thu tu nhan cua mo hinh, moi tu co chu de va video https', () => {
		expect(NHAN).toEqual(nhanGoc);
		expect(TU_VUNG.tu.every((t, i) => t.i === i && TEN_CHU_DE[t.chu_de] && t.video.startsWith('https://'))).toBe(true);
		expect(TU_VUNG.chu_de.reduce((s, c) => s + tuTheoChuDe(c.ma).length, 0)).toBe(400);
	});
	it('tim khong dau', () => {
		expect(boDau('Bánh xèo')).toBe('banh xeo');
		expect(boDau('Đồng hồ đeo tay')).toBe('dong ho deo tay');
		expect(NHAN.filter((t) => boDau(t).includes('cam on'))).toEqual(['Cảm ơn']);
	});
	it('xao tron giu nguyen phan tu', () => {
		const a = Array.from({ length: 50 }, (_, i) => i);
		let s = 7;
		const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
		const b = xaoTron(a, r);
		expect(b).not.toEqual(a);
		expect([...b].sort((x, y) => x - y)).toEqual(a);
	});
});

import { dongGoi as dg, noiSuy } from '../../src/lib/loi/lay-mau';

describe('noi suy theo thoi gian (ky truc tiep)', () => {
	const khung = (t: number, x: number, co = true) => {
		const kp = new Float32Array(150);
		if (co) for (let d = 0; d < 75; d++) (kp[d * 2] = x), (kp[d * 2 + 1] = 0.5);
		return { t, kp };
	};
	it('chuyen dong deu, camera giat (khoang cach khong deu) -> 60 moc van deu theo thoi gian', () => {
		const ts = [0, 0.05, 0.3, 0.32, 0.9, 1.0];
		const ra = noiSuy(ts.map((t) => khung(t, 0.2 + 0.5 * t)));
		for (let j = 0; j < 60; j++) expect(ra[j * 150]).toBeCloseTo(0.2 + (0.5 * j) / 59, 5);
	});
	it('diem mat o mot khung -> lay khung gan hon, khong noi suy voi (0,0)', () => {
		const ra = noiSuy([khung(0, 0.3), khung(1, 0, false), khung(2, 0.7)]);
		for (let j = 0; j < 60; j++) {
			const x = ra[j * 150];
			expect(x === 0 || Math.abs(x - 0.3) < 1e-6 || Math.abs(x - 0.7) < 1e-6).toBe(true);
		}
	});
	it('mot khung / thoi gian bang nhau -> nhu dong goi thuong', () => {
		const k = khung(0, 0.4);
		expect(Array.from(noiSuy([k]))).toEqual(Array.from(dg([k.kp])));
	});
});
