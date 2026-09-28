// Chay mo hinh VSL400 (ONNX) ngay tren trinh duyet bang ONNX Runtime Web (WebAssembly).
// Mo hinh nho (3,5 trieu tham so, ~4 ms/video tren CPU) nen khong can WebGPU.
// Chuan hoa SPOTER nam SAN trong tep .onnx: chi can dua toa do tho [B, 60, 75, 2].
import type { InferenceSession } from 'onnxruntime-web';
import { DUONG_DAN } from './duong-dan';
import { SO_DIEM, SO_KHUNG, SO_LOP } from './hang-so';

type Ort = typeof import('onnxruntime-web');

let ortHua: Promise<Ort> | null = null;
let phienHua: Promise<InferenceSession> | null = null;
let hangDoi: Promise<unknown> = Promise.resolve();

function napOrt(): Promise<Ort> {
	ortHua ??= import('onnxruntime-web/wasm').then((ort) => {
		ort.env.wasm.wasmPaths = DUONG_DAN.ortWasm; // tu phuc vu, khong lay CDN
		ort.env.wasm.numThreads = 1; // GitHub Pages khong bat cross-origin isolation
		ort.env.logLevel = 'error';
		return ort as unknown as Ort;
	});
	return ortHua;
}

/** Nap mo hinh mot lan, dung chung cho moi trang. Loi thi lan sau thu lai. */
export function napMoHinh(): Promise<InferenceSession> {
	if (!phienHua) {
		phienHua = napOrt().then((ort) =>
			ort.InferenceSession.create(DUONG_DAN.moHinh, {
				executionProviders: ['wasm'],
				graphOptimizationLevel: 'all'
			})
		);
		phienHua.catch(() => (phienHua = null));
	}
	return phienHua;
}

/**
 * dauVao: [B, 60, 75, 2] phang. Tra ve xac suat [B, 400] phang (da softmax).
 * Cac lan goi duoc xep hang doi — ONNX Runtime Web khong cho chay chong len nhau.
 */
export function chayMoHinh(dauVao: Float32Array): Promise<Float32Array> {
	const viec = hangDoi.then(async () => {
		const [ort, phien] = await Promise.all([napOrt(), napMoHinh()]);
		const B = dauVao.length / (SO_KHUNG * SO_DIEM * 2);
		if (!Number.isInteger(B) || B < 1) throw new Error(`Dau vao sai kich thuoc: ${dauVao.length}`);
		const ra = await phien.run({ keypoints: new ort.Tensor('float32', dauVao, [B, SO_KHUNG, SO_DIEM, 2]) });
		const p = ra.probs.data as Float32Array;
		if (p.length !== B * SO_LOP) throw new Error(`Dau ra sai kich thuoc: ${p.length}`);
		return p;
	});
	hangDoi = viec.catch(() => undefined);
	return viec;
}
