<!--
	Hoc mot bo tu trong thoi gian co dinh (dieu kien thuc nghiem):
	  phanHoi = true : nhu trang Hoc — Dung / Gan dung / Chua dung, bo phan khac mau, Meo nhan xet
	                   (luon dung loi soan san de moi nguoi nhan cung mot kieu nhan xet).
	  phanHoi = false: chi video mau + camera soi guong. Mo hinh van cham NGAM de ghi so lan tap
	                   va hang (phan tich duong hoc), nhung khong hien gi ve dung / sai.
	Het gio moi duoc sang buoc sau: hai bo co cung thoi gian hoc.
-->
<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import KhungCamera from '$lib/thanh-phan/KhungCamera.svelte';
	import VideoMau from '$lib/thanh-phan/VideoMau.svelte';
	import BoPhan from '$lib/thanh-phan/BoPhan.svelte';
	import BongMeo from '$lib/meo/BongMeo.svelte';
	import { PhienCamera } from '$lib/loi/camera.svelte';
	import type { KhungVao } from '$lib/loi/cat-doan';
	import { danhGia, doChatLuong, mucDoTuHang, taoBatchCheBot, topK, xepHang, type DuKien, type MucDo } from '$lib/loi/danh-gia';
	import { LOI_BO } from '$lib/loi/dinh-dang';
	import { chayMoHinh } from '$lib/loi/mo-hinh';
	import { noiSuy } from '$lib/loi/lay-mau';
	import { videoCua, type TepVideoMau } from '$lib/loi/video-mau';
	import { NHAN, type Tu } from '$lib/loi/tu-vung';
	import { cauMeoMau, tamTrangTuMucDo } from '$lib/meo/loi-meo';
	import type { LanKy } from './kich-ban';

	let {
		tu,
		phanHoi,
		giay,
		tepVideo,
		giaLap = false,
		onKy,
		onXong
	}: {
		tu: Tu[];
		phanHoi: boolean;
		giay: number;
		tepVideo: TepVideoMau;
		giaLap?: boolean;
		onKy: (k: LanKy) => void;
		onXong: (fpsTrungBinh: number | null) => void;
	} = $props();

	let chon = $state(0);
	const tuDang = $derived(tu[chon]);
	const video = $derived(videoCua(tepVideo, tuDang));
	let conLai = $state(untrack(() => giay));
	let hetGio = $state(false);
	let ketQua = $state<{ id: number; duKien: DuKien; loiMeo: string } | null>(null);
	let daGhiNhan = $state<number | null>(null);
	let thongBao = $state<string | null>(null);
	let loiCham = $state<string | null>(null);
	const soLan: Record<number, number> = {};
	let dem = 0;
	const mauFps: number[] = [];

	async function cham(khung: KhungVao[], thoiLuong: number) {
		if (hetGio) return;
		const id = ++dem;
		const muc = tuDang;
		try {
			if (phanHoi) {
				const probs = await chayMoHinh(taoBatchCheBot(noiSuy(khung)));
				if (id !== dem || muc.i !== tuDang.i) return;
				const duKien = danhGia(probs, muc.i, NHAN, doChatLuong(khung.map((k) => k.kp), thoiLuong));
				ketQua = { id, duKien, loiMeo: cauMeoMau(duKien) };
				ghi(muc, duKien.xepHang, duKien.mucDo, topK(probs, NHAN, 5).map((d) => d.tu), thoiLuong);
			} else {
				const p = await chayMoHinh(noiSuy(khung));
				if (id !== dem || muc.i !== tuDang.i) return;
				const hang = xepHang(p, muc.i);
				daGhiNhan = id;
				ghi(muc, hang, mucDoTuHang(hang), topK(p, NHAN, 5).map((d) => d.tu), thoiLuong);
			}
			thongBao = null;
			loiCham = null;
		} catch (e) {
			console.error(e);
			loiCham = 'Máy chưa sẵn sàng nhận dạng. Nhờ người hướng dẫn tải lại trang nhé.';
		}
	}

	function ghi(t: Tu, hang: number, mucDo: MucDo, top5: string[], thoiLuong: number) {
		soLan[t.i] = (soLan[t.i] ?? 0) + 1;
		onKy({ tu: t, hang, mucDo, top5, lan: soLan[t.i], ms: Math.round(thoiLuong * 1000) });
	}

	const phien = new PhienCamera({
		onBatDau: () => {
			thongBao = null;
			daGhiNhan = null;
		},
		onDoan: (khung, thoiLuong) => cham(khung, thoiLuong),
		onBo: (lyDo) => {
			thongBao = LOI_BO[lyDo];
		}
	});

	function doiTu(j: number) {
		if (j === chon) return;
		chon = j;
		dem++;
		ketQua = null;
		daGhiNhan = null;
		thongBao = null;
		phien.datLai();
	}

	onMount(() => {
		const batDau = performance.now();
		const hen = setInterval(() => {
			if (phien.fps > 0) mauFps.push(phien.fps);
			conLai = Math.max(0, giay - Math.floor((performance.now() - batDau) / 1000));
			if (conLai === 0 && !hetGio) {
				hetGio = true;
				phien.dung();
			}
		}, 250);
		return () => clearInterval(hen);
	});

	function xong() {
		const fps = mauFps.length ? Math.round((mauFps.reduce((a, b) => a + b, 0) / mauFps.length) * 10) / 10 : null;
		onXong(fps);
	}

	const phut = $derived(`${Math.floor(conLai / 60)}:${String(conLai % 60).padStart(2, '0')}`);
</script>

<section class="hoc-bo" data-testid="hoc-bo" data-phan-hoi={phanHoi}>
	<header class="thanh-tren">
		<div>
			<p class="nhan-nho">{phanHoi ? 'Học có nhận xét của Mèo' : 'Tự học theo video mẫu'}</p>
			<h2>Học {tu.length} từ</h2>
		</div>
		<div class="dong-ho" class:sap-het={conLai <= 30} aria-live="off" data-testid="dong-ho">{phut}</div>
	</header>

	<div class="cac-tu" role="tablist" aria-label="Các từ trong bộ">
		{#each tu as t, j (t.i)}
			<button role="tab" aria-selected={j === chon} class:dang={j === chon} onclick={() => doiTu(j)}>{t.tu}</button>
		{/each}
	</div>

	{#if hetGio}
		<div class="the het-gio" data-testid="het-gio">
			<h2>Hết giờ học bộ này</h2>
			<p>Bấm tiếp tục để sang phần sau.</p>
			<button class="nut" onclick={xong} data-testid="tiep-tuc">Tiếp tục</button>
		</div>
	{:else}
		<div class="luoi">
			<section class="the" aria-label="Video mẫu">
				<h3 class="tieu-de-nho">Xem mẫu: “{tuDang.tu}”</h3>
				{#key tuDang.i}
					<VideoMau ds={video.ds} tu={tuDang.tu} i={tuDang.i} canhBao={video.canhBao} guongMacDinh />
				{/key}
			</section>

			<section class="the" aria-label="Camera của bạn">
				<h3 class="tieu-de-nho">Tự ký trước camera</h3>
				<KhungCamera {phien} {giaLap} goiY="Giơ tay lên và ký “{tuDang.tu}” nhé!" />
			</section>

			<section class="the o-kq" aria-live="polite" data-testid="ket-qua-hoc">
				{#if loiCham}
					<p class="canh-bao">{loiCham}</p>
				{:else if thongBao}
					<p class="canh-bao">{thongBao}</p>
				{/if}
				{#if phanHoi}
					{#if ketQua}
						{@const d = ketQua.duKien}
						<div class="ket-luan" data-muc={d.mucDo} data-testid="ket-luan">
							{#if d.mucDo === 'dung'}Đúng rồi!
							{:else if d.mucDo === 'gan-dung'}Gần đúng
							{:else}Chưa đúng · Mèo thấy giống “{d.tuDoan}” hơn{/if}
						</div>
						<BongMeo tamTrang={tamTrangTuMucDo(d.mucDo)} cau={ketQua.loiMeo} nguon="mau" />
						<h3 class="tieu-de-nho">Phần nào khác mẫu?</h3>
						<BoPhan duKien={d} />
					{:else}
						<BongMeo tamTrang="cho" cau="Xem video mẫu vài lần, rồi giơ tay ký “{tuDang.tu}” cho Mèo nhận xét nha!" />
					{/if}
				{:else if daGhiNhan !== null}
					<p class="trung-tinh" data-testid="da-ghi-nhan">Đã ghi nhận lần ký. Bạn có thể xem lại video và ký tiếp.</p>
				{:else}
					<p class="trung-tinh">Xem video mẫu, bật camera và tự tập ký “{tuDang.tu}”. Ở bộ này web không nhận xét.</p>
				{/if}
			</section>
		</div>
	{/if}
</section>

<style>
	.thanh-tren {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-bottom: 10px;
	}
	.thanh-tren h2 {
		margin: 2px 0 0;
	}
	.dong-ho {
		font-size: 2rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		padding: 4px 14px;
		border-radius: var(--bo-vua);
		background: var(--the);
		border: 1.5px solid var(--vien);
	}
	.dong-ho.sap-het {
		color: var(--do-chu);
		border-color: var(--do-chu);
	}
	.cac-tu {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 14px;
	}
	.cac-tu button {
		font: inherit;
		font-weight: 800;
		padding: 8px 16px;
		border-radius: 999px;
		border: 1.5px solid var(--vien);
		background: var(--the);
		color: var(--chu);
		cursor: pointer;
	}
	.cac-tu button.dang {
		background: var(--xanh);
		border-color: var(--xanh);
		color: #fff;
	}
	.luoi {
		display: grid;
		gap: 16px;
	}
	@media (min-width: 980px) {
		.luoi {
			grid-template-columns: 1fr 1.2fr;
		}
		.o-kq {
			grid-column: 1 / -1;
		}
	}
	.o-kq {
		display: grid;
		gap: 12px;
		align-content: start;
	}
	.tieu-de-nho {
		font-size: 0.95rem;
		margin: 0 0 10px;
		color: var(--chu-phu);
		font-weight: 850;
	}
	.ket-luan {
		padding: 10px 16px;
		border-radius: var(--bo-vua);
		font-size: 1.3rem;
		font-weight: 900;
		background: var(--do-nhat);
		color: var(--do-chu);
	}
	.ket-luan[data-muc='dung'] {
		background: var(--xanh-la-nhat);
		color: var(--xanh-la-chu);
	}
	.ket-luan[data-muc='gan-dung'] {
		background: var(--vang-nhat);
		color: var(--vang-chu);
	}
	.canh-bao {
		margin: 0;
		padding: 10px 14px;
		border-radius: var(--bo-nho);
		background: var(--vang-nhat);
		font-weight: 650;
	}
	.trung-tinh {
		margin: 0;
		color: var(--chu-phu);
		font-weight: 650;
	}
	.het-gio {
		text-align: center;
		display: grid;
		gap: 8px;
		justify-items: center;
		padding: 32px 16px;
	}
</style>
