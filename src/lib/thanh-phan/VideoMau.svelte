<!--
	Video mau cua mot tu (Tu dien Ngon ngu ky hieu — QIPEDC). ds[0] = cach ky Meo cham,
	cac phan tu sau = cach ky khac (mien Bac / Trung / Nam) de nguoi hoc biet them.
	Lap lai, chinh toc do, lat soi guong. Chua co video da duyet -> khung xuong mau VSL400
	(neu da kiem chung, can prop i), khong co nua thi bao ro, khong doan bua.
-->
<script lang="ts">
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import VideoOff from '@lucide/svelte/icons/video-off';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Pause from '@lucide/svelte/icons/pause';
	import Play from '@lucide/svelte/icons/play';
	import { nhanVideo, TEN_MIEN, type VideoMau } from '$lib/loi/video-mau';
	import { napKhungMau, type KhungMau } from '$lib/loi/khung-mau';
	import KhungXuong from './KhungXuong.svelte';

	let {
		ds,
		tu,
		i = undefined,
		canhBao = null,
		guongMacDinh = false
	}: {
		ds: VideoMau[];
		tu: string;
		/** chi so tu (0..399): co thi duoc dung khung xuong mau khi chua co video */
		i?: number;
		canhBao?: string | null;
		guongMacDinh?: boolean;
	} = $props();

	const TOC_DO = [0.5, 0.75, 1];
	let video: HTMLVideoElement | undefined = $state();
	let tocDo = $state(1);
	// svelte-ignore state_referenced_locally
	let guong = $state(guongMacDinh);
	let chon = $state(0);
	let trangThai = $state<'tai' | 'chay' | 'loi'>('tai');
	let tiLe = $state('16 / 9');

	const hienTai = $derived(ds[Math.min(chon, ds.length - 1)] as VideoMau | undefined);
	const src = $derived(hienTai?.url ?? '');

	// chua co video -> thu khung xuong mau VSL400 (chi ban da kiem chung)
	let khungMau = $state<KhungMau | null>(null);
	let dangTaiKhung = $state(false);
	let dungKhung = $state(false);
	$effect(() => {
		const so = i;
		const coVideo = ds.length > 0;
		khungMau = null;
		dungKhung = false;
		if (coVideo || so === undefined) {
			dangTaiKhung = false;
			return;
		}
		let huy = false;
		dangTaiKhung = true;
		napKhungMau(so).then((k) => {
			if (huy) return;
			khungMau = k;
			dangTaiKhung = false;
		});
		return () => {
			huy = true;
		};
	});
	const laKhung = $derived(!hienTai && !!khungMau);

	// doi tu -> ve video chinh; doi video -> tai lai
	$effect(() => {
		void ds;
		chon = 0;
	});
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
	{#if ds.length > 1}
		<div class="tab-cach" role="tablist" aria-label="Các cách ký">
			{#each ds as v, k (v.url)}
				<button role="tab" aria-selected={chon === k} class:chinh={k === 0} onclick={() => (chon = k)}>
					{nhanVideo(v, k)}
				</button>
			{/each}
		</div>
	{/if}

	<div class="khung" style:aspect-ratio={laKhung ? '1 / 1' : tiLe}>
		{#if laKhung && khungMau}
			<KhungXuong khung={khungMau} {tu} {tocDo} {guong} dung={dungKhung} />
			<span class="nhan-mo-phong">Mô phỏng · VSL400</span>
		{:else if !hienTai && dangTaiKhung}
			<div class="dang-tai" aria-hidden="true"><span></span></div>
		{:else if !hienTai}
			<div class="loi">
				<VideoOff size={28} />
				<p>Video mẫu của “{tu}” đang được nhóm duyệt lại cho đúng cách ký.</p>
				<a href="https://qipedc.moet.gov.vn/dictionary" target="_blank" rel="noopener noreferrer" class="nut nho vien">
					Tra từ điển QIPEDC <ExternalLink size={14} />
				</a>
			</div>
		{:else if trangThai === 'loi'}
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

	{#if hienTai || laKhung}
		<div class="dieu-khien">
			<div class="nhom" role="group" aria-label="Tốc độ phát video mẫu">
				{#each TOC_DO as t (t)}
					<button class="chip" aria-pressed={tocDo === t} onclick={() => (tocDo = t)}>
						{String(t).replace('.', ',')}×
					</button>
				{/each}
			</div>
			{#if laKhung}
				<button class="chip" aria-pressed={dungKhung} onclick={() => (dungKhung = !dungKhung)}>
					{#if dungKhung}<Play size={15} /> Phát tiếp{:else}<Pause size={15} /> Tạm dừng{/if}
				</button>
			{/if}
			<button
				class="chip"
				aria-pressed={guong}
				onclick={() => (guong = !guong)}
				title="Lật như soi gương: tay phải người mẫu nằm bên phải màn hình, dễ bắt chước hơn"
			>
				<ArrowLeftRight size={15} /> Soi gương
			</button>
		</div>
	{/if}
	{#if canhBao}
		<p class="canh-bao"><TriangleAlert size={15} /> {canhBao}</p>
	{/if}
	{#if laKhung && khungMau}
		<p class="nguon" data-testid="nguon-khung-xuong">
			Chưa có video thật cho từ này. Đây là chuyển động <b>thật</b> của một người ký trong bộ dữ liệu VSL400 — lần
			ký tiêu biểu nhất{khungMau.muc.so_mau ? ` trong ${khungMau.muc.so_mau} lần ký` : ''} mà Mèo nhận ra đúng — vẽ lại
			bằng khung xương, nên đúng cách Mèo chấm. Không có nét mặt.
		</p>
	{/if}
	{#if hienTai}
		<p class="nguon">
			{hienTai.nguon === 'cu' ? 'Video mẫu' : 'Video mẫu: Từ điển Ngôn ngữ ký hiệu, dự án QIPEDC, Bộ GD&ĐT'}{hienTai.mien
				? ` · Ký hiệu ${TEN_MIEN[hienTai.mien]}`
				: ''}
		</p>
	{/if}
</div>

<style>
	.video-mau {
		margin: 0;
	}
	.tab-cach {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 10px;
	}
	.tab-cach button {
		border: 1.5px solid var(--vien);
		background: var(--the);
		color: var(--chu-phu);
		border-radius: 999px;
		padding: 5px 12px;
		font-weight: 800;
		font-size: 0.82rem;
		cursor: pointer;
	}
	.tab-cach button[aria-selected='true'] {
		background: var(--nut);
		border-color: var(--nut);
		color: #fff;
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
		max-width: 36ch;
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
	.canh-bao {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 8px 0 0;
		padding: 6px 10px;
		border-radius: var(--bo-nho);
		background: var(--vang-nhat);
		color: var(--vang-chu);
		font-size: 0.82rem;
		font-weight: 750;
	}
	.nhan-mo-phong {
		position: absolute;
		top: 10px;
		left: 10px;
		padding: 3px 10px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.14);
		color: #e6eefa;
		font-size: 0.75rem;
		font-weight: 800;
		pointer-events: none;
	}
	.dieu-khien .chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}
	.nguon {
		margin: 8px 0 0;
		font-size: 0.78rem;
		color: var(--chu-phu);
	}
</style>
