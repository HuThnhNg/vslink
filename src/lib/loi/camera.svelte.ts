// Mot phien camera: mo webcam -> MediaPipe tung khung -> ve khung xuong -> may trang
// thai cat doan -> giao doan ky hieu cho trang (Dich / Hoc / Do vui) cham.
//
// LAT GUONG: anh camera lay tu getUserMedia la anh THAT (khong lat). Chi LUC HIEN
// THI moi lat bang CSS (ca video lan canvas). MediaPipe va mo hinh luon thay anh
// that -> tay trai la tay trai, dung nhu du lieu huan luyen.
import type { HolisticLandmarker } from '@mediapipe/tasks-vision';
import { CatDoan, type KhungVao, type LyDoBo, type PhaCatDoan } from './cat-doan';
import { docTinHieu, khungTuHolistic, type KetQuaHolistic, type Khung, type TinHieu } from './diem';
import { ketQuaTuKhung, khungKichBan } from './gia-lap';
import { CAT_DOAN } from './hang-so';
import { napMoHinh } from './mo-hinh';
import { napHolistic, thoiDiemTang } from './nhan-dang';
import { veKhungXuong } from './ve';

export type TrangThaiCamera = 'tat' | 'dang-mo' | 'dang-nap' | 'chay' | 'loi';

export type SuKienCamera = {
	onBatDau?: () => void;
	/** Tra ve Promise: camera cho cham xong moi nghi roi nghe tiep. */
	onDoan?: (khung: KhungVao[], thoiLuong: number) => Promise<void> | void;
	onBo?: (lyDo: LyDoBo, thoiLuong: number) => void;
};

function moTaLoiCamera(e: unknown): string {
	const ten = (e as { name?: string })?.name ?? '';
	if (ten === 'NotAllowedError' || ten === 'SecurityError')
		return 'Bạn chưa cho phép dùng camera. Bấm vào biểu tượng ổ khoá cạnh thanh địa chỉ để cho phép, rồi thử lại nhé.';
	if (ten === 'NotFoundError' || ten === 'OverconstrainedError') return 'Không tìm thấy camera nào trên máy này.';
	if (ten === 'NotReadableError') return 'Camera đang được ứng dụng khác dùng (Zoom, Meet…). Tắt ứng dụng đó rồi thử lại nhé.';
	if (!navigator.mediaDevices?.getUserMedia)
		return 'Trình duyệt này không mở được camera. Hãy dùng Chrome, Edge hoặc Safari bản mới, và mở web bằng https.';
	return `Không mở được camera (${ten || String(e)}).`;
}

export class PhienCamera {
	trangThai = $state<TrangThaiCamera>('tat');
	loi = $state<string | null>(null);
	tinHieu = $state<TinHieu | null>(null);
	pha = $state<PhaCatDoan>('cho');
	fps = $state(0);
	/** giay tu luc bat dau ky (de ve vong tien trinh) */
	thoiGianKy = $state(0);
	giaLap = $state(false);
	kichThuoc = $state({ rong: 0, cao: 0 });
	/** dat true de tam ngung cat doan (vi du: dang xem ket qua) */
	tamDung = $state(false);

	private video: HTMLVideoElement | null = null;
	private canvas: HTMLCanvasElement | null = null;
	private stream: MediaStream | null = null;
	private cat = new CatDoan();
	private dangChay = false;
	private tBatDauKy = 0;
	private tTruoc = 0;
	private hen = 0;
	private henVideo = 0;

	constructor(private su: SuKienCamera = {}) {}

	get chamCham() {
		return this.trangThai === 'chay' && this.fps > 0 && this.fps < CAT_DOAN.fpsCanhBao;
	}

	async batDau(video: HTMLVideoElement, canvas: HTMLCanvasElement, { giaLap = false } = {}) {
		if (this.trangThai === 'dang-mo' || this.trangThai === 'dang-nap' || this.trangThai === 'chay') return;
		this.video = video;
		this.canvas = canvas;
		this.loi = null;
		this.giaLap = giaLap;
		this.fps = 0;
		this.cat.datLai();
		this.pha = 'cho';
		// nap san mo hinh ky hieu (14 MB) trong luc mo camera -> lan ky dau khong phai cho
		napMoHinh().catch(() => {});
		if (giaLap) {
			this.kichThuoc = { rong: 720, cao: 720 };
			this.trangThai = 'chay';
			this.dangChay = true;
			this.vongGiaLap();
			return;
		}
		this.trangThai = 'dang-mo';
		const holistic = napHolistic(); // nap song song voi luc mo camera
		holistic.catch(() => {});
		try {
			this.stream = await navigator.mediaDevices.getUserMedia({
				video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user', frameRate: { ideal: 30 } },
				audio: false
			});
			video.srcObject = this.stream;
			video.muted = true;
			video.playsInline = true;
			await video.play();
			this.kichThuoc = { rong: video.videoWidth, cao: video.videoHeight };
		} catch (e) {
			this.dung();
			this.trangThai = 'loi';
			this.loi = moTaLoiCamera(e);
			return;
		}
		this.trangThai = 'dang-nap';
		let may: HolisticLandmarker;
		try {
			may = await holistic;
		} catch {
			this.dung();
			this.trangThai = 'loi';
			this.loi = 'Không tải được mô hình nhận dạng dáng người (MediaPipe). Kiểm tra kết nối mạng rồi bấm thử lại nhé.';
			return;
		}
		if (this.trangThai !== 'dang-nap') return; // da bi tat trong luc cho
		this.trangThai = 'chay';
		this.dangChay = true;
		this.vong(may);
	}

	dung() {
		this.dangChay = false;
		if (typeof window === 'undefined') return;
		cancelAnimationFrame(this.hen);
		clearTimeout(this.hen);
		const v = this.video as (HTMLVideoElement & { cancelVideoFrameCallback?: (h: number) => void }) | null;
		if (v?.cancelVideoFrameCallback && this.henVideo) v.cancelVideoFrameCallback(this.henVideo);
		this.stream?.getTracks().forEach((t) => t.stop());
		this.stream = null;
		if (this.video) this.video.srcObject = null;
		if (this.canvas) this.canvas.getContext('2d')?.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.tinHieu = null;
		this.pha = 'cho';
		this.fps = 0;
		if (this.trangThai !== 'loi') this.trangThai = 'tat';
	}

	/** Bo qua doan dang ky do va cho tu dau (vi du khi doi tu can tap). */
	datLai() {
		this.cat.datLai();
		this.pha = 'cho';
		this.thoiGianKy = 0;
	}

	private vong(may: HolisticLandmarker) {
		const video = this.video as HTMLVideoElement & {
			requestVideoFrameCallback?: (cb: () => void) => number;
		};
		const buoc = () => {
			if (!this.dangChay) return;
			if (video.readyState >= 2 && video.videoWidth > 0) {
				const tMs = thoiDiemTang();
				try {
					const kq = may.detectForVideo(video, tMs) as unknown as KetQuaHolistic;
					this.xuLy(tMs / 1000, khungTuHolistic(kq, video.videoWidth, video.videoHeight), kq, video.videoWidth, video.videoHeight);
				} catch (e) {
					console.warn('[VSLink] MediaPipe loi mot khung:', e);
				}
			}
			keTiep();
		};
		const keTiep = () => {
			if (!this.dangChay) return;
			if (video.requestVideoFrameCallback) this.henVideo = video.requestVideoFrameCallback(buoc);
			else this.hen = requestAnimationFrame(buoc);
		};
		keTiep();
	}

	private vongGiaLap() {
		const buoc = () => {
			if (!this.dangChay) return;
			const t = thoiDiemTang() / 1000;
			const kp = khungKichBan(t);
			this.xuLy(t, kp, ketQuaTuKhung(kp), 720, 720);
			this.hen = window.setTimeout(buoc, 40); // 25 hinh/giay
		};
		buoc();
	}

	private xuLy(t: number, kp: Khung, kqVe: KetQuaHolistic, rong: number, cao: number) {
		if (this.tTruoc && t > this.tTruoc) {
			const f = 1 / (t - this.tTruoc);
			this.fps = this.fps ? this.fps * 0.9 + f * 0.1 : f;
		}
		this.tTruoc = t;
		if (this.canvas) {
			if (this.canvas.width !== rong || this.canvas.height !== cao) {
				this.canvas.width = rong;
				this.canvas.height = cao;
			}
			const ctx = this.canvas.getContext('2d');
			if (ctx) veKhungXuong(ctx, kqVe, { dauTron: this.giaLap });
		}
		const tinHieu = docTinHieu(kp);
		this.tinHieu = tinHieu;
		if (this.tamDung) return;
		const sk = this.cat.capNhat({ t, kp, tinHieu });
		this.pha = this.cat.pha;
		if (this.pha === 'dang-ky') this.thoiGianKy = t - this.tBatDauKy;
		if (!sk) return;
		if (sk.loai === 'bat-dau') {
			this.tBatDauKy = t;
			this.thoiGianKy = 0;
			this.su.onBatDau?.();
		} else if (sk.loai === 'bo') {
			this.su.onBo?.(sk.lyDo, sk.thoiLuong);
		} else {
			Promise.resolve()
				.then(() => this.su.onDoan?.(sk.khung, sk.thoiLuong))
				.catch((e) => console.error('[VSLink] cham loi:', e))
				.finally(() => {
					this.cat.xongCham(performance.now() / 1000);
					this.pha = this.cat.pha;
				});
		}
	}
}
