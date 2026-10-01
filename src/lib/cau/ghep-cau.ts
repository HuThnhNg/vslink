// Ghep cau: nguoi ky tung tu (ha tay giua cac tu) -> day top-3 cua moi tu -> mot cau tieng Viet.
// Co Worker (static/cau-hinh.json "meo_api") -> Gemini chon tu hop ngu canh va dao trat tu
// NNKH (Chu - Tan - Dong tu) sang tieng Viet (Chu - Dong tu - Tan). Khong co Worker / loi mang
// -> noi top-1 theo thu tu ky. Chi gui TU va XAC SUAT, khong gui hinh hay toa do.
// Thiet ke va danh gia: nghien-cuu/ghep-cau/ (Spotter+GPT, HyPoradise, SignAlignLM...).
import type { DuDoan } from '$lib/loi/danh-gia';

export const TOI_DA_TU = 12; // Worker cung gioi han 12 vi tri
export const SO_UNG_VIEN = 3;

export type TuTrongCau = { id: number; ungVien: DuDoan[] };
export type KetQuaCau = { cau: string; chon: string[]; nguon: 'ai' | 'noi' };

const RIENG = ['Việt Nam', 'Nhật Bản', 'Hàn Quốc', 'Trung Quốc', 'Thái Lan', 'Mỹ'];

/** Nhan -> chu trong cau: bo phan trong ngoac, viet thuong (tru ten rieng). Giong tu_loai.chu (Python). */
export function chuTrongCau(nhan: string): string {
	const s = nhan.replace(/\s*\(.*?\)/g, '').trim();
	if (RIENG.includes(s) || /^(Ngày|Tết|Trung thu|Giáng sinh)/.test(s)) return s;
	return s.toLowerCase();
}

function vietHoa(s: string): string {
	const t = s.replace(/\s+/g, ' ').trim();
	return t ? t[0].toUpperCase() + t.slice(1) + '.' : '';
}

/** Du phong: noi top-1 theo dung thu tu ky (chua doi trat tu). */
export function noiTu(ds: TuTrongCau[]): string {
	return vietHoa(ds.map((t) => chuTrongCau(t.ungVien[0].tu)).join(' '));
}

export function themTu(ds: TuTrongCau[], top: DuDoan[], id = Date.now()): TuTrongCau[] {
	if (!top.length || ds.length >= TOI_DA_TU) return ds;
	return [...ds, { id, ungVien: top.slice(0, SO_UNG_VIEN) }];
}

const tron = (x: number) => Math.round(x * 1000) / 1000;

/** Du lieu gui Worker: chi tu + xac suat. */
export function goiGonCau(ds: TuTrongCau[]) {
	return {
		loai: 'cau' as const,
		vi_tri: ds.slice(0, TOI_DA_TU).map((t) => t.ungVien.slice(0, SO_UNG_VIEN).map((u) => ({ tu: u.tu, p: tron(u.p) })))
	};
}

/** Tu ma Gemini chon KHAC top-1 (de bao "Meo doi Nuong -> Nau cho hop nghia"). */
export function tuDaDoi(ds: TuTrongCau[], chon: string[]): { tu: string; thay: string }[] {
	const ra: { tu: string; thay: string }[] = [];
	for (const t of ds) {
		const dau = t.ungVien[0].tu;
		if (chon.includes(dau)) continue;
		const moi = t.ungVien.slice(1).find((u) => chon.includes(u.tu));
		if (moi) ra.push({ tu: moi.tu, thay: dau });
	}
	return ra;
}

export async function ghepCau(
	ds: TuTrongCau[],
	{ api, choToiDa = 12000 }: { api?: string; choToiDa?: number } = {}
): Promise<KetQuaCau> {
	const duPhong: KetQuaCau = { cau: noiTu(ds), chon: ds.map((t) => t.ungVien[0].tu), nguon: 'noi' };
	if (!ds.length) return { ...duPhong, cau: '' };
	if (!api) return duPhong;
	const ctrl = new AbortController();
	const hen = setTimeout(() => ctrl.abort(), choToiDa);
	try {
		const r = await fetch(api, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(goiGonCau(ds)),
			signal: ctrl.signal
		});
		if (r.ok) {
			const j = (await r.json()) as { cau?: unknown; chon?: unknown };
			if (typeof j.cau === 'string' && j.cau.trim()) {
				const chon = Array.isArray(j.chon) ? j.chon.filter((x): x is string => typeof x === 'string') : [];
				return { cau: j.cau.trim(), chon, nguon: 'ai' };
			}
		}
	} catch {
		/* mat mang / qua gio -> noi tu */
	} finally {
		clearTimeout(hen);
	}
	return duPhong;
}
