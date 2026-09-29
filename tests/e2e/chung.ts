// Tien ich dung chung cho kiem thu trinh duyet.
import type { Locator, Page, TestInfo } from '@playwright/test';

/** Video mau gia lap: may cham khong vao duoc QIPEDC nen tra video nay thay the. */
export const VIDEO_GIA = 'tests/e2e/tai-nguyen/video-gia.webm';

/**
 * Chan mang ra ngoai cho kiem thu on dinh va gom loi trang (pageerror, console.error,
 * canh bao hydrate). Tra ve mang loi de cuoi bai assert rong.
 */
export async function chuanBi(page: Page): Promise<string[]> {
	const loi: string[] = [];
	page.on('pageerror', (e) => loi.push(`pageerror: ${e.message}`));
	page.on('console', (m) => {
		const t = m.text();
		if (m.type() === 'error' && !/Failed to load resource/.test(t)) loi.push(`console.error: ${t}`);
		if (m.type() === 'warning' && /hydrat/i.test(t)) loi.push(`hydrate: ${t}`);
	});
	await page.route(/qipedc\.moet\.gov\.vn|superfoxymlglol\.workers\.dev/, (r) =>
		r.fulfill({ path: VIDEO_GIA, contentType: 'video/webm' })
	);
	await page.route(/storage\.googleapis\.com|generativelanguage\.googleapis\.com/, (r) => r.abort());
	return loi;
}

/**
 * Chup anh vao anh-chup/. May tinh: ca trang. Dien thoai: mot man hinh (giong nguoi
 * dung thay), cuon toi `cuonToi` neu co.
 */
export async function anh(
	page: Page,
	info: TestInfo,
	ten: string,
	{ toanTrang, cuonToi }: { toanTrang?: boolean; cuonToi?: Locator } = {}
) {
	const ca = toanTrang ?? info.project.name !== 'dien-thoai';
	if (cuonToi) await cuonToi.evaluate((el) => el.scrollIntoView({ block: 'start' }));
	else await page.evaluate(() => window.scrollTo(0, 0));
	if (cuonToi) await page.evaluate(() => window.scrollBy(0, -76)); // chua cho thanh dau trang
	await page.waitForTimeout(400); // cho hieu ung chuyen dong xong
	await page.screenshot({ path: `anh-chup/${info.project.name}-${ten}.png`, fullPage: ca });
}

/** Gia lap tep static/du-lieu/video-mau.json (mac dinh: ca 400 tu da duyet, mien Nam). */
export async function coVideoMau(page: Page, tu?: Record<string, unknown>) {
	const ds =
		tu ??
		Object.fromEntries(
			Array.from({ length: 400 }, (_, i) => [
				String(i),
				{
					trang_thai: 'tot',
					chinh: { url: `https://qipedc.moet.gov.vn/videos/T${i}N.mp4`, ma: `T${i}N`, mien: 'nam', p: 0.8, hang: 1, nguon: 'qipedc' },
					khac: []
				}
			])
		);
	await page.route('**/du-lieu/video-mau.json', (r) => r.fulfill({ json: { phien_ban: 1, tu: ds } }));
}
