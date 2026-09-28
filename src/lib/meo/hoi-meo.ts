// Hoi Meo (LLM qua Cloudflare Worker). Khong co Worker / loi mang / het luot ->
// dung loi soan san. Nguoi hoc luon nhan duoc nhan xet.
import { DUONG_DAN } from '$lib/loi/duong-dan';
import type { DuKien } from '$lib/loi/danh-gia';
import { cauMeoMau } from './loi-meo';

type CauHinh = { meo_api?: string };
let cauHinhHua: Promise<CauHinh> | null = null;

/** static/cau-hinh.json — dan link Worker vao "meo_api" la Meo biet noi bang AI. */
export function napCauHinh(): Promise<CauHinh> {
	cauHinhHua ??= fetch(DUONG_DAN.cauHinh, { cache: 'no-cache' })
		.then((r) => (r.ok ? r.json() : {}))
		.catch(() => ({}));
	return cauHinhHua;
}

export type LoiMeo = { cau: string; nguon: 'ai' | 'mau' };

const tron = (x: number, n = 3) => Math.round(x * 10 ** n) / 10 ** n;

/** Chi gui du kien can thiet — khong gui hinh, khong gui keypoint. */
export function goiGon(d: DuKien) {
	return {
		tu_muc_tieu: d.tuMucTieu,
		muc_do: d.mucDo,
		xep_hang: d.xepHang,
		xac_suat: tron(d.xacSuat),
		tu_doan: d.tuDoan,
		xac_suat_tu_doan: tron(d.xacSuatTuDoan),
		top3: d.top5.slice(0, 3).map((t) => ({ tu: t.tu, p: tron(t.p) })),
		bo_phan: d.boPhan,
		giai_doan_lech_nhat: d.giaiDoanLechNhat,
		thoi_luong_giay: tron(d.chatLuong.thoiLuong, 2),
		ti_le_thay_tay_trai: tron(d.chatLuong.tiLeTayTrai, 2),
		ti_le_thay_tay_phai: tron(d.chatLuong.tiLeTayPhai, 2)
	};
}

export async function hoiMeo(d: DuKien, { choToiDa = 8000 } = {}): Promise<LoiMeo> {
	const { meo_api } = await napCauHinh();
	if (meo_api) {
		const ctrl = new AbortController();
		const hen = setTimeout(() => ctrl.abort(), choToiDa);
		try {
			const r = await fetch(meo_api, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ du_kien: goiGon(d) }),
				signal: ctrl.signal
			});
			if (r.ok) {
				const j = (await r.json()) as { loi_meo?: unknown };
				if (typeof j.loi_meo === 'string' && j.loi_meo.trim()) return { cau: j.loi_meo.trim(), nguon: 'ai' };
			}
		} catch {
			/* mat mang / qua gio: dung loi soan san */
		} finally {
			clearTimeout(hen);
		}
	}
	return { cau: cauMeoMau(d), nguon: 'mau' };
}
