import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../../worker/meo-worker.js';
import { CAU_HINH, THU_TU_NHOM, boCuaTu, docMa, taoBaiNhanDien, taoKichBan, tuTheoTen } from '../../src/lib/thuc-nghiem/kich-ban';
import { HangDoi, goiTin, moTaThietBi, sangCsv, taoDong } from '../../src/lib/thuc-nghiem/ghi';
import videoMau from '../../static/du-lieu/video-mau.json';

describe('docMa', () => {
	it('chuan hoa ma va gan nhom theo so thu tu', () => {
		expect(docMa(' f7 ')).toEqual({ ma: 'F07', phan: 'offline', so: 7, nhom: 3 });
		expect(docMa('F01')?.nhom).toBe(1);
		expect(docMa('F04')?.nhom).toBe(4);
		expect(docMa('F05')?.nhom).toBe(1);
		expect(docMa('o012')).toEqual({ ma: 'O12', phan: 'online', so: 12, nhom: null });
	});
	it('tu choi ma sai dang', () => {
		for (const x of ['', 'X01', 'F', 'F00', 'F1234', 'F-1', 'O 1']) expect(docMa(x)).toBeNull();
	});
});

describe('kich ban offline', () => {
	it('moi nhom hoc ca hai bo, moi bo dung mot lan co va mot lan khong phan hoi giua cac nhom', () => {
		for (const nhom of [1, 2, 3, 4] as const) {
			const [a, b] = THU_TU_NHOM[nhom];
			expect(new Set([a.bo, b.bo])).toEqual(new Set(['A', 'B']));
			expect(a.phanHoi).not.toBe(b.phanHoi);
		}
		// doi trong: moi bo co phan hoi o dung 2/4 nhom, va hoc truoc o dung 2/4 nhom
		const tatCa = Object.values(THU_TU_NHOM).flat();
		expect(tatCa.filter((x) => x.bo === 'A' && x.phanHoi)).toHaveLength(2);
		expect(Object.values(THU_TU_NHOM).filter(([a]) => a.bo === 'A')).toHaveLength(2);
		expect(Object.values(THU_TU_NHOM).filter(([a]) => a.phanHoi)).toHaveLength(2);
	});
	it('thu tu buoc dung phieu thiet ke', () => {
		const kb = taoKichBan(docMa('F02')!);
		expect(kb.map((b) => b.ten)).toEqual([
			'dong-y', 'huong-dan', 'thai-do-truoc', 'truoc-hoc', 'hoc-1', 'cam-nhan-1', 'hoc-2', 'cam-nhan-2', 'sau-hoc',
			'ky-lai', 'thai-do-sau', 'xong'
		]);
		const hoc = kb.filter((b) => b.loai === 'hoc');
		expect(hoc.map((b) => [b.bo, b.phanHoi])).toEqual([['A', false], ['B', true]]);
		const ky = kb.find((b) => b.loai === 'ky-lai')!;
		expect(ky.tu).toHaveLength(8);
	});
	it('moi nguoi cung de, cung thu tu cau (khong phu thuoc ma)', () => {
		const x = taoKichBan(docMa('F01')!);
		const y = taoKichBan(docMa('F33')!);
		const de = (kb: typeof x) => kb.filter((b) => b.loai === 'nhan-dien').map((b) => b.cau.map((c) => [c.tu.tu, c.dapAn.map((d) => d.tu)]));
		expect(de(x)).toEqual(de(y));
		// truoc va sau khac thu tu
		const [truoc, sau] = de(x);
		expect(truoc.map((c) => c[0])).not.toEqual(sau.map((c) => c[0]));
	});
	it('bo tu tim duoc tu ten', () => {
		expect(boCuaTu(CAU_HINH.offline.boA[0])).toBe('A');
		expect(boCuaTu(CAU_HINH.offline.boB[3])).toBe('B');
		expect(boCuaTu('Mẹ')).toBeNull();
	});
});

describe('kich ban online', () => {
	it('6 cau nhan dien truoc va sau, hoc 3 tu co phan hoi, ky lai 3 tu', () => {
		const kb = taoKichBan(docMa('O03')!);
		expect(kb.map((b) => b.ten)).toEqual(['huong-dan', 'truoc-hoc', 'hoc', 'ky-lai', 'sau-hoc', 'xong']);
		const nd = kb.filter((b) => b.loai === 'nhan-dien');
		expect(nd.every((b) => b.cau.length === 6)).toBe(true);
		const hoc = kb.find((b) => b.loai === 'hoc')!;
		expect(hoc.phanHoi).toBe(true);
		expect(hoc.tu.map((t) => t.tu)).toEqual([...CAU_HINH.online.hoc]);
	});
});

describe('tu trong cau hinh', () => {
	const tatCa = [...CAU_HINH.online.hoc, ...CAU_HINH.online.nhieu, ...CAU_HINH.offline.boA, ...CAU_HINH.offline.boB];
	it('khong trung nhau', () => {
		expect(new Set(tatCa).size).toBe(tatCa.length);
	});
	it('deu co video mau da duyet (bai nhan dien can video that)', () => {
		const vm = videoMau as { tu: Record<string, { trang_thai: string }> };
		const chuaDuyet = tatCa.filter((ten) => !['tot', 'kha', 'tay'].includes(vm.tu[String(tuTheoTen(ten).i)]?.trang_thai));
		expect(chuaDuyet).toEqual([]);
	});
	it('ten sai thi bao loi ngay', () => {
		expect(() => tuTheoTen('Không có từ này')).toThrow();
	});
});

describe('taoBaiNhanDien', () => {
	it('moi cau du dap an, co dap an dung, khong trung', () => {
		const ds = CAU_HINH.offline.boA.map((t) => tuTheoTen(t));
		const bai = taoBaiNhanDien(ds, 7);
		expect(bai).toHaveLength(4);
		for (const c of bai) {
			expect(c.dapAn).toHaveLength(CAU_HINH.soDapAn);
			expect(c.dapAn.some((d) => d.i === c.tu.i)).toBe(true);
			expect(new Set(c.dapAn.map((d) => d.i)).size).toBe(c.dapAn.length);
		}
	});
});

describe('ghi ket qua', () => {
	const n = docMa('F06')!;
	afterEach(() => vi.unstubAllGlobals());

	it('dong ghi co du cot va thoi diem ISO', () => {
		const d = taoDong(n, 'hoc-1', 'ky', { tu: 'Sữa', hang: 2 }, new Date('2026-10-15T02:00:00Z'));
		expect(d).toMatchObject({ ma: 'F06', nhom: 2, buoc: 'hoc-1', su_kien: 'ky', tu: 'Sữa', hang: 2, thoi_diem: '2026-10-15T02:00:00.000Z' });
		expect(goiTin(Array(50).fill(d)).dong).toHaveLength(40);
	});

	it('mo ta thiet bi ngan gon', () => {
		const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
		expect(moTaThietBi({ userAgent: ua, hardwareConcurrency: 8, deviceMemory: 8 }, { width: 1920, height: 1080 })).toBe(
			'Chrome 141 · Windows · 1920×1080 · 8 nhân · 8 GB'
		);
	});

	it('CSV co BOM, boc dau phay', () => {
		const csv = sangCsv([taoDong(n, 'ky-lai', 'ky', { top5: 'Sữa, Trà' })]);
		expect(csv.startsWith('﻿thoi_diem,ma')).toBe(true);
		expect(csv).toContain('"Sữa, Trà"');
	});

	it('hang doi: luu may truoc, gui xong thi xoa, loi thi giu lai', async () => {
		const bo: Record<string, string> = {};
		const kho = { getItem: (k: string) => bo[k] ?? null, setItem: (k: string, v: string) => void (bo[k] = v) };
		const fetchGia = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 502 })).mockResolvedValue(new Response('{"ok":true}'));
		vi.stubGlobal('fetch', fetchGia);
		vi.useFakeTimers();
		const h = new HangDoi(async () => 'https://meo.test', kho);
		h.ghi(taoDong(n, 'truoc-hoc', 'tra-loi', { tu: 'Sữa', tra_loi: 'Trà', dung: false }));
		await vi.waitFor(() => expect(h.trangThai.loi).toMatch(/502/));
		expect(h.trangThai.choGui).toBe(1);
		await vi.advanceTimersByTimeAsync(10_000);
		await vi.waitFor(() => expect(h.trangThai.choGui).toBe(0));
		expect(h.trangThai.daLuu).toBe(1);
		expect(h.tatCa()[0].tra_loi).toBe('Trà');
		const than = JSON.parse(fetchGia.mock.calls[1][1].body);
		expect(than.loai).toBe('thuc-nghiem');
		vi.useRealTimers();
	});

	it('khong co link Worker: chi luu tren may, bao ro', async () => {
		const bo: Record<string, string> = {};
		const kho = { getItem: (k: string) => bo[k] ?? null, setItem: (k: string, v: string) => void (bo[k] = v) };
		const h = new HangDoi(async () => undefined, kho);
		h.ghi(taoDong(n, 'dong-y', 'bat-dau'));
		await vi.waitFor(() => expect(h.trangThai.loi).toMatch(/tải về/));
		expect(h.trangThai.choGui).toBe(1);
	});
});

describe('Worker: thuc nghiem', () => {
	const ENV = { GOP_Y_URL: 'https://script.google.com/macros/s/x/exec', GOP_Y_KHOA: 'bi-mat', ALLOWED_ORIGINS: '*' };
	const hoi = (than: unknown) =>
		new Request('https://meo.workers.dev', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.9.9.9' },
			body: JSON.stringify(than)
		});
	afterEach(() => vi.unstubAllGlobals());

	it('kiem tung dong roi chuyen sang Apps Script kem khoa', async () => {
		const fetchGia = vi.fn().mockResolvedValue(new Response('{"ok":true}'));
		vi.stubGlobal('fetch', fetchGia);
		const dong = Array.from({ length: 40 }, (_, k) =>
			taoDong(docMa('F06')!, 'ky-lai', 'ky', { tu: 'Sữa', tra_loi: 'Trà', hang: 3, top5: 'Trà, Sữa, Không có', thiet_bi: 'x'.repeat(500), lan: k })
		);
		const r = await worker.fetch(hoi(goiTin(dong)), ENV);
		expect(r.status).toBe(200);
		const gui = JSON.parse(fetchGia.mock.calls[0][1].body);
		expect(gui.khoa).toBe('bi-mat');
		expect(gui.loai).toBe('thuc-nghiem');
		expect(gui.dong).toHaveLength(40);
		expect(gui.dong[0]).toMatchObject({ ma: 'F06', phan: 'offline', nhom: 2, tu: 'Sữa', tra_loi: 'Trà', hang: 3, top5: 'Trà, Sữa' });
		expect(gui.dong[0].thiet_bi).toHaveLength(200);
	});

	it('tu choi ma sai hoac buoc la', async () => {
		vi.stubGlobal('fetch', vi.fn());
		const d = taoDong(docMa('F06')!, 'ky-lai', 'ky');
		expect((await worker.fetch(hoi(goiTin([{ ...d, ma: 'X1' }])), ENV)).status).toBe(400);
		expect((await worker.fetch(hoi(goiTin([{ ...d, buoc: 'hack' }])), ENV)).status).toBe(400);
		expect((await worker.fetch(hoi({ loai: 'thuc-nghiem', dong: [] }), ENV)).status).toBe(400);
	});

	it('goi khac van bi gioi han 6000 ky tu', async () => {
		const r = await worker.fetch(hoi({ loai: 'gop-y', the_loai: 'khac', noi_dung: 'x'.repeat(7000) }), ENV);
		expect(r.status).toBe(413);
	});
});
