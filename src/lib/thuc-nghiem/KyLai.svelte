<!--
	Ky lai khong xem mau: web dua ten tu, nguoi tham gia ky mot lan, mo hinh cham ngam
	(hang cua tu muc tieu trong 400 tu). Khong bao dung / sai. Lan ky bi bo (qua ngan,
	mat tay...) khong tinh, ky lai duoc; khong nho thi bam "Không nhớ".
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import KhungCamera from '$lib/thanh-phan/KhungCamera.svelte';
	import { PhienCamera } from '$lib/loi/camera.svelte';
	import type { KhungVao } from '$lib/loi/cat-doan';
	import { mucDoTuHang, topK, xepHang } from '$lib/loi/danh-gia';
	import { LOI_BO } from '$lib/loi/dinh-dang';
	import { chayMoHinh } from '$lib/loi/mo-hinh';
	import { noiSuy } from '$lib/loi/lay-mau';
	import { NHAN, type Tu } from '$lib/loi/tu-vung';
	import type { LanKy } from './kich-ban';

	let {
		tu,
		giaLap = false,
		onKy,
		onBoQua,
		onXong
	}: {
		tu: Tu[];
		giaLap?: boolean;
		onKy: (k: LanKy) => void;
		onBoQua: (t: Tu) => void;
		onXong: (fpsTrungBinh: number | null) => void;
	} = $props();

	let k = $state(0);
	const tuDang = $derived(tu[k]);
	let daGhi = $state(false);
	let thongBao = $state<string | null>(null);
	const mauFps: number[] = [];

	function sangTu() {
		daGhi = false;
		thongBao = null;
		if (k + 1 >= tu.length) {
			phien.dung();
			const fps = mauFps.length ? Math.round((mauFps.reduce((a, b) => a + b, 0) / mauFps.length) * 10) / 10 : null;
			onXong(fps);
			return;
		}
		k++;
		phien.datLai();
	}

	async function cham(khung: KhungVao[], thoiLuong: number) {
		if (daGhi) return;
		const muc = tuDang;
		try {
			const p = await chayMoHinh(noiSuy(khung));
			if (muc.i !== tuDang.i) return;
			const hang = xepHang(p, muc.i);
			daGhi = true;
			onKy({ tu: muc, hang, mucDo: mucDoTuHang(hang), top5: topK(p, NHAN, 5).map((d) => d.tu), lan: 1, ms: Math.round(thoiLuong * 1000) });
			setTimeout(sangTu, 1200);
		} catch (e) {
			console.error(e);
			thongBao = 'Máy chưa sẵn sàng nhận dạng. Nhờ người hướng dẫn tải lại trang nhé.';
		}
	}

	const phien = new PhienCamera({
		onBatDau: () => (thongBao = null),
		onDoan: (khung, thoiLuong) => cham(khung, thoiLuong),
		onBo: (lyDo) => (thongBao = `${LOI_BO[lyDo]} Lần này không tính, bạn ký lại nhé.`)
	});

	function khongNho() {
		if (daGhi) return;
		onBoQua(tuDang);
		sangTu();
	}

	onMount(() => {
		const hen = setInterval(() => {
			if (phien.fps > 0) mauFps.push(phien.fps);
		}, 500);
		return () => clearInterval(hen);
	});
</script>

<section class="ky-lai" data-testid="ky-lai">
	<p class="nhan-nho">Ký lại không xem mẫu · Từ {k + 1}/{tu.length}</p>
	<h2>Hãy ký: <span class="tu" data-testid="tu-ky-lai">{tuDang.tu}</span></h2>
	<p class="phu">Mỗi từ ký một lần. Web không báo đúng hay sai.</p>
	<div class="luoi">
		<div class="the">
			<KhungCamera {phien} {giaLap} goiY="Giơ tay lên và ký “{tuDang.tu}”" />
		</div>
		<div class="ben">
			{#if daGhi}
				<p class="da-ghi" data-testid="da-ghi-nhan">Đã ghi nhận.</p>
			{:else if thongBao}
				<p class="canh-bao">{thongBao}</p>
			{/if}
			<button class="nut vien" onclick={khongNho} disabled={daGhi} data-testid="khong-nho">Mình không nhớ từ này</button>
		</div>
	</div>
</section>

<style>
	h2 {
		margin: 4px 0;
	}
	.tu {
		color: var(--xanh-dam);
	}
	.phu {
		color: var(--chu-phu);
		margin: 0 0 14px;
	}
	.luoi {
		display: grid;
		gap: 16px;
	}
	@media (min-width: 900px) {
		.luoi {
			grid-template-columns: 1.6fr 1fr;
			align-items: start;
		}
	}
	.ben {
		display: grid;
		gap: 12px;
	}
	.da-ghi {
		margin: 0;
		font-weight: 850;
		font-size: 1.2rem;
	}
	.canh-bao {
		margin: 0;
		padding: 10px 14px;
		border-radius: var(--bo-nho);
		background: var(--vang-nhat);
		font-weight: 650;
	}
</style>
