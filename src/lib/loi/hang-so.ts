// Hang so thuan (khong phu thuoc SvelteKit) — dung duoc ca trong unit test.

// ---- Dau vao mo hinh (xem tien_xu_ly.json cua notebook) --------------------
export const SO_KHUNG = 60;
export const SO_DIEM = 75; // 33 pose + 21 tay trai + 21 tay phai
export const SO_LOP = 400;

// Du lieu VSL400 quay khung VUONG (1080 x 1080). Suy ra tu chinh keypoint: ti le
// (vai -> hong) / (be ngang vai) trong toa do chuan hoa chi hop ly khi rong = cao.
// Webcam thuong 16:9 hoac 4:3 -> phai dua toa do ve khung vuong, neu khong hinh
// dang nguoi bi keo dan theo chieu ngang va mo hinh doan sai.
export const TI_LE_KHUNG_HUAN_LUYEN = 1; // rong / cao

// ---- May trang thai cat doan: moi nguong tinh bang GIAY, khong bang so khung
// (bai hoc cua ban Gradio truoc: dem khung thi phu thuoc toc do may).
export const CAT_DOAN = {
	tocNguong: 0.3, // be-ngang-vai / giay; duoi muc nay coi la dung yen
	giayYen: 0.55, // dung yen bao lau thi het ky hieu
	giayHa: 0.2, // tay ha bao lau thi het ky hieu
	giayMat: 0.6, // mat dau nguoi bao lau thi cat doan
	giayToiThieu: 0.45, // doan ngan hon: bo
	giayDong: 0.35, // trong doan phai co ngan nay giay cu dong that
	giayToiDa: 6.0, // tran an toan
	giayNghi: 0.8, // nghi sau khi cham
	giayDemTruoc: 0.25, // giu san truoc luc kich hoat (may chi biet da bat dau khi da thay dong)
	giayDuoi: 0.1, // chua lai sau cu dong cuoi cung
	khungToiThieu: 5,
	fpsCanhBao: 6 // duoi muc nay: bao may cham, goi y tai video len
} as const;

// ---- Danh gia bai tap --------------------------------------------------------
export const DANH_GIA = {
	hangDung: 1, // hang 1 = dung
	hangGanDung: 5, // hang 2..5 = gan dung
	nguongChuaChac: 0.35, // Thong dich: xac suat top-1 duoi muc nay -> "chua chac"
	// Phan tich che bot (occlusion): ti so xac suat tu muc tieu khi bo mot phan
	lechNhieu: Math.log(2), // bo phan do di ma xac suat tang gap doi -> lech nhieu
	hoiLech: Math.log(1.3),
	hopMau: -Math.log(2), // bo di ma xac suat giam mot nua -> phan nay khop mau
	xacSuatToiThieu: 0.02,
	tayVangNhieu: 0.4 // mat dau tay tren 40 % so khung -> canh bao ghi hinh
} as const;
