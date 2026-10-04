// Gop y — phan thuan (khong phu thuoc SvelteKit), dung duoc trong unit test.
// web -> Worker ({"loai":"gop-y"}) -> Google Sheet cua nhom. Chi gui CHU, khong gui hinh hay toa do.
export type TheLoai = 'doan-sai' | 'cau-sai' | 'loi-web' | 'de-xuat' | 'khac';
export type TrangGopY = 'dich' | 'ghep-cau' | 'hoc' | 'do-vui' | 'tien-do' | 'gop-y' | 'khac';
export type NguCanh = { trang: TrangGopY; theLoai?: TheLoai; tuDoan?: string[]; cau?: string };

export const THE_LOAI: { ma: TheLoai; ten: string }[] = [
	{ ma: 'doan-sai', ten: 'Mèo đoán sai từ' },
	{ ma: 'cau-sai', ten: 'Câu ghép chưa đúng' },
	{ ma: 'loi-web', ten: 'Web bị lỗi' },
	{ ma: 'de-xuat', ten: 'Đề xuất tính năng' },
	{ ma: 'khac', ten: 'Khác' }
];

export type BanGopY = {
	theLoai: TheLoai;
	noiDung: string;
	dungRa?: string;
	lienHe?: string;
	nguoiDiec?: boolean;
	web?: string; // o bay chong spam: luon de trong
};

/** Du lieu gui Worker: chi chu, gioi han do dai. */
export function goiGonGopY(b: BanGopY, nc: NguCanh | null, trinhDuyet = '') {
	return {
		loai: 'gop-y' as const,
		the_loai: b.theLoai,
		noi_dung: b.noiDung.trim().slice(0, 2000),
		dung_ra: (b.dungRa ?? '').trim().slice(0, 200),
		lien_he: (b.lienHe ?? '').trim().slice(0, 200),
		nguoi_diec: Boolean(b.nguoiDiec),
		web: b.web ?? '',
		ngu_canh: { trang: nc?.trang ?? 'gop-y', tu_doan: (nc?.tuDoan ?? []).slice(0, 12), cau: (nc?.cau ?? '').slice(0, 300) },
		trinh_duyet: trinhDuyet.slice(0, 200)
	};
}

export type KetQuaGui = { ok: true } | { ok: false; lyDo: 'chua-cai-dat' | 'qua-nhieu' | 'loi' };

export async function guiGopY(
	b: BanGopY,
	nc: NguCanh | null,
	{ api, trinhDuyet = '', choToiDa = 15000 }: { api?: string; trinhDuyet?: string; choToiDa?: number } = {}
): Promise<KetQuaGui> {
	if (!api) return { ok: false, lyDo: 'chua-cai-dat' };
	const ctrl = new AbortController();
	const hen = setTimeout(() => ctrl.abort(), choToiDa);
	try {
		const r = await fetch(api, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(goiGonGopY(b, nc, trinhDuyet)),
			signal: ctrl.signal
		});
		if (r.ok) return { ok: true };
		return { ok: false, lyDo: r.status === 503 ? 'chua-cai-dat' : r.status === 429 ? 'qua-nhieu' : 'loi' };
	} catch {
		return { ok: false, lyDo: 'loi' };
	} finally {
		clearTimeout(hen);
	}
}
