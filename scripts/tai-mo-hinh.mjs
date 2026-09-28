// Tai mo hinh MediaPipe Holistic ve static/models/ de web tu phuc vu.
// Khong tai cung khong sao: web se lay thang tu may chu cua Google luc chay.
// GitHub Actions goi script nay truoc khi build (xem .github/workflows/dua-len-pages.yml).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL_MO_HINH =
	'https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/latest/holistic_landmarker.task';
const dich = join(dirname(fileURLToPath(import.meta.url)), '..', 'static/models/holistic_landmarker.task');

if (existsSync(dich)) {
	console.log('[mo-hinh] da co holistic_landmarker.task');
	process.exit(0);
}
try {
	const r = await fetch(URL_MO_HINH);
	if (!r.ok) throw new Error(`HTTP ${r.status}`);
	const buf = Buffer.from(await r.arrayBuffer());
	if (buf.length < 1_000_000) throw new Error(`tep qua nho (${buf.length} byte)`);
	mkdirSync(dirname(dich), { recursive: true });
	writeFileSync(dich, buf);
	console.log(`[mo-hinh] da tai ${(buf.length / 1e6).toFixed(1)} MB`);
} catch (e) {
	console.warn(`[mo-hinh] khong tai duoc (${e.message}) — web se lay tu Google luc chay.`);
}
