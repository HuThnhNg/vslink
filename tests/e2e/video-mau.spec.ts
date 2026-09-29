// Video mau: web chi dung video da duyet; cong cu nhom noi QIPEDC -> khop -> cham -> xuat.
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { anh, chuanBi, coVideoMau, VIDEO_GIA } from './chung';

test('chua co video da duyet: Hoc bao dang duyet, Do vui "xem" tam khoa', async ({ page }) => {
	const loi = await chuanBi(page);
	await page.goto('hoc/?tu=40');
	await expect(page.getByTestId('tu-dang-tap')).toHaveText('Cháu');
	await expect(page.getByText('đang được nhóm duyệt lại')).toBeVisible();
	await page.goto('do-vui/');
	await expect(page.getByTestId('xem-tam-khoa')).toBeVisible();
	await expect(page.getByTestId('choi-xem')).toBeDisabled();
	await expect(page.getByTestId('choi-ky')).toBeEnabled();
	expect(loi).toEqual([]);
});

test('co video da duyet: tab "Mèo chấm theo cách này" + cac mien khac', async ({ page }, info) => {
	const loi = await chuanBi(page);
	const v = (ma: string, mien: string, p: number) => ({ url: `https://qipedc.moet.gov.vn/videos/${ma}.mp4`, ma, mien, p, hang: 1, nguon: 'qipedc' });
	await coVideoMau(page, {
		'40': { trang_thai: 'tot', chinh: v('D0100N', 'nam', 0.9), khac: [v('D0100B', 'bac', 0.1), v('D0100T', 'trung', 0.05)] }
	});
	await page.goto('hoc/?tu=40');
	const tab = page.getByRole('tablist', { name: 'Các cách ký' });
	await expect(tab.getByRole('tab')).toHaveText(['Mèo chấm theo cách này (miền Nam)', 'Cách miền Bắc', 'Cách miền Trung']);
	await expect(page.getByText('Ký hiệu miền Nam')).toBeVisible();
	await tab.getByRole('tab', { name: 'Cách miền Bắc' }).click();
	await expect(page.locator('.o-mau video')).toHaveAttribute('src', /D0100B/);
	await anh(page, info, 'hoc-video-nhieu-mien', { cuonToi: page.locator('.o-mau') });
	expect(loi).toEqual([]);
});

test('cong cu: noi QIPEDC -> khop ten -> cham -> chon tay -> xuat video-mau.json', async ({ page, context }, info) => {
	test.skip(info.project.name === 'dien-thoai', 'công cụ dùng F12 trên máy tính');
	const loi = await chuanBi(page);
	await page.route(/workers\.dev/, (r) =>
		r.fulfill({ path: VIDEO_GIA, contentType: 'video/webm', headers: { 'access-control-allow-origin': '*' } })
	);
	await context.route(/^https:\/\/qipedc\.moet\.gov\.vn\//, (r) => {
		const u = new URL(r.request().url());
		if (u.pathname.startsWith('/dictionary'))
			return r.fulfill({ path: 'tests/e2e/tai-nguyen/qipedc-gia.html', contentType: 'text/html; charset=utf-8' });
		if (u.pathname.startsWith('/videos/')) return r.fulfill({ path: VIDEO_GIA, contentType: 'video/webm' });
		return r.fulfill({ status: 404, body: '' });
	});
	await page.goto('cong-cu/video-mau/?gia-lap=1');
	const lenh = page.getByTestId('lenh-qipedc');
	await expect(lenh).not.toHaveValue('');
	const [qp] = await Promise.all([page.waitForEvent('popup'), page.getByRole('button', { name: 'Mở QIPEDC' }).click()]);
	await qp.waitForLoadState();
	await qp.evaluate(await lenh.inputValue());
	await expect(page.getByTestId('trang-thai-noi')).toContainText('Đã nối · 9 video');
	await expect(page.getByTestId('khop')).toContainText('trùng tên');

	await page.getByTestId('cham').click();
	await expect(page.getByTestId('tien-trinh')).toContainText('Đã chấm 21/21', { timeout: 120_000 });

	await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
	await page.getByPlaceholder('Tìm từ…').fill('anh');
	const dong = page.getByTestId('ds-duyet').locator('li').filter({ has: page.locator('b.ten', { hasText: /^Anh$/ }) });
	await expect(dong.locator('.the-uv')).toHaveCount(4); // Bac, Nam, Trung + video cu
	await dong.locator('.the-uv', { hasText: 'miền Trung' }).getByRole('button', { name: 'Chọn' }).click();
	await expect(dong.locator('.nhan-tt')).toHaveText('Đã chọn tay');
	await dong.locator('.the-uv', { hasText: 'miền Trung' }).getByRole('button', { name: /Xem video/ }).click();
	await expect(dong.locator('.xem-thu video')).toHaveAttribute('src', /D0001T\.mp4$/);
	await anh(page, info, 'cong-cu-video-mau');

	// ten tren QIPEDC khac ten VSL400: nhom tu tra, xem thu, them -> may cham tiep
	await page.getByPlaceholder('Tìm từ…').fill('banh bao');
	const bb = page.getByTestId('ds-duyet').locator('li').filter({ has: page.locator('b.ten', { hasText: /^Bánh bao$/ }) });
	await expect(bb.locator('.nhan-tt')).toHaveText('Không tìm thấy');
	await bb.getByRole('button', { name: 'Tìm thêm' }).click();
	await bb.getByRole('searchbox', { name: /Tìm trong danh sách QIPEDC/ }).fill('tuy hoa');
	const kq = bb.getByTestId('kq-tim').locator('li');
	await expect(kq).toHaveCount(1);
	await kq.getByRole('button', { name: /Xem video Tuy Hoà/ }).click();
	await expect(bb.locator('.tim-q video')).toHaveAttribute('src', /D0004\.mp4$/);
	await kq.getByRole('button', { name: 'Thêm' }).click();
	await expect(kq.getByText('Đã có')).toBeVisible();
	await expect(bb.locator('.the-uv')).toHaveText([/Tuy Hoà.*chưa chấm/]);
	await expect(bb.locator('.nhan-tt')).toHaveText('Chưa chấm');
	await anh(page, info, 'cong-cu-tim-them', { cuonToi: bb, toanTrang: false });
	await page.getByTestId('cham').click();
	await expect(page.getByTestId('tien-trinh')).toContainText('Đã chấm 22/22');
	await expect(bb.locator('.the-uv small')).toHaveText(/%/);

	const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('xuat').click()]);
	const tep = JSON.parse(await readFile((await dl.path())!, 'utf8'));
	expect(tep.phien_ban).toBe(1);
	expect(tep.tu['0']).toMatchObject({ trang_thai: 'tay', chinh: { ma: 'D0001T', mien: 'trung', nguon: 'qipedc' } });
	expect(tep.tu['0'].khac.map((v: { ma: string }) => v.ma).sort()).toEqual(['D0001B', 'D0001N']);
	expect(tep.tu['1'].chinh.ma).toBe('D0002');
	expect(tep.tu['3'].khac).toHaveLength(1);
	expect(tep.tu['12']).toMatchObject({ chinh: { ma: 'D0004', nguon: 'qipedc' } });

	// bo video tu them -> tu lai "khong tim thay"; tai lai trang van nho
	await bb.getByRole('button', { name: /Bỏ video Tuy Hoà/ }).click();
	await expect(bb.locator('.nhan-tt')).toHaveText('Không tìm thấy');
	await page.reload();
	await expect(page.getByTestId('tien-trinh')).toContainText('Đã chấm 21/21');
	expect(loi).toEqual([]);
});
