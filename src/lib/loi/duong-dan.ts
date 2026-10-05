// Duong dan tai nguyen (phu thuoc base path cua SvelteKit).
import { base } from '$app/paths';

export const DUONG_DAN = {
	moHinh: `${base}/models/vsl400.onnx`,
	cauHinh: `${base}/cau-hinh.json`,
	videoMau: `${base}/du-lieu/video-mau.json`,
	// khung xuong mau (VSL400) cho tu chua co video: chi-muc.json + 000.bin ... 399.bin
	khungMau: `${base}/du-lieu/khung-mau`,
	kiemTra: `${base}/kiem-tra/vector.json`,
	viDuKiemTra: `${base}/kiem-tra/vi_du_kiem_tra.json`,
	// MediaPipe Holistic: uu tien tep tu phuc vu (GitHub Actions tai ve luc build),
	// khong co thi lay thang tu may chu cua Google.
	holisticTuPhucVu: `${base}/models/holistic_landmarker.task`,
	holisticGoogle:
		'https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/latest/holistic_landmarker.task',
	mediapipeWasm: `${base}/mediapipe/wasm`,
	ortWasm: `${base}/ort/`
} as const;
