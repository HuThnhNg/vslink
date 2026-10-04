// Gop y: tu trang Dich bam "Mèo đoán sai? Báo cho nhóm" -> trang gop y co dinh kem ket qua -> gui qua Worker.
import { expect, test } from '@playwright/test';
import { anh, chuanBi } from './chung';

const API = 'https://meo-thu.example/';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };

test('gop y: dinh kem tu Meo doan, chi gui chu, hien loi cam on', async ({ page }, info) => {
	const loi = await chuanBi(page);
	let gui: Record<string, unknown> | null = null;
	await page.route('**/cau-hinh.json', (r) => r.fulfill({ json: { meo_api: API } }));
	await page.route(API, async (r) => {
		if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
		gui = r.request().postDataJSON();
		await r.fulfill({ json: { ok: true }, headers: cors });
	});
	await page.goto('dich/?gia-lap=1');
	await page.getByRole('button', { name: 'Bật camera' }).click();
	await expect(page.getByTestId('tu-doan')).toBeVisible({ timeout: 40_000 });
	await page.getByRole('button', { name: /Mèo đoán sai\? Báo cho nhóm/ }).click();

	await expect(page).toHaveURL(/gop-y\/$/);
	await expect(page.getByTestId('ngu-canh')).toContainText('Mèo đoán:');
	await expect(page.getByRole('radio', { name: 'Mèo đoán sai từ' })).toBeChecked();
	await expect(page.getByTestId('gui-gop-y')).toBeDisabled();
	await page.getByTestId('noi-dung').fill('Mình ký “ăn” nhưng Mèo đoán khác.');
	await anh(page, info, 'gop-y-dien', { cuonToi: page.getByTestId('form-gop-y') });
	await page.getByTestId('gui-gop-y').click();
	await expect(page.getByText('Nhóm đã nhận được góp ý của bạn')).toBeVisible();

	const g = gui as unknown as { loai: string; the_loai: string; ngu_canh: { trang: string; tu_doan: string[] }; web: string };
	expect(g.loai).toBe('gop-y');
	expect(g.the_loai).toBe('doan-sai');
	expect(g.ngu_canh.trang).toBe('dich');
	expect(g.ngu_canh.tu_doan.length).toBeGreaterThan(0);
	expect(g.web).toBe('');
	expect(JSON.stringify(g)).not.toMatch(/data:image|base64/);
	expect(loi).toEqual([]);
});

test('gop y: Worker chua cai dat -> bao nhe nhang, giu noi dung', async ({ page }) => {
	const loi = await chuanBi(page);
	await page.route('**/cau-hinh.json', (r) => r.fulfill({ json: { meo_api: API } }));
	await page.route(API, (r) =>
		r.request().method() === 'OPTIONS'
			? r.fulfill({ status: 204, headers: cors })
			: r.fulfill({ status: 503, json: { loi: 'chua cai dat' }, headers: cors })
	);
	await page.goto('gop-y/');
	await page.getByText('Đề xuất tính năng').click();
	await page.getByTestId('noi-dung').fill('Thêm từ vựng chủ đề trường học nhé.');
	await page.getByTestId('gui-gop-y').click();
	await expect(page.getByRole('alert')).toContainText('đang được nhóm cài đặt');
	await expect(page.getByTestId('noi-dung')).toHaveValue('Thêm từ vựng chủ đề trường học nhé.');
	expect(loi.filter((l) => !/503/.test(l))).toEqual([]);
});
