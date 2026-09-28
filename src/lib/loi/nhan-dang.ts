// MediaPipe Holistic (Tasks Vision) tren trinh duyet: moi khung hinh -> 33 diem than
// + 21 diem moi ban tay. Dung Holistic (khong dung HandLandmarker rieng) vi:
//   - du lieu huan luyen VSL400 trich bang MediaPipe Holistic;
//   - Holistic gan tay TRAI / PHAI theo co the nguoi ky. HandLandmarker thi doan
//     "handedness" voi gia dinh anh da LAT GUONG -> tren anh camera that no bao
//     nguoc tay, day chinh la loi cua ban web truoc.
import type { HolisticLandmarker } from '@mediapipe/tasks-vision';
import { DUONG_DAN } from './duong-dan';

let mayHua: Promise<HolisticLandmarker> | null = null;
let tCuoi = 0;

async function coTep(url: string): Promise<boolean> {
	try {
		const r = await fetch(url, { method: 'HEAD' });
		const loai = r.headers.get('content-type') ?? '';
		return r.ok && !loai.includes('text/html');
	} catch {
		return false;
	}
}

/** Nap Holistic mot lan cho ca trang. Thu GPU truoc, CPU sau; tep tu phuc vu truoc, Google sau. */
export function napHolistic(): Promise<HolisticLandmarker> {
	if (!mayHua) {
		mayHua = (async () => {
			const { FilesetResolver, HolisticLandmarker } = await import('@mediapipe/tasks-vision');
			const fileset = await FilesetResolver.forVisionTasks(DUONG_DAN.mediapipeWasm);
			const nguon = (await coTep(DUONG_DAN.holisticTuPhucVu))
				? [DUONG_DAN.holisticTuPhucVu, DUONG_DAN.holisticGoogle]
				: [DUONG_DAN.holisticGoogle];
			let loi: unknown = null;
			for (const modelAssetPath of nguon) {
				for (const delegate of ['GPU', 'CPU'] as const) {
					try {
						return await HolisticLandmarker.createFromOptions(fileset, {
							baseOptions: { modelAssetPath, delegate },
							runningMode: 'VIDEO'
						});
					} catch (e) {
						loi = e;
					}
				}
			}
			throw loi ?? new Error('Khong nap duoc MediaPipe Holistic');
		})();
		mayHua.catch(() => (mayHua = null));
	}
	return mayHua;
}

/** Moc thoi gian (ms) TANG NGHIEM NGAT — che do VIDEO cua MediaPipe bat buoc vay. */
export function thoiDiemTang(): number {
	const t = Math.max(performance.now(), tCuoi + 1);
	tCuoi = t;
	return t;
}
