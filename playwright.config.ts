import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// May cham (sandbox) co san Chromium o /opt/pw-browsers; may ban thi de trong de
// Playwright dung ban tu cai (npx playwright install chromium). PW_CHROMIUM ghi de.
const CHROMIUM_SAN = '/opt/pw-browsers/chromium';
const chromium = process.env.PW_CHROMIUM ?? (existsSync(CHROMIUM_SAN) ? CHROMIUM_SAN : undefined);

const cong = 4173;
const base = process.env.BASE_PATH ?? '';

export default defineConfig({
	testDir: 'tests/e2e',
	timeout: 90_000,
	expect: { timeout: 20_000 },
	fullyParallel: false,
	workers: 1,
	reporter: [['list']],
	outputDir: 'test-results',
	use: {
		baseURL: `http://localhost:${cong}${base}/`,
		launchOptions: {
			executablePath: chromium,
			args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
		}
	},
	projects: [
		{ name: 'may-tinh', use: { ...devices['Desktop Chrome'], viewport: { width: 1360, height: 900 } } },
		{ name: 'dien-thoai', use: { ...devices['Pixel 7'] } }
	],
	webServer: {
		command: `npm run build && npx vite preview --port ${cong} --strictPort`,
		port: cong,
		reuseExistingServer: true,
		timeout: 240_000
	}
});
