import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../../worker/meo-worker.js';
import { goiGonGopY, guiGopY, type BanGopY } from '../../src/lib/gop-y/du-lieu';

const BAN: BanGopY = { theLoai: 'doan-sai', noiDung: '  Mèo đoán "ăn" thành "uống"  ', dungRa: 'ăn', lienHe: 'zalo 0900', nguoiDiec: true };
const ENV = { GOP_Y_URL: 'https://script.google.com/macros/s/x/exec', GOP_Y_KHOA: 'bi-mat', ALLOWED_ORIGINS: '*' };

let ip = 0;
const hoi = (than: unknown, dung = `10.0.0.${++ip}`) =>
	new Request('https://meo.workers.dev', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': dung },
		body: JSON.stringify(than)
	});

afterEach(() => vi.unstubAllGlobals());

describe('goiGonGopY', () => {
	it('chi gui chu, cat khoang trang va gioi han do dai', () => {
		const g = goiGonGopY({ ...BAN, noiDung: 'x'.repeat(3000) }, { trang: 'dich', tuDoan: Array(20).fill('ăn') }, 'UA');
		expect(g.loai).toBe('gop-y');
		expect(g.noi_dung).toHaveLength(2000);
		expect(g.ngu_canh.tu_doan).toHaveLength(12);
		expect(g.ngu_canh.trang).toBe('dich');
		expect(g.nguoi_diec).toBe(true);
	});
	it('khong co ngu canh thi trang = gop-y', () => {
		const g = goiGonGopY(BAN, null);
		expect(g.noi_dung).toBe('Mèo đoán "ăn" thành "uống"');
		expect(g.ngu_canh).toEqual({ trang: 'gop-y', tu_doan: [], cau: '' });
	});
});

describe('guiGopY', () => {
	it('chua co dia chi Worker -> chua-cai-dat', async () => {
		expect(await guiGopY(BAN, null)).toEqual({ ok: false, lyDo: 'chua-cai-dat' });
	});
	it.each([
		[200, { ok: true }],
		[503, { ok: false, lyDo: 'chua-cai-dat' }],
		[429, { ok: false, lyDo: 'qua-nhieu' }],
		[502, { ok: false, lyDo: 'loi' }]
	])('Worker tra %i', async (status, mong) => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status })));
		expect(await guiGopY(BAN, null, { api: 'https://meo.workers.dev' })).toEqual(mong);
	});
	it('mat mang -> loi', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('mang'))));
		expect(await guiGopY(BAN, null, { api: 'https://meo.workers.dev' })).toEqual({ ok: false, lyDo: 'loi' });
	});
});

describe('Worker: loai gop-y', () => {
	it('hop le -> chuyen sang Apps Script kem khoa, khong can GEMINI_API_KEY', async () => {
		const goi = vi.fn(async (_u: string, _o: RequestInit) => new Response(JSON.stringify({ ok: true })));
		vi.stubGlobal('fetch', goi);
		const r = await worker.fetch(hoi(goiGonGopY(BAN, { trang: 'dich', tuDoan: ['uống', 'ăn'] })), ENV);
		expect(r.status).toBe(200);
		expect(await r.json()).toEqual({ ok: true });
		expect(goi).toHaveBeenCalledOnce();
		const [url, opt] = goi.mock.calls[0];
		expect(url).toBe(ENV.GOP_Y_URL);
		const gui = JSON.parse(String(opt.body));
		expect(gui.khoa).toBe('bi-mat');
		expect(gui.noi_dung).toContain('Mèo đoán');
	});
	it('chua cai dat -> 503', async () => {
		const r = await worker.fetch(hoi(goiGonGopY(BAN, null)), { ALLOWED_ORIGINS: '*' });
		expect(r.status).toBe(503);
	});
	it('noi dung rong, sai the loai hoac dinh o bay -> 400', async () => {
		const goi = vi.fn();
		vi.stubGlobal('fetch', goi);
		for (const b of [
			{ ...BAN, noiDung: ' ' },
			{ ...BAN, theLoai: 'la' as BanGopY['theLoai'] },
			{ ...BAN, web: 'http://spam' }
		]) {
			expect((await worker.fetch(hoi(goiGonGopY(b, null)), ENV)).status).toBe(400);
		}
		expect(goi).not.toHaveBeenCalled();
	});
	it('Apps Script loi -> 502', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: false, loi: 'sai khoa' }))));
		expect((await worker.fetch(hoi(goiGonGopY(BAN, null)), ENV)).status).toBe(502);
	});
	it('gui qua nhieu tu mot may -> 429', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }))));
		const trangThai = [];
		for (let k = 0; k < 6; k++) trangThai.push((await worker.fetch(hoi(goiGonGopY(BAN, null), '9.9.9.9'), ENV)).status);
		expect(trangThai.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
		expect(trangThai[5]).toBe(429);
	});
});
