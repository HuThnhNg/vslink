import { afterEach, describe, expect, it, vi } from 'vitest';
import { giaiMaKhung, napKhungMau, tuTheTai, type KhungMau } from '../../src/lib/loi/khung-mau';

/** Ma hoa giong o Kaggle (nghien-cuu/khung-mau/xuat_khung_mau_kaggle.py: ma_hoa). */
function maHoa(xy: number[][][], tiLe = 10000): ArrayBuffer {
	const T = xy.length;
	const buf = new ArrayBuffer(T * 75 * 4);
	const v = new DataView(buf);
	for (let t = 0; t < T; t++)
		for (let j = 0; j < 75; j++) {
			const [x, y] = xy[t][j];
			v.setInt16((t * 75 + j) * 4, Math.round(x * tiLe), true);
			v.setInt16((t * 75 + j) * 4 + 2, Math.round(y * tiLe), true);
		}
	return buf;
}

/** Hai khung: khung 0 co tay phai o (0,3; 0,5), khung 1 o (0,5; 0,3); tay trai chi co o khung 1. */
function haiKhung(): number[][][] {
	return [0, 1].map((t) =>
		Array.from({ length: 75 }, (_, j) => {
			if (j === 16) return t === 0 ? [0.3, 0.5] : [0.5, 0.3];
			if (j >= 54) return t === 0 ? [0.3 + 0.001 * (j - 54), 0.5] : [0.5 + 0.001 * (j - 54), 0.3];
			if (j >= 33) return t === 0 ? [0, 0] : [0.7, 0.7];
			if (j === 0) return [0.5, 0.25];
			return [0.4 + 0.002 * j, 0.5];
		})
	);
}

function khungTu(xy: number[][][]): KhungMau {
	const g = giaiMaKhung(maHoa(xy), xy.length, 75, 10000)!;
	return { soKhung: xy.length, soDiem: 75, ...g, giay: 1, muc: { kiem_chung: true, giay: 1 } };
}

describe('khung xuong mau', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('giai ma int16: dung toa do, (0, 0) = khong bat duoc; sai kich thuoc -> null', () => {
		const g = giaiMaKhung(maHoa(haiKhung()), 2, 75, 10000)!;
		expect(g.xy[16 * 2]).toBeCloseTo(0.3, 4);
		expect(g.co[33]).toBe(0); // tay trai khung 0
		expect(g.co[75 + 33]).toBe(1);
		expect(giaiMaKhung(new ArrayBuffer(10), 2, 75, 10000)).toBeNull();
	});

	it('noi suy giua hai khung; diem chi co o mot khung -> lay khung gan hon', () => {
		const k = khungTu(haiKhung());
		const giua = tuTheTai(k, 0.5);
		expect(giua.poseLandmarks![0][16].x).toBeCloseTo(0.4, 4);
		expect(giua.poseLandmarks![0][16].y).toBeCloseTo(0.4, 4);
		expect(giua.rightHandLandmarks![0]).toHaveLength(21);
		// tay trai chi co o khung 1: u = 0,25 (gan khung 0) -> chua hien; u = 0,75 -> hien
		expect(tuTheTai(k, 0.25).leftHandLandmarks).toEqual([]);
		const trai = tuTheTai(k, 0.75).leftHandLandmarks![0][0];
		expect(trai.x).toBeCloseTo(0.7, 4);
		expect(trai.y).toBeCloseTo(0.7, 4);
		// u ngoai 0..1 bi kep lai
		expect(tuTheTai(k, -1).poseLandmarks![0][16].x).toBeCloseTo(0.3, 4);
		expect(tuTheTai(k, 2).poseLandmarks![0][16].x).toBeCloseTo(0.5, 4);
	});

	it('chi nap tu da kiem chung; chua co du lieu (404) -> null', async () => {
		const bin = maHoa(haiKhung());
		const f = vi.fn(async (url: string) => {
			if (url.endsWith('chi-muc.json'))
				return new Response(
					JSON.stringify({
						phien_ban: 1,
						so_khung: 2,
						so_diem: 75,
						ti_le: 10000,
						tu: { '7': { kiem_chung: true, giay: 1.8, so_mau: 60 }, '8': { kiem_chung: false, giay: 2 } }
					})
				);
			if (url.endsWith('/007.bin')) return new Response(bin);
			return new Response('', { status: 404 });
		});
		vi.stubGlobal('fetch', f);
		const k = await napKhungMau(7);
		expect(k).toMatchObject({ soKhung: 2, giay: 1.8 });
		expect(await napKhungMau(8)).toBeNull(); // chua kiem chung -> khong hien
		expect(await napKhungMau(9)).toBeNull(); // khong co trong chi muc
		expect(f.mock.calls.map((c) => String(c[0])).filter((u) => u.endsWith('.bin'))).toEqual([
			expect.stringMatching(/\/du-lieu\/khung-mau\/007\.bin$/)
		]);
	});
});
