import { expect, test } from '@playwright/test';
import { anh, chuanBi } from './chung';

const TRANG = [
	{ duong: '', ten: 'trang-chu', chu: 'Mèo hiểu liền' },
	{ duong: 'dich/', ten: 'dich', chu: 'Bạn ký, Mèo đoán' },
	{ duong: 'hoc/', ten: 'hoc', chu: 'Thư viện 400 từ' },
	{ duong: 'do-vui/', ten: 'do-vui', chu: 'Thử tài cùng Mèo' },
	{ duong: 'tien-do/', ten: 'tien-do', chu: 'Hành trình của bạn' },
	{ duong: 'gioi-thieu/', ten: 'gioi-thieu', chu: 'VSLink là gì?' },
	{ duong: 'gop-y/', ten: 'gop-y', chu: 'Nhóm VSLink luôn muốn nghe bạn' },
	{ duong: 'kiem-tra/', ten: 'kiem-tra', chu: 'Mô hình nhận dạng' }
];

for (const t of TRANG) {
	test(`trang ${t.ten}: mo duoc, khong loi, khong tran ngang`, async ({ page }, info) => {
		const loi = await chuanBi(page);
		await page.goto(t.duong);
		await expect(page.getByText(t.chu).first()).toBeVisible();
		await page.waitForLoadState('networkidle');
		// khong co thanh cuon ngang (giao dien vua man hinh dien thoai)
		const tran = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
		expect(tran).toBeLessThanOrEqual(1);
		await anh(page, info, t.ten);
		expect(loi).toEqual([]);
	});
}

test('giao dien toi: bam doi mau -> luu lai sau khi tai lai', async ({ page }, info) => {
	const loi = await chuanBi(page);
	await page.goto('');
	await page.getByRole('button', { name: /nền tối/ }).click();
	await expect(page.locator('html')).toHaveAttribute('data-giao-dien', 'toi');
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-giao-dien', 'toi');
	await anh(page, info, 'trang-chu-toi');
	await page.goto('hoc/');
	await anh(page, info, 'hoc-toi', { toanTrang: false });
	expect(loi).toEqual([]);
});

test('hoc: tim tu khong dau va loc chu de', async ({ page }) => {
	const loi = await chuanBi(page);
	await page.goto('hoc/');
	await expect(page.locator('.the-tu')).toHaveCount(400);
	await page.getByLabel('Tìm từ').fill('cam on');
	await expect(page.locator('.the-tu')).toHaveCount(1);
	await expect(page.locator('.the-tu .ten')).toHaveText('Cảm ơn');
	await page.getByLabel('Tìm từ').fill('');
	await page.getByRole('button', { name: 'Động vật' }).click();
	await expect(page.locator('.the-tu')).toHaveCount(10);
	await page.locator('.the-tu', { hasText: 'Con mèo' }).click();
	await expect(page.getByTestId('tu-dang-tap')).toHaveText('Con mèo');
	await expect(page).toHaveURL(/hoc\/\?tu=\d+/);
	expect(loi).toEqual([]);
});
