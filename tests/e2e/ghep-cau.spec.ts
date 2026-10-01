// Ghep cau tren trang Dich: "nguoi que" ky tung tu -> day tu -> cau.
// Khong co Worker: noi tu theo thu tu ky. Co Worker (gia lap): dung cau AI, chi gui tu + xac suat.
import { expect, test } from '@playwright/test';
import { anh, chuanBi } from './chung';

test('ghep cau: khong co Worker -> noi cac tu da ky thanh cau', async ({ page }, info) => {
	const loi = await chuanBi(page);
	await page.goto('dich/?gia-lap=1');
	await page.getByTestId('bat-ghep-cau').check();
	await expect(page.getByTestId('khung-cau')).toBeVisible();
	await page.getByRole('button', { name: 'Bật camera' }).click();
	await expect(page.locator('.day-cau .chip')).not.toHaveCount(0, { timeout: 40_000 });
	await page.getByTestId('dich-thanh-cau').click();
	await expect(page.getByTestId('cau-ghep')).toHaveText(/\S.*\.$/);
	await expect(page.getByTestId('khung-cau')).toContainText('Chưa có AI');
	await anh(page, info, 'ghep-cau-noi-tu', { cuonToi: page.getByTestId('ket-qua-dich') });
	// bo mot tu -> ket qua cu bi xoa
	await page.locator('.xoa-tu').first().click();
	await expect(page.getByTestId('cau-ghep')).toHaveCount(0);
	expect(loi).toEqual([]);
});

test('ghep cau: co Worker -> cau AI, chi gui {loai, vi_tri} voi top-3 tu + xac suat', async ({ page }) => {
	const loi = await chuanBi(page);
	const API = 'https://meo-thu.example/';
	const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };
	let gui: { loai?: string; vi_tri?: { tu: string; p: number }[][] } | null = null;
	await page.route('**/cau-hinh.json', (r) => r.fulfill({ json: { meo_api: API } }));
	await page.route(API, async (r) => {
		if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
		gui = r.request().postDataJSON();
		const dau = gui?.vi_tri?.map((uv) => uv[0].tu) ?? [];
		await r.fulfill({ json: { cau: 'Câu này đến từ Worker giả lập.', chon: dau, model: 'thu' }, headers: cors });
	});
	await page.goto('dich/?gia-lap=1');
	await page.getByTestId('bat-ghep-cau').check();
	await page.getByRole('button', { name: 'Bật camera' }).click();
	await expect(page.locator('.day-cau .chip')).not.toHaveCount(0, { timeout: 40_000 });
	await page.getByTestId('dich-thanh-cau').click();
	await expect(page.getByTestId('cau-ghep')).toHaveText('Câu này đến từ Worker giả lập.');
	await expect(page.getByTestId('khung-cau')).toContainText('bằng AI');
	const g = gui as unknown as { loai: string; vi_tri: { tu: string; p: number }[][] };
	expect(Object.keys(g).sort()).toEqual(['loai', 'vi_tri']);
	expect(g.loai).toBe('cau');
	for (const uv of g.vi_tri) {
		expect(uv.length).toBeLessThanOrEqual(3);
		for (const u of uv) expect(Object.keys(u).sort()).toEqual(['p', 'tu']);
	}
	expect(loi).toEqual([]);
});
