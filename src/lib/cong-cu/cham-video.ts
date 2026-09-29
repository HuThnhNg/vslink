// Cham mot video mau: MediaPipe doc tung hinh (nhu muc "Tai video len") -> mo hinh ->
// xac suat cua dung tu can tim. Bien the nao mo hinh nhan ra ro nhat = cach ky giong
// VSL400 nhat = cach Meo se cham nguoi hoc.
import { topK, xepHang } from '$lib/loi/danh-gia';
import { khungKichBan } from '$lib/loi/gia-lap';
import { dongGoi } from '$lib/loi/lay-mau';
import { chayMoHinh } from '$lib/loi/mo-hinh';
import { NHAN } from '$lib/loi/tu-vung';
import { docVideo } from '$lib/loi/video-tai-len';

export type KetQuaCham = { p: number; hang: number; doan: string } | { loi: string };

export async function chamVideo(blob: Blob, iMucTieu: number, { giaLap = false } = {}): Promise<KetQuaCham> {
	let goi: Float32Array;
	if (giaLap) {
		// kiem thu tren may khong co MediaPipe: "nguoi que" thay cho video
		goi = dongGoi(Array.from({ length: 50 }, (_, j) => khungKichBan(1.6 + j * 0.036 + (iMucTieu % 7) * 0.001)));
	} else {
		const kq = await docVideo(blob);
		const coNguoi = kq.khung.filter((k) => k.tinHieu.coNguoi).length;
		if (kq.khung.length < 5 || coNguoi < kq.khung.length * 0.3) return { loi: 'Không thấy rõ người trong video' };
		goi = dongGoi(kq.khung.map((k) => k.kp));
	}
	const p = await chayMoHinh(goi);
	return { p: p[iMucTieu], hang: xepHang(p, iMucTieu), doan: topK(p, NHAN, 1)[0].tu };
}
