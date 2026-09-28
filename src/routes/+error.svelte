<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import BongMeo from '$lib/meo/BongMeo.svelte';
</script>

<svelte:head><title>Không tìm thấy trang · VSLink</title></svelte:head>

<div class="khung-trang loi-trang">
	<p class="ma">{page.status}</p>
	<BongMeo
		tamTrang="boi-roi"
		kichThuoc={130}
		cau={page.status === 404
			? 'Mèo đánh hơi khắp nơi mà không thấy trang này đâu cả. Chắc đường dẫn bị gõ nhầm rồi!'
			: 'Ối, có gì đó trục trặc. Tải lại trang thử xem nhé.'}
	/>
	<div class="nut-ds">
		<a class="nut" href="{base}/">Về trang chủ</a>
		<a class="nut phu" href="{base}/hoc/">Đi học từ mới</a>
	</div>
</div>

<style>
	.loi-trang {
		max-width: 620px;
		display: grid;
		gap: 18px;
		padding-top: 30px;
	}
	.ma {
		margin: 0;
		font-size: 4rem;
		font-weight: 900;
		color: var(--xanh-nhat-2);
		line-height: 1;
	}
	.nut-ds {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
</style>
