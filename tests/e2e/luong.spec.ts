// Luong day du: "nguoi que" gia lap tu ky (?gia-lap=1) -> cat doan -> mo hinh ONNX that
// -> ket qua / Meo nhan xet / tien do. MediaPipe that khong chay duoc tren may cham
// (khong tai duoc mo hinh tu Google) nen phan do kiem o trang /kiem-tra tren may that.
import { expect, test } from '@playwright/test';
import { anh, chuanBi, coVideoMau, VIDEO_GIA } from './chung';

test('dich: nguoi que ky -> Meo doan ra mot tu, top 5, phu de tren camera', async ({ page }, info) => {
	const loi = await chuanBi(page);
	await page.goto('dich/?gia-lap=1');
	await page.getByRole('button', { name: 'Bật camera' }).click();
	await expect(page.getByTestId('tu-doan')).toBeVisible({ timeout: 40_000 });
	await expect(page.getByTestId('top5').locator('li')).toHaveCount(5);
	await expect(page.locator('.phu-de-cam')).toBeVisible();
	await expect(page.locator('.lich-su .chip')).not.toHaveCount(0);
	await anh(page, info, 'dich-ket-qua');
	if (info.project.name === 'dien-thoai') {
		await anh(page, info, 'dich-ket-qua-camera', { cuonToi: page.locator('.o-camera') });
		await anh(page, info, 'dich-ket-qua-the', { cuonToi: page.getByTestId('ket-qua-dich') });
	}
	expect(loi).toEqual([]);
});

test('dich: tai video len khi khong tai duoc MediaPipe -> bao loi de hieu', async ({ page }) => {
	const loi = await chuanBi(page);
	await page.goto('dich/?che=video');
	await page.getByTestId('chon-video').setInputFiles(VIDEO_GIA);
	await expect(page.locator('.tai-len .loi')).toContainText('bộ nhận dáng người', { timeout: 60_000 });
	await expect(page.getByRole('button', { name: 'Đoán lại' })).toBeVisible();
	expect(loi.filter((l) => !/MediaPipe|holistic|fetch|Failed|ERR_/i.test(l))).toEqual([]);
});

test('hoc: tap tu -> ket luan, bo phan, Meo noi loi soan san; tien do ghi lai', async ({ page }, info) => {
	const loi = await chuanBi(page);
	await page.goto('hoc/?tu=0&gia-lap=1');
	await expect(page.getByTestId('tu-dang-tap')).toHaveText('Anh');
	await page.getByRole('button', { name: 'Bật camera' }).click();
	await expect(page.getByTestId('ket-luan')).toBeVisible({ timeout: 40_000 });
	const meo = page.getByTestId('loi-meo');
	await expect(meo).toHaveAttribute('data-nguon', 'mau');
	await expect(meo).toContainText('“Anh”');
	await expect(page.getByTestId('bo-phan').locator('li')).toHaveCount(3);
	await expect(page.getByTestId('top5').locator('li')).not.toHaveCount(0);
	await anh(page, info, 'hoc-ket-qua');
	if (info.project.name === 'dien-thoai') {
		await anh(page, info, 'hoc-ket-qua-camera', { cuonToi: page.locator('.o-cam') });
		await anh(page, info, 'hoc-ket-qua-the', { cuonToi: page.getByTestId('ket-qua-hoc') });
	}

	await page.getByRole('link', { name: 'Thư viện' }).click();
	await expect(page.locator('.the-tu').first()).toBeVisible();
	await page.goto('tien-do/');
	await expect(page.getByTestId('chuoi-ngay')).toHaveText('1');
	await anh(page, info, 'tien-do-sau-khi-hoc');
	expect(loi).toEqual([]);
});

test('hoc: co Worker -> Meo noi bang AI, chi gui du kien (khong gui hinh / keypoint)', async ({ page }) => {
	const loi = await chuanBi(page);
	const API = 'https://meo-thu.example/';
	const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };
	let gui: Record<string, unknown> | null = null;
	await page.route('**/cau-hinh.json', (r) => r.fulfill({ json: { meo_api: API } }));
	await page.route(API, async (r) => {
		if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
		gui = r.request().postDataJSON();
		await r.fulfill({ json: { loi_meo: 'Gâu! Lời này đến từ Worker giả lập.', model: 'thu' }, headers: cors });
	});
	await page.goto('hoc/?tu=86&gia-lap=1');
	await expect(page.getByTestId('tu-dang-tap')).toHaveText('Cảm ơn');
	await page.getByRole('button', { name: 'Bật camera' }).click();
	const meo = page.getByTestId('loi-meo');
	await expect(meo).toHaveAttribute('data-nguon', 'ai', { timeout: 40_000 });
	await expect(meo).toHaveText('Gâu! Lời này đến từ Worker giả lập.');
	const dk = (gui as unknown as { du_kien: Record<string, unknown> }).du_kien;
	expect(dk.tu_muc_tieu).toBe('Cảm ơn');
	expect(['dung', 'gan-dung', 'chua-dung']).toContain(dk.muc_do);
	expect(JSON.stringify(gui).length).toBeLessThan(1500);
	expect(Object.keys(dk).sort()).toEqual(
		[
			'bo_phan', 'giai_doan_lech_nhat', 'muc_do', 'thoi_luong_giay', 'ti_le_thay_tay_phai', 'ti_le_thay_tay_trai',
			'top3', 'tu_doan', 'tu_muc_tieu', 'xac_suat', 'xac_suat_tu_doan', 'xep_hang'
		].sort()
	);
	expect(loi).toEqual([]);
});

test('do vui xem: 10 cau -> tong ket', async ({ page }, info) => {
	const loi = await chuanBi(page);
	await coVideoMau(page);
	await page.goto('do-vui/');
	await page.getByTestId('choi-xem').click();
	for (let i = 0; i < 10; i++) {
		await expect(page.getByTestId('dap-an')).toHaveCount(4);
		await page.getByTestId('dap-an').nth(i % 4).click();
		if (i === 0) await anh(page, info, 'do-vui-xem');
		await page.getByTestId('cau-tiep').click();
	}
	await expect(page.getByTestId('tong-ket')).toBeVisible();
	await anh(page, info, 'do-vui-tong-ket');
	expect(loi).toEqual([]);
});

test('do vui ky: nguoi que ky -> co ket qua va nut cau tiep', async ({ page }, info) => {
	const loi = await chuanBi(page);
	await page.goto('do-vui/?kieu=ky&gia-lap=1');
	await expect(page.getByTestId('tu-de')).toBeVisible();
	await page.getByRole('button', { name: 'Bật camera' }).click();
	await expect(page.getByTestId('cau-tiep')).toBeVisible({ timeout: 40_000 });
	await anh(page, info, 'do-vui-ky');
	if (info.project.name === 'dien-thoai') await anh(page, info, 'do-vui-ky-de', { cuonToi: page.locator('.de-bai') });
	expect(loi).toEqual([]);
});

test('camera that tren may cham: khong tai duoc MediaPipe -> bao loi + nut thu lai', async ({ page }) => {
	await chuanBi(page);
	await page.goto('dich/');
	await page.getByRole('button', { name: 'Bật camera' }).click();
	await expect(page.getByText('Không tải được bộ nhận dáng người')).toBeVisible({ timeout: 60_000 });
	await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible();
});

test('net ve khop: chon An thi camera sach, chon lai thi ve; nho lua chon', async ({ page }, info) => {
	const loi = await chuanBi(page);
	await page.goto('dich/?gia-lap=1');
	await page.getByRole('button', { name: 'Bật camera' }).click();
	const nhom = page.getByRole('group', { name: /Nét vẽ khớp/ });
	await expect(nhom.getByRole('button', { name: 'Tay' })).toHaveAttribute('aria-pressed', 'true');
	const soDiemVe = () =>
		page.evaluate(() => {
			const c = document.querySelector('.o-camera canvas') as HTMLCanvasElement;
			const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
			let n = 0;
			for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
			return n;
		});
	await page.waitForTimeout(500);
	expect(await soDiemVe()).toBeGreaterThan(100);
	await anh(page, info, 'net-ve-tay', { cuonToi: page.locator('.o-camera') });
	await nhom.getByRole('button', { name: 'Ẩn' }).click();
	await page.waitForTimeout(300);
	expect(await soDiemVe()).toBe(0);
	await page.reload();
	await expect(page.getByRole('group', { name: /Nét vẽ khớp/ }).getByRole('button', { name: 'Ẩn' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	expect(loi).toEqual([]);
});
