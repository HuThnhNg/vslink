// Ghi ket qua thuc nghiem theo ma: web -> Worker ({"loai":"thuc-nghiem"}) -> Apps Script -> tab
// "Thực nghiệm" cua Google Sheet. Chi gui CHU va SO (khong hinh, khong toa do).
// Moi dong duoc luu vao may truoc (localStorage) roi moi gui: mat mang thi gui lai sau, va cuoi
// buoi tai ve duoc toan bo du lieu tren may lam ban du phong.
import { PHIEN_BAN_THUC_NGHIEM, type Bo, type NguoiThamGia } from './kich-ban';

export type SuKien = 'bat-dau' | 'thiet-bi' | 'tra-loi' | 'ky' | 'bo-qua' | 'cam-nhan' | 'het-buoc' | 'rut-lui';

export type DongGhi = {
	ma: string;
	phan: string;
	nhom: number | null;
	buoc: string;
	su_kien: SuKien;
	bo: Bo | '';
	phan_hoi: boolean | null;
	/** tu muc tieu */
	tu: string;
	/** dap an da chon (bai nhan dien) hoac tu mo hinh doan hang 1 (khi ky) */
	tra_loi: string;
	dung: boolean | null;
	/** hang cua tu muc tieu trong 400 tu (1 = dung) */
	hang: number | null;
	muc_do: string;
	top5: string;
	/** cau cam nhan: so thu tu cau (1..) va diem 1..7 */
	cau_hoi: number | null;
	diem: number | null;
	/** lan ky thu may cua tu nay trong buoc */
	lan: number | null;
	/** thoi gian (ms): tra loi / do dai buoc / thoi luong lan ky */
	ms: number | null;
	thiet_bi: string;
	fps: number | null;
	phien_ban: string;
	thoi_diem: string;
};

export function taoDong(
	n: NguoiThamGia,
	buoc: string,
	suKien: SuKien,
	them: Partial<Omit<DongGhi, 'ma' | 'phan' | 'nhom' | 'buoc' | 'su_kien'>> = {},
	bayGio: Date = new Date()
): DongGhi {
	return {
		ma: n.ma,
		phan: n.phan,
		nhom: n.nhom,
		buoc,
		su_kien: suKien,
		bo: '',
		phan_hoi: null,
		tu: '',
		tra_loi: '',
		dung: null,
		hang: null,
		muc_do: '',
		top5: '',
		cau_hoi: null,
		diem: null,
		lan: null,
		ms: null,
		thiet_bi: '',
		fps: null,
		phien_ban: PHIEN_BAN_THUC_NGHIEM,
		...them,
		thoi_diem: bayGio.toISOString()
	};
}

/** Mo ta thiet bi ngan gon (khong dinh danh ca nhan): trinh duyet, he dieu hanh, man hinh, so nhan CPU. */
export function moTaThietBi(nav: Pick<Navigator, 'userAgent' | 'hardwareConcurrency'> & { deviceMemory?: number }, manHinh?: { width: number; height: number }) {
	const ua = nav.userAgent;
	const trinhDuyet = /Edg\/(\d+)/.exec(ua)
		? `Edge ${/Edg\/(\d+)/.exec(ua)![1]}`
		: /Chrome\/(\d+)/.exec(ua)
			? `Chrome ${/Chrome\/(\d+)/.exec(ua)![1]}`
			: /Firefox\/(\d+)/.exec(ua)
				? `Firefox ${/Firefox\/(\d+)/.exec(ua)![1]}`
				: /Version\/(\d+).*Safari/.exec(ua)
					? `Safari ${/Version\/(\d+)/.exec(ua)![1]}`
					: 'Khác';
	const heDieuHanh = /Windows/.test(ua)
		? 'Windows'
		: /Android/.test(ua)
			? 'Android'
			: /iPhone|iPad/.test(ua)
				? 'iOS'
				: /Mac OS X/.test(ua)
					? 'macOS'
					: /Linux/.test(ua)
						? 'Linux'
						: 'Khác';
	const phan = [trinhDuyet, heDieuHanh];
	if (manHinh) phan.push(`${manHinh.width}×${manHinh.height}`);
	if (nav.hardwareConcurrency) phan.push(`${nav.hardwareConcurrency} nhân`);
	if (nav.deviceMemory) phan.push(`${nav.deviceMemory} GB`);
	return phan.join(' · ');
}

/** Goi tin gui Worker: toi da 40 dong mot lan. */
export const TOI_DA_MOT_LAN = 40;
export function goiTin(dong: DongGhi[]) {
	return { loai: 'thuc-nghiem' as const, dong: dong.slice(0, TOI_DA_MOT_LAN) };
}

// ---------------------------------------------------------------------------
// Hang doi tren trinh duyet
// ---------------------------------------------------------------------------
const KHOA_CHO = 'vslink-tn-cho-gui';
const KHOA_LUU = 'vslink-tn-tat-ca';

type Kho = Pick<Storage, 'getItem' | 'setItem'>;

function doc(kho: Kho | null, khoa: string): DongGhi[] {
	try {
		const d = JSON.parse(kho?.getItem(khoa) ?? '[]');
		return Array.isArray(d) ? d : [];
	} catch {
		return [];
	}
}
function viet(kho: Kho | null, khoa: string, ds: DongGhi[]) {
	try {
		kho?.setItem(khoa, JSON.stringify(ds));
	} catch {
		/* day bo nho: van con ban trong RAM va ban da gui */
	}
}

export type TrangThaiGui = { choGui: number; daLuu: number; loi: string | null };

export class HangDoi {
	trangThai: TrangThaiGui = { choGui: 0, daLuu: 0, loi: null };
	private dangGui = false;
	private hen: ReturnType<typeof setTimeout> | null = null;

	constructor(
		private api: () => Promise<string | undefined>,
		private kho: Kho | null = typeof localStorage === 'undefined' ? null : localStorage,
		private onDoi: (t: TrangThaiGui) => void = () => {}
	) {
		this.capNhat();
	}

	private capNhat(loi: string | null = this.trangThai.loi) {
		this.trangThai = { choGui: doc(this.kho, KHOA_CHO).length, daLuu: doc(this.kho, KHOA_LUU).length, loi };
		this.onDoi(this.trangThai);
	}

	ghi(d: DongGhi) {
		viet(this.kho, KHOA_LUU, [...doc(this.kho, KHOA_LUU), d]);
		viet(this.kho, KHOA_CHO, [...doc(this.kho, KHOA_CHO), d]);
		this.capNhat();
		void this.gui();
	}

	/** Gui het hang doi (tung goi 40 dong). Loi thi thu lai sau 10 giay. */
	async gui(): Promise<void> {
		if (this.dangGui) return;
		this.dangGui = true;
		try {
			const api = await this.api();
			if (!api) {
				this.capNhat('Chưa cài link Worker (cau-hinh.json): kết quả chỉ lưu trên máy này, nhớ tải về cuối buổi.');
				return;
			}
			for (;;) {
				const cho = doc(this.kho, KHOA_CHO);
				if (!cho.length) break;
				const goi = cho.slice(0, TOI_DA_MOT_LAN);
				const r = await fetch(api, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(goiTin(goi))
				});
				if (!r.ok) throw new Error(`Worker trả lời ${r.status}`);
				// chi xoa nhung dong vua gui (trong luc gui co the da co dong moi)
				viet(this.kho, KHOA_CHO, doc(this.kho, KHOA_CHO).slice(goi.length));
			}
			this.capNhat(null);
		} catch (e) {
			this.capNhat(`Chưa gửi được (${e instanceof Error ? e.message : String(e)}), web sẽ tự gửi lại.`);
			if (this.hen) clearTimeout(this.hen);
			this.hen = setTimeout(() => void this.gui(), 10_000);
		} finally {
			this.dangGui = false;
		}
	}

	/** Toan bo dong da ghi tren may nay (moi nguoi tham gia), de tai ve du phong. */
	tatCa(): DongGhi[] {
		return doc(this.kho, KHOA_LUU);
	}
}

const COT: (keyof DongGhi)[] = [
	'thoi_diem', 'ma', 'phan', 'nhom', 'buoc', 'su_kien', 'bo', 'phan_hoi', 'tu', 'tra_loi', 'dung', 'hang', 'muc_do',
	'top5', 'cau_hoi', 'diem', 'lan', 'ms', 'thiet_bi', 'fps', 'phien_ban'
];

/** CSV (UTF-8, co BOM de Excel doc dung dau tieng Viet). */
export function sangCsv(ds: DongGhi[]): string {
	const o = (x: unknown) => {
		const s = x === null || x === undefined ? '' : String(x);
		return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
	};
	return '﻿' + [COT.join(','), ...ds.map((d) => COT.map((c) => o(d[c])).join(','))].join('\n');
}
