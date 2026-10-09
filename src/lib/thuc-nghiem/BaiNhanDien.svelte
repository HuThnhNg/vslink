<!--
	Bai nhan dien (truoc / sau khi hoc): xem video mau, chon nghia. KHONG bao dung / sai
	(neu bao thi bai truoc khi hoc thanh mot luot hoc them).
-->
<script lang="ts">
	import VideoMau from '$lib/thanh-phan/VideoMau.svelte';
	import { videoCua, type TepVideoMau } from '$lib/loi/video-mau';
	import type { Tu } from '$lib/loi/tu-vung';
	import type { CauNhanDien } from './kich-ban';

	let {
		cau,
		tepVideo,
		tieuDe,
		onTraLoi,
		onXong
	}: {
		cau: CauNhanDien[];
		tepVideo: TepVideoMau;
		tieuDe: string;
		onTraLoi: (c: CauNhanDien, chon: Tu, ms: number) => void;
		onXong: () => void;
	} = $props();

	let k = $state(0);
	let tBatDau = performance.now();
	const c = $derived(cau[k]);

	function chon(t: Tu) {
		onTraLoi(c, t, Math.round(performance.now() - tBatDau));
		if (k + 1 >= cau.length) {
			onXong();
			return;
		}
		k++;
		tBatDau = performance.now();
	}
</script>

<section class="the" data-testid="bai-nhan-dien">
	<p class="nhan-nho">{tieuDe} · Câu {k + 1}/{cau.length}</p>
	<h2>Ký hiệu trong video có nghĩa là gì?</h2>
	<p class="phu">Xem video bao nhiêu lần cũng được. Không chắc thì chọn đáp án bạn thấy gần nhất.</p>
	{#key k}
		<div class="video">
			<VideoMau ds={videoCua(tepVideo, c.tu).ds.slice(0, 1)} tu="?" />
		</div>
		<div class="dap-an">
			{#each c.dapAn as t, j (t.i)}
				<button class="nut vien" onclick={() => chon(t)} data-testid="dap-an">
					<b>{j + 1}</b>
					{t.tu}
				</button>
			{/each}
		</div>
	{/key}
</section>

<style>
	h2 {
		margin: 4px 0;
	}
	.phu {
		color: var(--chu-phu);
		margin: 0 0 14px;
	}
	.video {
		max-width: 560px;
		margin: 0 auto 16px;
	}
	.dap-an {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 10px;
	}
	.dap-an button {
		justify-content: flex-start;
		font-size: 1.05rem;
	}
	.dap-an b {
		color: var(--chu-phu);
		margin-right: 4px;
	}
</style>
