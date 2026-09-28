import { expect, test } from '@playwright/test';

test('ONNX Runtime Web cho ket qua trung ONNX Runtime Python', async ({ page }) => {
	const loi: string[] = [];
	page.on('pageerror', (e) => loi.push(String(e)));
	await page.goto('kiem-tra/');
	const kq = page.getByTestId('ket-qua-onnx');
	await expect(kq).toHaveAttribute('data-dat', 'true', { timeout: 60_000 });
	await expect(page.locator('table tbody tr')).toHaveCount(4);
	expect(loi).toEqual([]);
});
