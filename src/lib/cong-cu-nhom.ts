// Cong cu chi danh cho nhom phat trien (/kiem-tra/, /cong-cu/...): KHONG co trong ban dua len web.
// Mo duoc khi: chay tren may (npm run dev), hoac build voi VITE_CONG_CU_NHOM=1 (kiem thu e2e).
// Day la an di cho gon, khong phai bao mat: web tinh + repo cong khai, va cac trang nay
// khong chua gi bi mat (key Gemini nam trong Worker).
import { dev } from '$app/environment';

export const CONG_CU_NHOM = dev || import.meta.env.VITE_CONG_CU_NHOM === '1';
