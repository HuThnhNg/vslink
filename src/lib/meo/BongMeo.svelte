<!--
	Meo + bong noi. Noi dung: `cau` (chu) hoac children (tu soan). dangNghi = ba cham nhay.
	nguon: 'ai' | 'mau' -> ghi chu nho de nguoi hoc biet cau nhan xet den tu dau.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Meo from './Meo.svelte';
	import type { TamTrang } from './loi-meo';

	let {
		tamTrang = 'cho',
		cau = '',
		dangNghi = false,
		nguon = null,
		kichThuoc = 104,
		children
	}: {
		tamTrang?: TamTrang;
		cau?: string;
		dangNghi?: boolean;
		nguon?: 'ai' | 'mau' | null;
		kichThuoc?: number;
		children?: Snippet;
	} = $props();
</script>

<div class="bong-meo">
	<div class="meo-o"><Meo {tamTrang} {kichThuoc} /></div>
	<div class="bong" aria-live="polite">
		{#if dangNghi}
			<span class="dang-nghi" role="status" aria-label="Mèo đang nghĩ"><i></i><i></i><i></i></span>
		{:else if children}
			{@render children()}
		{:else}
			<p data-testid="loi-meo" data-nguon={nguon ?? ''}>{cau}</p>
		{/if}
		{#if nguon && !dangNghi}
			<small class="nguon">
				{nguon === 'ai'
					? 'Mèo diễn đạt bằng AI (Gemini) từ số đo của mô hình — đúng/sai do mô hình chấm.'
					: 'Lời Mèo soạn sẵn từ số đo của mô hình.'}
			</small>
		{/if}
	</div>
</div>

<style>
	.bong-meo {
		display: flex;
		align-items: flex-end;
		gap: 12px;
	}
	.meo-o {
		flex: none;
		margin-bottom: -4px;
	}
	.bong {
		position: relative;
		flex: 1;
		min-width: 0;
		background: var(--xanh-nhat);
		border: 1.5px solid color-mix(in srgb, var(--xanh) 22%, transparent);
		border-radius: 20px 20px 20px 6px;
		padding: 12px 16px;
		font-weight: 650;
		margin-bottom: 18px;
	}
	.bong::before {
		content: '';
		position: absolute;
		left: -10px;
		bottom: 8px;
		width: 16px;
		height: 16px;
		background: inherit;
		border-left: inherit;
		border-bottom: inherit;
		transform: rotate(45deg);
		border-radius: 0 0 0 4px;
	}
	.bong :global(p) {
		margin: 0;
	}
	.nguon {
		display: block;
		margin-top: 6px;
		font-size: 0.76rem;
		font-weight: 650;
		color: var(--chu-phu);
	}
	.dang-nghi {
		display: inline-flex;
		gap: 5px;
		padding: 6px 0;
	}
	.dang-nghi i {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--xanh);
		animation: nhun 1s ease-in-out infinite;
	}
	.dang-nghi i:nth-child(2) {
		animation-delay: 0.15s;
	}
	.dang-nghi i:nth-child(3) {
		animation-delay: 0.3s;
	}
	@keyframes nhun {
		0%,
		100% {
			transform: translateY(0);
			opacity: 0.45;
		}
		50% {
			transform: translateY(-5px);
			opacity: 1;
		}
	}
</style>
