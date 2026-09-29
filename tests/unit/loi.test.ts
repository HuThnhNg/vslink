import { describe, expect, it } from 'vitest';
import linspace from './linspace.json';
import { khungGia } from './gia-lap';
import { SO_DIEM, SO_LOP } from '../../src/lib/loi/hang-so';
import { docTinHieu, khungTuHolistic, veKhungHuanLuyen } from '../../src/lib/loi/diem';
import { chiSoLayMau, dongGoi } from '../../src/lib/loi/lay-mau';
import { CatDoan, type KhungVao, type SuKien } from '../../src/lib/loi/cat-doan';
import { BIEN_THE, danhGia, doChatLuong, taoBatchCheBot, topK, xepHang } from '../../src/lib/loi/danh-gia';

describe('lay 60 khung', () => {
	it('trung khit np.linspace(0, T-1, 60).astype(int)', () => {
		for (const [T, mong] of Object.entries(linspace)) expect(chiSoLayMau(Number(T))).toEqual(mong);
	});
	it('dong goi: 0 khung -> toan 0, 1 khung -> lap lai', () => {
		expect(dongGoi([]).every((v) => v === 0)).toBe(true);
		const k = khungGia();
		const x = dongGoi([k]);
		expect(x.length).toBe(60 * SO_DIEM * 2);
		expect(Array.from(x.subarray(59 * 150, 60 * 150))).toEqual(Array.from(k));
	});
});

describe('dua ve khung vuong huan luyen', () => {
	it('camera vuong: giu nguyen', () => {
		expect(veKhungHuanLuyen(0.3, 0.7, 1080, 1080)).toEqual([0.3, 0.7]);
	});
	it('camera 16:9 va 4:3: hai doan dai bang nhau tren anh van bang nhau sau khi doi', () => {
		for (const [W, H] of [[1280, 720], [640, 480], [720, 1280]]) {
			// doan ngang 100 px va doan doc 100 px
			const a = veKhungHuanLuyen(0.5, 0.5, W, H);
			const b = veKhungHuanLuyen(0.5 + 100 / W, 0.5, W, H);
			const c = veKhungHuanLuyen(0.5, 0.5 + 100 / H, W, H);
			expect(Math.abs(b[0] - a[0])).toBeCloseTo(Math.abs(c[1] - a[1]), 9);
			// ca khung hinh nam gon trong [0, 1]
			for (const [x, y] of [[0, 0], [1, 1]]) {
				const [u, v] = veKhungHuanLuyen(x, y, W, H);
				expect(u).toBeGreaterThanOrEqual(0);
				expect(v).toBeLessThanOrEqual(1);
			}
		}
	});
	it('khung tu Holistic: thieu nguoi -> toan 0; co nguoi thieu tay -> vung tay = 0', () => {
		expect(khungTuHolistic({}, 1280, 720).every((v) => v === 0)).toBe(true);
		const pose = Array.from({ length: 33 }, (_, i) => ({ x: 0.3 + i / 100, y: 0.4 }));
		const tay = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
		const k = khungTuHolistic({ poseLandmarks: [pose], rightHandLandmarks: [tay] }, 1280, 720);
		expect(k.subarray(33 * 2, 54 * 2).every((v) => v === 0)).toBe(true); // tay trai vang
		expect(k.subarray(54 * 2, 75 * 2).some((v) => v !== 0)).toBe(true);
		// 16:9 -> x giu nguyen, y co lai quanh 0,5
		expect(k[0]).toBeCloseTo(0.3, 6);
		expect(k[1]).toBeCloseTo((0.4 * 720 + 280) / 1280, 6);
	});
});

describe('tin hieu', () => {
	it('tay nang khi co tay cao hon muc giua vai - hong', () => {
		expect(docTinHieu(khungGia({ coTayPhai: [0.4, 0.5] })).tayNang).toBe(true);
		expect(docTinHieu(khungGia()).tayNang).toBe(false);
		expect(docTinHieu(khungGia({ nguoi: false })).coNguoi).toBe(false);
	});
});

// ---- may trang thai --------------------------------------------------------
type Buoc = { giay: number; tuThe: (t: number) => Parameters<typeof khungGia>[0] };

function chay(buoc: Buoc[], fps: number, cd = new CatDoan()) {
	const suKien: (SuKien & { t: number })[] = [];
	let t = 0;
	for (const b of buoc) {
		const het = t + b.giay;
		for (; t < het - 1e-9; t += 1 / fps) {
			const kp = khungGia(b.tuThe(t));
			const k: KhungVao = { t, kp, tinHieu: docTinHieu(kp) };
			const s = cd.capNhat(k);
			if (s) suKien.push({ ...s, t });
		}
	}
	return { suKien, cd };
}

const nghi = { giay: 1, tuThe: () => ({}) };
const ky = (giay: number) => ({
	giay,
	tuThe: (t: number) => ({ coTayPhai: [0.4 + 0.08 * Math.sin(t * 8), 0.45 + 0.05 * Math.cos(t * 8)] as [number, number] })
});
const haTay = { giay: 1.2, tuThe: () => ({}) };

describe('cat doan', () => {
	it('ky 1,5 giay roi ha tay -> mot doan, ly do ha tay', () => {
		const { suKien } = chay([nghi, ky(1.5), haTay], 30);
		expect(suKien.map((s) => s.loai)).toEqual(['bat-dau', 'doan']);
		const d = suKien[1] as Extract<SuKien, { loai: 'doan' }>;
		expect(d.lyDo).toBe('ha-tay');
		expect(d.thoiLuong).toBeGreaterThan(1.3);
		expect(d.thoiLuong).toBeLessThan(1.9);
	});
	it('khong phu thuoc toc do khung hinh (10 vs 30 hinh/giay)', () => {
		const a = chay([nghi, ky(1.5), haTay], 10).suKien.find((s) => s.loai === 'doan') as { thoiLuong: number };
		const b = chay([nghi, ky(1.5), haTay], 30).suKien.find((s) => s.loai === 'doan') as { thoiLuong: number };
		expect(Math.abs(a.thoiLuong - b.thoiLuong)).toBeLessThan(0.25);
	});
	it('ky qua ngan -> bo, bao ly do', () => {
		const { suKien } = chay([nghi, ky(0.2), haTay], 30);
		expect(suKien.at(-1)).toMatchObject({ loai: 'bo', lyDo: 'qua-ngan' });
	});
	it('tay nang nhung dung yen (chi rung nhe cua MediaPipe) -> khong kich hoat', () => {
		const rung = { giay: 3, tuThe: (t: number) => ({ coTayPhai: [0.4 + 0.002 * Math.sin(t * 50), 0.45] as [number, number] }) };
		for (const fps of [10, 30, 60]) expect(chay([rung], fps).suKien).toEqual([]);
	});
	it('gio tay len roi dung yen -> bao "it cu dong", khong cham', () => {
		const giu = { giay: 2, tuThe: () => ({ coTayPhai: [0.4, 0.45] as [number, number] }) };
		expect(chay([nghi, giu], 30).suKien.at(-1)).toMatchObject({ loai: 'bo' });
	});
	it('ky roi dung yen giua chung -> ket thuc vi dung yen, cat bo duoi dung yen', () => {
		const dung = { giay: 1.5, tuThe: () => ({ coTayPhai: [0.4, 0.45] as [number, number] }) };
		const { suKien } = chay([nghi, ky(1.2), dung], 30);
		const d = suKien.find((s) => s.loai === 'doan') as Extract<SuKien, { loai: 'doan' }>;
		expect(d.lyDo).toBe('dung-yen');
		expect(d.thoiLuong).toBeLessThan(1.7); // duoi 0,55 giay dung yen da bi cat
	});
	it('mat nguoi giua chung -> cat doan', () => {
		const mat = { giay: 1, tuThe: () => ({ nguoi: false }) };
		const { suKien } = chay([nghi, ky(1.0), mat], 30);
		expect(suKien.find((s) => s.loai === 'doan')).toMatchObject({ lyDo: 'mat-nguoi' });
	});
	it('dang cham thi bo qua khung moi; cham xong nghi 0,8 giay roi cho tiep', () => {
		const { suKien, cd } = chay([nghi, ky(1.5), haTay], 30);
		expect(suKien.at(-1)!.loai).toBe('doan');
		expect(cd.pha).toBe('dang-cham');
		cd.xongCham(10);
		expect(cd.pha).toBe('nghi');
		const kp = khungGia();
		cd.capNhat({ t: 10.5, kp, tinHieu: docTinHieu(kp) });
		expect(cd.pha).toBe('nghi');
		cd.capNhat({ t: 10.9, kp, tinHieu: docTinHieu(kp) });
		expect(cd.pha).toBe('cho');
	});
});

// ---- danh gia ---------------------------------------------------------------
describe('danh gia', () => {
	const nhan = Array.from({ length: SO_LOP }, (_, i) => `tu${i}`);
	const phanBo = (dinh: Record<number, number>) => {
		const p = new Float32Array(SO_LOP).fill(0.0001);
		for (const [i, v] of Object.entries(dinh)) p[Number(i)] = v;
		return p;
	};

	it('xep hang va top-k', () => {
		const p = phanBo({ 7: 0.5, 3: 0.3, 9: 0.1 });
		expect(xepHang(p, 7)).toBe(1);
		expect(xepHang(p, 9)).toBe(3);
		expect(topK(p, nhan, 3).map((d) => d.i)).toEqual([7, 3, 9]);
	});

	it('batch che bot: dung 7 bien the, dung vung bi xoa', () => {
		const khung = Array.from({ length: 40 }, (_, t) => khungGia({ coTayPhai: [0.4, 0.5 + t / 400] }));
		const b = taoBatchCheBot(khung);
		const moi = 60 * SO_DIEM * 2;
		expect(b.length).toBe(BIEN_THE.length * moi);
		const bien = (k: number) => b.subarray(k * moi, (k + 1) * moi);
		const vung = (x: Float32Array, a: number, c: number) =>
			Array.from({ length: 60 }, (_, t) => x.subarray((t * 75 + a) * 2, (t * 75 + c) * 2)).every((s) => s.every((v) => v === 0));
		expect(vung(bien(1), 33, 54)).toBe(true);
		expect(vung(bien(2), 54, 75)).toBe(true);
		expect(vung(bien(3), 13, 23)).toBe(true);
		expect(vung(bien(0), 54, 75)).toBe(false);
		// dung yen giai doan giua: khung 20..39 giong het khung 19
		const g = bien(5);
		const k19 = Array.from(g.subarray(19 * 150, 20 * 150));
		expect(Array.from(g.subarray(30 * 150, 31 * 150))).toEqual(k19);
	});

	it('bo tay phai ma xac suat tu muc tieu tang gap 3 -> tay phai lech nhieu; giai doan cuoi lech', () => {
		const probs = new Float32Array(BIEN_THE.length * SO_LOP);
		const dat = (b: number, p: Float32Array) => probs.set(p, b * SO_LOP);
		dat(0, phanBo({ 5: 0.4, 12: 0.05 })); // goc: doan tu5, muc tieu tu12 hang 2
		dat(1, phanBo({ 5: 0.4, 12: 0.02 })); // bo tay trai: muc tieu giam hon nua -> khop
		dat(2, phanBo({ 5: 0.2, 12: 0.15 })); // bo tay phai: muc tieu x3 -> lech nhieu
		dat(3, phanBo({ 5: 0.4, 12: 0.055 })); // bo canh tay: on
		dat(4, phanBo({ 5: 0.4, 12: 0.05 }));
		dat(5, phanBo({ 5: 0.4, 12: 0.06 }));
		dat(6, phanBo({ 5: 0.3, 12: 0.12 })); // dung yen doan cuoi -> muc tieu tang
		const cl = doChatLuong(Array.from({ length: 30 }, () => khungGia()), 1.5);
		const d = danhGia(probs, 12, nhan, cl);
		expect(d.mucDo).toBe('gan-dung');
		expect(d.xepHang).toBe(2);
		expect(d.tuDoan).toBe('tu5');
		expect(d.boPhan).toEqual({ tayTrai: 'khop', tayPhai: 'lech-nhieu', canhTay: 'on' });
		expect(d.giaiDoanLechNhat).toBe('cuoi');
	});

	it('mat dau tay tren 40 % so khung -> khong thay', () => {
		const khung = Array.from({ length: 30 }, (_, t) => khungGia({ coTayTrai: t < 20 ? null : [0.62, 0.8] }));
		const cl = doChatLuong(khung, 1);
		expect(cl.tiLeTayTrai).toBeCloseTo(10 / 30, 5);
		const probs = new Float32Array(BIEN_THE.length * SO_LOP).fill(1 / SO_LOP);
		expect(danhGia(probs, 0, nhan, cl).boPhan.tayTrai).toBe('khong-thay');
	});
});

import { describe as moTa, expect as mong, it as thu } from 'vitest';
import { khungGia as gia, ketQuaTuKhung } from './gia-lap';
import { docTinHieu as doc } from '../../src/lib/loi/diem';

moTa('ngoi sat camera (chi thay mat)', () => {
	thu('co tay doan bua ma khong thay ban tay -> KHONG tinh la gio tay', () => {
		const kp = gia({ coTayPhai: [0.4, 0.5], banTay: false });
		mong(doc(kp).tayNang).toBe(false);
	});
	thu('vai nam ngoai hinh / visibility thap -> khong tinh la thay nguoi', () => {
		const kp = gia({ coTayPhai: [0.4, 0.5] });
		const kq = ketQuaTuKhung(kp);
		kq.poseLandmarks![0][11] = { x: 0.6, y: 1.2, visibility: 0.9 };
		mong(doc(kp, kq).coNguoi).toBe(false);
		const kq2 = ketQuaTuKhung(kp);
		kq2.poseLandmarks![0][12] = { x: 0.4, y: 0.45, visibility: 0.2 };
		mong(doc(kp, kq2).coNguoi).toBe(false);
		mong(doc(kp, ketQuaTuKhung(kp)).coNguoi).toBe(true);
	});
});
