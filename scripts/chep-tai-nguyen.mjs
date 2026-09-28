// Chep cac tep .wasm tu node_modules vao static/ de web TU PHUC VU, khong phu
// thuoc CDN (jsdelivr) luc chay. Chay tu dong truoc `npm run dev` va `npm run build`.
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = join(dirname(fileURLToPath(import.meta.url)), '..');
const viec = [
	// MediaPipe Tasks Vision: ban SIMD va ban du phong khong-SIMD
	...['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js',
		'vision_wasm_nosimd_internal.wasm'].map((f) => [
		`node_modules/@mediapipe/tasks-vision/wasm/${f}`, `static/mediapipe/wasm/${f}`
	]),
	// ONNX Runtime Web, ban WebAssembly (mo hinh nho, khong can WebGPU)
	...['ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs'].map((f) => [
		`node_modules/onnxruntime-web/dist/${f}`, `static/ort/${f}`
	])
];

let chep = 0;
for (const [tu, den] of viec) {
	const a = join(goc, tu);
	const b = join(goc, den);
	if (!existsSync(a)) {
		console.error(`[tai-nguyen] thieu ${tu} — da chay "npm install" chua?`);
		process.exit(1);
	}
	if (existsSync(b) && statSync(b).size === statSync(a).size) continue;
	mkdirSync(dirname(b), { recursive: true });
	copyFileSync(a, b);
	chep += 1;
}
console.log(`[tai-nguyen] ${chep ? `da chep ${chep} tep` : 'da du, khong can chep'}`);
