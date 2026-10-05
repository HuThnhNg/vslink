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

/**
 * Gia lap static/du-lieu/khung-mau/: chi-muc.json + mot .bin "nguoi que" (tay phai ve
 * vong tron truoc cam) cho moi tu duoc hoi. tu: { "40": { kiem_chung: true, ... } }.
 */
export async function coKhungMau(page: Page, tu: Record<string, Record<string, unknown>>) {
	const T = 60;
	const buf = Buffer.alloc(T * 75 * 4);
	const dat = (t: number, j: number, x: number, y: number) => {
		buf.writeInt16LE(Math.round(x * 10000), (t * 75 + j) * 4);
		buf.writeInt16LE(Math.round(y * 10000), (t * 75 + j) * 4 + 2);
	};
	for (let t = 0; t < T; t++) {
		const g = (2 * Math.PI * t) / (T - 1);
		const co: [number, number] = [0.44 + 0.06 * Math.sin(g), 0.33 + 0.04 * Math.cos(g)]; // co tay phai
		dat(t, 0, 0.5, 0.25); // mui
		dat(t, 7, 0.56, 0.24); // tai
		dat(t, 8, 0.44, 0.24);
		dat(t, 11, 0.65, 0.5); // vai trai (ben phai anh)
		dat(t, 12, 0.35, 0.5);
		dat(t, 13, 0.7, 0.68); // tay trai buong
		dat(t, 15, 0.71, 0.86);
		dat(t, 23, 0.6, 0.95);
		dat(t, 24, 0.4, 0.95);
		dat(t, 14, 0.3, 0.62); // khuyu phai
		dat(t, 16, ...co);
		for (let j = 0; j < 21; j++) dat(t, 54 + j, co[0] + 0.006 * (j % 5) - 0.01, co[1] - 0.012 * Math.floor(j / 4));
	}
	await page.route('**/du-lieu/khung-mau/chi-muc.json', (r) =>
		r.fulfill({ json: { phien_ban: 1, so_khung: T, so_diem: 75, ti_le: 10000, tu } })
	);
	await page.route('**/du-lieu/khung-mau/*.bin', (r) => r.fulfill({ body: buf, contentType: 'application/octet-stream' }));
}
