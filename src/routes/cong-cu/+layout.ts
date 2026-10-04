import { error } from '@sveltejs/kit';
import { CONG_CU_NHOM } from '$lib/cong-cu-nhom';

// Ban dua len web: khong dung san trang nay, mo vao thi bao "khong tim thay".
export const prerender = CONG_CU_NHOM;
export function load() {
	if (!CONG_CU_NHOM) error(404, 'Không tìm thấy trang');
}
