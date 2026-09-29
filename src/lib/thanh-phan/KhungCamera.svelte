<!--
	Ô camera dùng chung cho Dịch / Học / Đố vui. Hiển thị kiểu GƯƠNG (chỉ để xem);
	MediaPipe và mô hình luôn dùng ảnh thật chưa lật.
-->
<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { PhienCamera } from '$lib/loi/camera.svelte';
	import Meo from '$lib/meo/Meo.svelte';
	import Camera from '@lucide/svelte/icons/camera';
	import CameraOff from '@lucide/svelte/icons/camera-off';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import { CAT_DOAN } from '$lib/loi/hang-so';
	import { KIEU_VE } from '$lib/loi/ve';

	let {
		phien,
		giaLap = false,
		goiY = 'Giơ tay lên và ký một từ nhé!',
		children
	}: {
		phien: PhienCamera;
		giaLap?: boolean;
		goiY?: string;
		/** noi dung phu len day khung hinh (vi du: tu vua doan, ket luan) */
		children?: Snippet;
	} = $props();

	let video: HTMLVideoElement;
	let canvas: HTMLCanvasElement;

	const tiLe = $derived(phien.kichThuoc.rong && phien.kichThuoc.cao ? `${phien.kichThuoc.rong} / ${phien.kichThuoc.cao}` : '16 / 9');
	const dangChay = $derived(phien.trangThai === 'chay');
	const th = $derived(phien.tinHieu);
	const tienTrinh = $derived(Math.min(phien.thoiGianKy / 3, 1));

	const LOI_PHA: Record<string, string> = {
		'dang-ky': 'Đang ký…',
		'dang-cham': 'Mèo đang đoán…',
		nghi: 'Xong! Nghỉ chút nha'
	};
	const loiPha = $derived(phien.pha === 'cho' ? (th?.coNguoi ? goiY : 'Ngồi xa camera hơn chút — Mèo cần thấy cả hai vai và hai tay') : LOI_PHA[phien.pha]);

	function bat() {
		phien.batDau(video, canvas, { giaLap });
	}
	// tat camera khi roi trang (onMount khong chay luc dung san trang tren may chu)
	onMount(() => {
		phien.napKieuVe();
		return () => phien.dung();
	});
</script>

<div class="o-camera" style:aspect-ratio={tiLe} data-pha={phien.pha} data-trang-thai={phien.trangThai}>
	<video bind:this={video} class:an={giaLap} muted playsinline aria-label="Hình từ camera của bạn (hiển thị kiểu gương)"></video>
	<canvas bind:this={canvas} class:gia-lap={giaLap}></canvas>

	{#if dangChay}
		<div class="bang-pha" aria-live="polite">
			{#if phien.pha === 'dang-ky'}
				<svg class="vong" viewBox="0 0 36 36" aria-hidden="true">
					<circle cx="18" cy="18" r="15" />
					<circle cx="18" cy="18" r="15" class="chay" style:stroke-dashoffset={94.2 * (1 - tienTrinh)} />
				</svg>
			{:else if phien.pha === 'dang-cham'}
				<span class="cham-dong" aria-hidden="true"><i></i><i></i><i></i></span>
			{/if}
			<span>{loiPha}</span>
		</div>
		<button class="nut-tat" onclick={() => phien.dung()} aria-label="Tắt camera"><CameraOff size={18} /></button>
		{#if children}
			<div class="lop-duoi">{@render children()}</div>
		{/if}
	{:else}
		<div class="lop-phu">
			{#if phien.trangThai === 'tat'}
				<Meo tamTrang="ngu" kichThuoc={96} />
				<p>Camera đang tắt. Mèo ngủ gật rồi…</p>
				<button class="nut" onclick={bat}><Camera size={20} /> Bật camera</button>
				<p class="nho">Hình ảnh chỉ xử lý trên máy bạn, không gửi đi đâu.</p>
			{:else if phien.trangThai === 'dang-mo'}
				<Meo tamTrang="nghe" kichThuoc={96} />
				<p>Đang mở camera… Nếu trình duyệt hỏi, bấm <strong>Cho phép</strong> nhé.</p>
			{:else if phien.trangThai === 'dang-nap'}
				<Meo tamTrang="suy-nghi" kichThuoc={96} />
				<p>Mèo đang tải mô hình nhìn dáng người… Lần đầu hơi lâu (vài chục giây nếu mạng chậm), lần sau nhanh thôi.</p>
			{:else if phien.trangThai === 'loi'}
				<Meo tamTrang="boi-roi" kichThuoc={96} />
				<p class="loi">{phien.loi}</p>
				<button class="nut" onclick={bat}><RotateCcw size={18} /> Thử lại</button>
			{/if}
		</div>
	{/if}
</div>

<div class="den" aria-label="Trạng thái nhận dạng">
	<span class:bat={th?.coNguoi}><i></i>Thấy người</span>
	<span class:bat={th?.coTayTrai} class="trai"><i></i>Tay trái</span>
	<span class:bat={th?.coTayPhai} class="phai"><i></i>Tay phải</span>
	<span class:bat={th?.tayNang}><i></i>Tay đang giơ</span>
	{#if dangChay}<span class="fps">{Math.round(phien.fps)} hình/giây</span>{/if}
</div>
<div class="kieu-ve" role="group" aria-label="Nét vẽ khớp trên camera (chỉ để nhìn, Mèo vẫn nhận dạng bình thường)">
	<span>Nét vẽ khớp</span>
	{#each KIEU_VE as k (k.ma)}
		<button aria-pressed={phien.kieuVe === k.ma} onclick={() => phien.doiKieuVe(k.ma)}>{k.ten}</button>
	{/each}
</div>
{#if phien.chamCham}
	<p class="canh-bao">Máy đang chạy hơi chậm (dưới {CAT_DOAN.fpsCanhBao} hình/giây) nên Mèo dễ đoán sai. Thử đóng bớt tab, hoặc dùng mục <strong>Tải video lên</strong>.</p>
{/if}

<style>
	.o-camera {
		position: relative;
		width: 100%;
		max-height: 70vh;
		border-radius: var(--bo);
		overflow: hidden;
		background:
			radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--xanh) 22%, transparent), transparent 60%),
			linear-gradient(160deg, var(--xanh-nhat-2), var(--nen-2));
		border: 1px solid var(--vien);
		box-shadow: var(--bong);
		isolation: isolate;
	}
	video,
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
		transform: scaleX(-1); /* chi lat khi HIEN THI */
	}
	video.an {
		display: none;
	}
	canvas.gia-lap {
		background: linear-gradient(160deg, #20324d, #13223a);
	}
	.o-camera[data-pha='dang-ky'] {
		outline: 4px solid var(--xanh-la);
		outline-offset: -4px;
	}
	.lop-phu {
		position: absolute;
		inset: 0;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 10px;
		padding: 20px;
		text-align: center;
		font-weight: 700;
	}
	.lop-phu p {
		margin: 0;
		max-width: 34ch;
	}
	.lop-phu .nho {
		font-size: 0.85rem;
		color: var(--chu-phu);
		font-weight: 600;
	}
	.lop-phu .loi {
		color: var(--do-chu);
	}
	.bang-pha {
		position: absolute;
		left: 50%;
		top: 14px;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 10px;
		max-width: calc(100% - 90px);
		padding: 8px 16px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--the) 88%, transparent);
		backdrop-filter: blur(8px);
		box-shadow: var(--bong-nhe);
		font-weight: 800;
		font-size: 0.95rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.vong {
		width: 22px;
		height: 22px;
		transform: rotate(-90deg);
		flex: none;
	}
	.vong circle {
		fill: none;
		stroke: var(--vien);
		stroke-width: 5;
	}
	.vong .chay {
		stroke: var(--xanh-la);
		stroke-dasharray: 94.2;
		transition: stroke-dashoffset 0.1s linear;
	}
	.cham-dong {
		display: inline-flex;
		gap: 4px;
	}
	.cham-dong i {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--xanh);
		animation: nhay 0.9s ease-in-out infinite;
	}
	.cham-dong i:nth-child(2) {
		animation-delay: 0.15s;
	}
	.cham-dong i:nth-child(3) {
		animation-delay: 0.3s;
	}
	@keyframes nhay {
		0%,
		100% {
			transform: translateY(0);
			opacity: 0.5;
		}
		50% {
			transform: translateY(-4px);
			opacity: 1;
		}
	}
	.lop-duoi {
		position: absolute;
		left: 12px;
		right: 12px;
		bottom: 14px;
		display: flex;
		justify-content: center;
		pointer-events: none;
	}
	.nut-tat {
		position: absolute;
		right: 12px;
		top: 12px;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		border: 0;
		display: grid;
		place-items: center;
		background: color-mix(in srgb, var(--the) 85%, transparent);
		color: var(--chu);
		cursor: pointer;
	}
	.den {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 14px;
		margin-top: 12px;
		font-size: 0.86rem;
		font-weight: 750;
		color: var(--chu-phu);
	}
	.den span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.den i {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--vien);
		transition: background 0.15s ease;
	}
	.den .bat i {
		background: var(--xanh-la);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--xanh-la) 25%, transparent);
	}
	.den .trai.bat i {
		background: #ff7aa2;
		box-shadow: 0 0 0 3px #ff7aa244;
	}
	.den .phai.bat i {
		background: #ffc53d;
		box-shadow: 0 0 0 3px #ffc53d44;
	}
	.den .fps {
		margin-left: auto;
		font-variant-numeric: tabular-nums;
	}
	.kieu-ve {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 4px;
		margin-top: 8px;
		font-size: 0.8rem;
		font-weight: 750;
		color: var(--chu-phu);
	}
	.kieu-ve span {
		margin-right: 4px;
	}
	.kieu-ve button {
		border: 1.5px solid var(--vien);
		background: var(--the);
		color: var(--chu-phu);
		border-radius: 999px;
		padding: 3px 10px;
		font-weight: 800;
		font-size: 0.78rem;
		cursor: pointer;
	}
	.kieu-ve button[aria-pressed='true'] {
		background: var(--nut);
		border-color: var(--nut);
		color: #fff;
	}
	.canh-bao {
		margin-top: 10px;
		padding: 10px 14px;
		border-radius: var(--bo-nho);
		background: var(--vang-nhat);
		color: var(--chu);
		font-size: 0.9rem;
	}
</style>
