// Luong thuc nghiem offline tron ven voi "nguoi que" gia lap: nhap ma -> dong y -> bai truoc
// -> hoc bo khong phan hoi -> cam nhan -> hoc bo co phan hoi -> cam nhan -> bai sau -> ky lai.
// Thoi gian hoc rut con vai giay (&giay=), ket qua kiem trong bo nho may (khong co Worker).
import { expect, test, type Page } from '@playwright/test';
import { chuanBi } from './chung';

async function lamBaiNhanDien(page: Page, soCau: number, tong = soCau) {
	for (let k = 0; k < soCau; k++) {
		await expect(page.getByTestId('bai-nhan-dien')).toContainText(`Câu ${k + 1}/${tong}`);
		await page.getByTestId('dap-an').first().click();
	}
}

async function lamCamNhan(page: Page) {
	const the = page.getByTestId('cam-nhan');
	await expect(the.getByTestId('gui-cam-nhan')).toBeDisabled();
	for (const fs of await the.locator('fieldset').all()) await fs.locator('label').nth(5).click();
	await the.getByTestId('gui-cam-nhan').click();
}

test('thuc nghiem offline: du cac buoc, dung dieu kien theo nhom, ghi ket qua theo ma', async ({ page }) => {
	test.skip(test.info().project.name === 'dien-thoai', 'phong offline dung laptop');
	test.setTimeout(240_000);
	const loi = await chuanBi(page);
	await page.goto('thuc-nghiem/?gia-lap=1&giay=12');
	await expect(page.locator('nav.dieu-huong')).toHaveCount(0);

	await page.getByTestId('o-ma').fill('f2');
	await page.getByTestId('bat-dau').click();

	await expect(page.getByTestId('tiep')).toBeDisabled();
	await page.getByTestId('o-dong-y').check();
	await page.getByTestId('tiep').click();
	await page.getByTestId('tiep').click(); // huong dan

	await lamBaiNhanDien(page, 8);

	// F02 = nhom 2: bo A khong phan hoi truoc
	const hoc1 = page.getByTestId('hoc-bo');
	await expect(hoc1).toHaveAttribute('data-phan-hoi', 'false');
	await page.getByRole('button', { name: 'Bật camera' }).click();
	await expect(page.getByTestId('da-ghi-nhan')).toBeVisible({ timeout: 60_000 });
	await expect(page.getByTestId('ket-luan')).toHaveCount(0);
	await expect(page.getByTestId('het-gio')).toBeVisible({ timeout: 30_000 });
	await page.getByTestId('tiep-tuc').click();
	await lamCamNhan(page);

	const hoc2 = page.getByTestId('hoc-bo');
	await expect(hoc2).toHaveAttribute('data-phan-hoi', 'true');
	await page.getByRole('button', { name: 'Bật camera' }).click();
	await expect(page.getByTestId('ket-luan')).toBeVisible({ timeout: 60_000 });
	await expect(page.getByTestId('het-gio')).toBeVisible({ timeout: 30_000 });
	await page.getByTestId('tiep-tuc').click();
	await lamCamNhan(page);

	await lamBaiNhanDien(page, 8);

	await expect(page.getByTestId('ky-lai')).toBeVisible();
	await page.getByRole('button', { name: 'Bật camera' }).click();
	await expect(page.getByTestId('da-ghi-nhan')).toBeVisible({ timeout: 60_000 });
	for (let k = 2; k <= 8; k++) {
		await expect(page.getByTestId('ky-lai')).toContainText(`Từ ${k}/8`);
		await page.getByTestId('khong-nho').click();
	}
	await expect(page.getByTestId('xong')).toBeVisible();

	const dong = await page.evaluate(() => JSON.parse(localStorage.getItem('vslink-tn-tat-ca') ?? '[]'));
	const loai = (buoc: string, suKien: string) => dong.filter((d: { buoc: string; su_kien: string }) => d.buoc === buoc && d.su_kien === suKien);
	expect(dong.every((d: { ma: string; nhom: number }) => d.ma === 'F02' && d.nhom === 2)).toBe(true);
	expect(loai('truoc-hoc', 'tra-loi')).toHaveLength(8);
	expect(loai('sau-hoc', 'tra-loi')).toHaveLength(8);
	expect(loai('cam-nhan-1', 'cam-nhan')).toHaveLength(3);
	expect(loai('cam-nhan-1', 'cam-nhan')[0]).toMatchObject({ bo: 'A', phan_hoi: false, diem: 6 });
	expect(loai('hoc-1', 'ky')[0]).toMatchObject({ bo: 'A', phan_hoi: false });
	expect(loai('hoc-2', 'ky')[0]).toMatchObject({ bo: 'B', phan_hoi: true });
	expect(loai('ky-lai', 'ky')).toHaveLength(1);
	expect(loai('ky-lai', 'bo-qua')).toHaveLength(7);
	expect(loai('dong-y', 'thiet-bi')).toHaveLength(1);
	// khong co link Worker -> bao ro la chi luu tren may
	await page.locator('details.nhom summary').click();
	await expect(page.getByTestId('trang-thai-gui')).toContainText('chỉ lưu trên máy');

	// nguoi tiep theo: ve man hinh nhap ma, du lieu cu van con de tai ve
	await page.getByTestId('nguoi-tiep-theo').click();
	await expect(page.getByTestId('o-ma')).toBeVisible();
	expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vslink-tn-tat-ca') ?? '[]').length)).toBe(dong.length);
	expect(loi).toEqual([]);
});

test('thuc nghiem: ma sai bao loi; tai lai giua chung thi lam tiep dung buoc', async ({ page }) => {
	const loi = await chuanBi(page);
	await page.goto('thuc-nghiem/?ma=O07&gia-lap=1');
	await expect(page.getByTestId('o-ma')).toHaveValue('O07');
	await page.getByTestId('o-ma').fill('X9');
	await page.getByTestId('bat-dau').click();
	await expect(page.getByTestId('loi-ma')).toContainText('Mã chưa đúng dạng');

	await page.getByTestId('o-ma').fill('O07');
	await page.getByTestId('bat-dau').click();
	await page.getByTestId('tiep').click(); // online: khong co buoc dong y tren web
	await lamBaiNhanDien(page, 2, 6);
	await page.reload();
	await page.getByRole('button', { name: 'Làm tiếp O07' }).click();
	await expect(page.getByTestId('bai-nhan-dien')).toContainText('Câu 1/6');
	expect(loi).toEqual([]);
});
