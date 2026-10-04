// Dinh dang so kieu Viet Nam va cac cau thong bao dung chung cho Dich / Hoc / Do vui.
import type { ChatLuong } from './danh-gia';
import type { LyDoBo } from './cat-doan';

/** 0.8234 -> "82%"; rat nho / rat lon thi ghi "<1%", ">99%" cho khoi hieu lam. */
export function phanTram(p: number): string {
	if (!Number.isFinite(p)) return '–';
	if (p <= 0) return '0%';
	if (p >= 1) return '100%';
	if (p >= 0.995) return '>99%';
	if (p < 0.005) return '<1%';
	return `${Math.round(p * 100)}%`;
}

/** 1.25 -> "1,3 giây" */
export function soGiay(s: number): string {
	return `${s.toFixed(1).replace('.', ',')} giây`;
}

/** Ly do may cat doan bo mot lan ky (khong cham). */
export const LOI_BO: Record<LyDoBo, string> = {
	'qua-ngan': 'Động tác ngắn quá, Mèo chưa kịp nhìn. Ký chậm và rõ hơn một chút nhé.',
	'it-cu-dong': 'Mèo thấy tay giơ lên nhưng gần như đứng yên. Ký hiệu cần có cử động, bạn thử lại nhé.'
};

/** Nhac ve cach ghi hinh neu doan vua ky co van de ro rang. */
export function goiYGhiHinh(c: ChatLuong): string | null {
	if (c.tiLeNguoi < 0.6) return 'Mèo hay bị mất dấu bạn giữa chừng. Ngồi lùi ra một chút để camera thấy từ đầu đến bụng nhé.';
	if (Math.max(c.tiLeTayTrai, c.tiLeTayPhai) < 0.6)
		return 'Mèo ít khi thấy rõ bàn tay. Thêm chút ánh sáng phía trước mặt và để tay trong khung hình nhé.';
	if (c.fps > 0 && c.fps < 8) return 'Máy chạy hơi chậm nên Mèo nhìn được ít hình. Thử đóng bớt tab khác, hoặc dùng mục Tải video lên.';
	return null;
}
