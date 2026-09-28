// Loi nhan xet cua Meo SOAN SAN tu du kien do duoc. Dung khi chua cau hinh LLM,
// khi mat mang hoac het luot — Meo khong bao gio "cam". Thuan logic, unit test duoc.
import type { DanhGiaPhan, DuKien, GiaiDoan, Phan } from '$lib/loi/danh-gia';

export type TamTrang = 'cho' | 'nghe' | 'suy-nghi' | 'vui' | 'co-vu' | 'boi-roi' | 'ngu';

const PHAN_TRAM = (p: number) => `${Math.round(p * 100)}%`;
const TEN_TAY: Record<Phan, string> = { tayTrai: 'bàn tay trái', tayPhai: 'bàn tay phải', canhTay: 'cánh tay' };
const TEN_GIAI_DOAN: Record<GiaiDoan, string> = { dau: 'đoạn đầu', giua: 'đoạn giữa', cuoi: 'đoạn cuối' };

function chon<T>(ds: T[], r: () => number): T {
	return ds[Math.floor(r() * ds.length) % ds.length];
}

const MO_DAU = {
	dung: [
		'Gâu gâu! Đúng rồi — Mèo nhận ra “{tu}” ngay ({p})!',
		'Chuẩn không cần chỉnh! Đây chính là “{tu}” ({p}) nè.',
		'Tuyệt quá! Mèo chắc {p} bạn vừa ký “{tu}”.'
	],
	'gan-dung': [
		'Gần đúng rồi nè! “{tu}” đang đứng thứ {hang}, Mèo hơi nghiêng về “{doan}”.',
		'Sắp được rồi! Mèo phân vân giữa “{tu}” (hạng {hang}) và “{doan}”.',
		'Ồ, suýt nữa! “{tu}” xếp thứ {hang} — Mèo đang đoán “{doan}” trước.'
	],
	'chua-dung': [
		'Hmm, Mèo chưa nhận ra “{tu}” — động tác này giống “{doan}” hơn.',
		'Chưa giống lắm đâu nha: Mèo đoán ra “{doan}”, còn “{tu}” đứng thứ {hang}/400.',
		'Mèo nghiêng đầu mất rồi… Mèo thấy giống “{doan}” hơn “{tu}”.'
	]
} as const;

const KET = {
	dung: ['Làm thêm từ khác cùng Mèo không?', 'Bạn giỏi ghê, tiếp tục nhé!', 'Ghi điểm cho bạn nè!'],
	'gan-dung': ['Thử lại một lần nữa là được thôi!', 'Xem lại video mẫu rồi làm lại nha, Mèo đợi.'],
	'chua-dung': ['Mình xem lại video mẫu chậm một chút rồi thử lại nhé.', 'Không sao đâu, ai mới học cũng vậy mà!']
} as const;

function goiYPhan(ten: Phan, d: DanhGiaPhan): string | null {
	// "khong-thay" chi la it thay tay do trong khung hinh: tu chi dung mot tay thi
	// tay kia ha xuong la binh thuong -> chi nhac nhe, khong coi la loi.
	if (d === 'khong-thay')
		return `Mèo ít thấy ${TEN_TAY[ten]} trong khung hình — nếu từ này cần tay đó, nhớ để tay lọt vào camera nhé.`;
	if (ten === 'canhTay') {
		if (d === 'lech-nhieu') return 'Vị trí và đường đi của tay còn khác mẫu nhiều: để ý tay đặt ở đâu so với người và di chuyển theo hướng nào.';
		if (d === 'hoi-lech') return 'Vị trí tay hơi khác mẫu một chút.';
		return null;
	}
	if (d === 'lech-nhieu') return `Hình dạng ${TEN_TAY[ten]} khác mẫu khá nhiều — xem kỹ các ngón ở video mẫu nha.`;
	if (d === 'hoi-lech') return `Hình dạng ${TEN_TAY[ten]} hơi khác mẫu một chút.`;
	return null;
}

/** Cac y quan trong nhat, theo thu tu: phan lech nhieu -> hoi lech -> it thay tay -> giai doan -> toc do. */
export function cacY(d: DuKien): string[] {
	const y: string[] = [];
	const thuTu: DanhGiaPhan[] = ['lech-nhieu', 'hoi-lech', 'khong-thay'];
	const hang = (p: Phan) => {
		const k = thuTu.indexOf(d.boPhan[p]);
		return k < 0 ? thuTu.length : k;
	};
	const phan = (Object.keys(d.boPhan) as Phan[]).sort((a, b) => hang(a) - hang(b));
	if (d.mucDo !== 'dung') {
		for (const p of phan) {
			const g = goiYPhan(p, d.boPhan[p]);
			if (g) y.push(g);
			if (y.length >= 2) break;
		}
		if (d.giaiDoanLechNhat) y.push(`Chỗ khác nhiều nhất là ${TEN_GIAI_DOAN[d.giaiDoanLechNhat]} của động tác.`);
	} else {
		// dung roi thi chi khen, khong bat loi
		const khop = phan.filter((p) => d.boPhan[p] === 'khop');
		if (khop.length) y.push(`${TEN_TAY[khop[0]][0].toUpperCase()}${TEN_TAY[khop[0]].slice(1)} làm giống mẫu lắm!`);
	}
	if (d.chatLuong.thoiLuong > 0 && d.chatLuong.thoiLuong < 0.8 && d.mucDo !== 'dung')
		y.push('Bạn ký hơi nhanh — thử chậm lại một chút cho Mèo nhìn kịp.');
	return y.slice(0, 3);
}

export function tamTrangTuMucDo(m: DuKien['mucDo']): TamTrang {
	return m === 'dung' ? 'vui' : m === 'gan-dung' ? 'co-vu' : 'boi-roi';
}

export function cauMeoMau(d: DuKien, r: () => number = Math.random): string {
	const dien = (s: string) =>
		s
			.replaceAll('{tu}', d.tuMucTieu)
			.replaceAll('{doan}', d.tuDoan)
			.replaceAll('{hang}', String(d.xepHang))
			.replaceAll('{p}', PHAN_TRAM(d.xacSuat));
	const phan = [dien(chon([...MO_DAU[d.mucDo]], r)), ...cacY(d), chon([...KET[d.mucDo]], r)];
	return phan.join(' ');
}
