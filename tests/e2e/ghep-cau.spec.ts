// Ghep cau tren trang Dich: "nguoi que" ky tung tu -> day tu -> cau.
// Khong co Worker: noi tu theo thu tu ky. Co Worker (gia lap): dung cau Worker tra, chi gui tu + xac suat.
// Nguoi dung khong bao gio thay chu "AI": chi thay cau.
import { expect, test } from '@playwright/test';
import { anh, chuanBi } from './chung';

test('ghep cau: khong co Worker -> noi cac tu da ky thanh cau', async ({ page }, info) => {
	const loi = await chuanBi(page);
	await page.goto('dich/?gia-lap=1');
	await page.getByTestId('che-cau').click();
	await expect(page.getByTestId('khung-cau')).toBeVisible();
	await page.getByRole('button', { name: 'Bật camera' }).click();
	await expect(page.locator('.day-cau .chip')).not.toHaveCount(0, { timeout: 40_000 });
	await page.getByTestId('dich-thanh-cau').click();
	await expect(page.getByTestId('cau-ghep')).toHaveText(/\S.*\.$/);
	await expect(page.getByTestId('phu-de-cau')).toBeVisible(); // cau hien ngay tren camera
	if ((await page.locator('.day-cau .chip').count()) > 1) await expect(page.getByTestId('cau-chua-sap-xep')).toBeVisible();
	await expect(page.getByTestId('ket-qua-dich')).not.toContainText(/\bAI\b/);
	await anh(page, info, 'ghep-cau-noi-tu', { cuonToi: page.getByTestId('ket-qua-dich') });
	// bo mot tu -> ket qua cu bi xoa
	await page.locator('.xoa-tu').first().click();
	await expect(page.getByTestId('cau-ghep')).toHaveCount(0);
	expect(loi).toEqual([]);
});

test('ghep cau: co Worker -> cau tu Worker, chi gui {loai, vi_tri} voi top-3 tu + xac suat', async ({ page }) => {
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
	await page.getByTestId('che-cau').click();
	await page.getByRole('button', { name: 'Bật camera' }).click();
	await expect(page.locator('.day-cau .chip')).not.toHaveCount(0, { timeout: 40_000 });
	await page.getByTestId('dich-thanh-cau').click();
	await expect(page.getByTestId('cau-ghep')).toHaveText('Câu này đến từ Worker giả lập.');
	await expect(page.getByTestId('phu-de-cau')).toContainText('Câu này đến từ Worker giả lập.');
	await expect(page.getByTestId('cau-chua-sap-xep')).toHaveCount(0);
	await expect(page.getByTestId('ket-qua-dich')).not.toContainText(/\bAI\b/);
	// bam vao mot tu -> mo bang doi tu
	await page.locator('.tu-nut').first().click();
	await expect(page.getByTestId('doi-tu')).toBeVisible();
	const g = gui as unknown as { loai: string; vi_tri: { tu: string; p: number }[][] };
	expect(Object.keys(g).sort()).toEqual(['loai', 'vi_tri']);
	expect(g.loai).toBe('cau');
	for (const uv of g.vi_tri) {
		expect(uv.length).toBeLessThanOrEqual(3);
		for (const u of uv) expect(Object.keys(u).sort()).toEqual(['p', 'tu']);
	}
	expect(loi).toEqual([]);
});
