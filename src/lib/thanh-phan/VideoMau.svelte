<!--
	Video mau cua mot tu (Tu dien Ngon ngu ky hieu — QIPEDC). Lap lai, chinh toc do,
	lat kieu soi guong cho de bat chuoc. Khong tai duoc thi cho link mo tab moi.
-->
<script lang="ts">
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import VideoOff from '@lucide/svelte/icons/video-off';

	let { src, tu, guongMacDinh = false }: { src: string; tu: string; guongMacDinh?: boolean } = $props();

	const TOC_DO = [0.5, 0.75, 1];
	let video: HTMLVideoElement | undefined = $state();
	let tocDo = $state(1);
	// svelte-ignore state_referenced_locally
	let guong = $state(guongMacDinh);
	let trangThai = $state<'tai' | 'chay' | 'loi'>('tai');
	let tiLe = $state('16 / 9');

	// doi tu -> tai lai tu dau
	$effect(() => {
		void src;
		trangThai = 'tai';
	});
	$effect(() => {
		if (video) video.playbackRate = tocDo;
	});

	function daCoKichThuoc() {
		if (!video) return;
		if (video.videoWidth && video.videoHeight) tiLe = `${video.videoWidth} / ${video.videoHeight}`;
		video.playbackRate = tocDo; // tai nguon moi thi trinh duyet dat lai toc do
	}
</script>

<div class="video-mau">
	<div class="khung" style:aspect-ratio={tiLe}>
		{#if trangThai === 'loi'}
			<div class="loi">
				<VideoOff size={28} />
				<p>Chưa tải được video mẫu của “{tu}”.</p>
				<a href={src} target="_blank" rel="noopener noreferrer" class="nut nho vien">
					Mở video ở tab mới <ExternalLink size={14} />
				</a>
			</div>
		{:else}
			<video
				bind:this={video}
				{src}
				class:guong
				autoplay
				muted
				loop
				playsinline
				preload="auto"
				onloadedmetadata={daCoKichThuoc}
				onplaying={() => (trangThai = 'chay')}
				onerror={() => (trangThai = 'loi')}
				aria-label="Video mẫu ký hiệu “{tu}”"
			></video>
			{#if trangThai === 'tai'}
				<div class="dang-tai" aria-hidden="true"><span></span></div>
			{/if}
		{/if}
	</div>
	<div class="dieu-khien">
		<div class="nhom" role="group" aria-label="Tốc độ phát video mẫu">
			{#each TOC_DO as t (t)}
				<button class="chip" aria-pressed={tocDo === t} onclick={() => (tocDo = t)}>
					{String(t).replace('.', ',')}×
				</button>
			{/each}
		</div>
		<button
			class="chip"
			aria-pressed={guong}
			onclick={() => (guong = !guong)}
			title="Lật như soi gương: tay phải người mẫu nằm bên phải màn hình, dễ bắt chước hơn"
		>
			<ArrowLeftRight size={15} /> Soi gương
		</button>
	</div>
	<p class="nguon">Video mẫu: Từ điển Ngôn ngữ ký hiệu — dự án QIPEDC, Bộ GD&ĐT</p>
</div>

<style>
	.video-mau {
		margin: 0;
	}
	.khung {
		position: relative;
		width: 100%;
		max-height: 46vh;
		border-radius: var(--bo-vua);
		overflow: hidden;
		background: #0f1c2e;
	}
	video {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	video.guong {
		transform: scaleX(-1);
	}
	.dang-tai {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: linear-gradient(110deg, #13233a 30%, #1c3150 50%, #13233a 70%);
		background-size: 250% 100%;
		animation: sang 1.4s linear infinite;
	}
	.dang-tai span {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		border: 4px solid rgba(255, 255, 255, 0.25);
		border-top-color: #fff;
		animation: xoay 0.9s linear infinite;
	}
	@keyframes sang {
		to {
			background-position: -150% 0;
		}
	}
	@keyframes xoay {
		to {
			transform: rotate(1turn);
		}
	}
	.loi {
		position: absolute;
		inset: 0;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 8px;
		padding: 16px;
		text-align: center;
		color: #e6eefa;
		font-weight: 700;
	}
	.loi p {
		margin: 0;
	}
	.loi .nut {
		color: #fff;
		border-color: rgba(255, 255, 255, 0.35);
	}
	.dieu-khien {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 8px;
		margin-top: 10px;
	}
	.nhom {
		display: flex;
		gap: 6px;
	}
	.chip {
		font-variant-numeric: tabular-nums;
	}
	.nguon {
		margin: 8px 0 0;
		font-size: 0.78rem;
		color: var(--chu-phu);
	}
</style>
