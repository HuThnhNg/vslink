<!--
	5 tu mo hinh nghi den nhieu nhat, kem thanh xac suat. Tu dang tap (mucTieu) luon
	duoc hien — ke ca khi nam ngoai top 5 — de nguoi hoc biet no dung hang may.
-->
<script lang="ts">
	import { base } from '$app/paths';
	import type { DuDoan } from '$lib/loi/danh-gia';
	import { phanTram } from '$lib/loi/dinh-dang';

	type MucTieu = { i: number; tu: string; hang: number; p: number };
	let {
		ds,
		mucTieu = null,
		lienKet = false
	}: {
		ds: DuDoan[];
		mucTieu?: MucTieu | null;
		/** moi tu la link sang trang tap tu do */
		lienKet?: boolean;
	} = $props();

	const ngoaiTop = $derived(mucTieu !== null && !ds.some((d) => d.i === mucTieu.i));
	const rong = (p: number) => `${Math.max(p * 100, 1.5)}%`;
</script>

<ol class="top5" data-testid="top5">
	{#each ds as d, k (d.i)}
		<li class:dau={k === 0} class:muc-tieu={mucTieu?.i === d.i}>
			<span class="hang">{k + 1}</span>
			{#if lienKet}
				<a class="tu" href="{base}/hoc/?tu={d.i}" title="Học từ “{d.tu}”">{d.tu}</a>
			{:else}
				<span class="tu">{d.tu}</span>
			{/if}
			<span class="thanh" aria-hidden="true"><i style:width={rong(d.p)}></i></span>
			<span class="so">{phanTram(d.p)}</span>
		</li>
	{/each}
	{#if ngoaiTop && mucTieu}
		<li class="muc-tieu ngoai">
			<span class="hang">{mucTieu.hang}</span>
			<span class="tu">{mucTieu.tu}</span>
			<span class="thanh" aria-hidden="true"><i style:width={rong(mucTieu.p)}></i></span>
			<span class="so">{phanTram(mucTieu.p)}</span>
		</li>
	{/if}
</ol>

<style>
	.top5 {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 6px;
	}
	li {
		display: grid;
		grid-template-columns: 1.8em minmax(0, 9.5em) minmax(40px, 1fr) 3.4em;
		align-items: center;
		gap: 10px;
		padding: 6px 10px;
		border-radius: var(--bo-nho);
		font-weight: 700;
	}
	li.ngoai {
		margin-top: 4px;
		position: relative;
	}
	li.ngoai::before {
		content: '⋯';
		position: absolute;
		top: -14px;
		left: 14px;
		color: var(--chu-phu);
		font-size: 0.8rem;
	}
	li.muc-tieu {
		background: var(--xanh-la-nhat);
		box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--xanh-la) 55%, transparent);
	}
	.hang {
		display: grid;
		place-items: center;
		width: 1.8em;
		height: 1.8em;
		border-radius: 50%;
		background: var(--xanh-nhat);
		color: var(--xanh-dam);
		font-size: 0.85rem;
		font-weight: 850;
	}
	.dau .hang {
		background: var(--nut);
		color: #fff;
	}
	.tu {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--chu);
		text-decoration: none;
	}
	a.tu:hover {
		color: var(--xanh);
		text-decoration: underline;
	}
	.dau .tu {
		font-weight: 850;
	}
	.thanh {
		height: 10px;
		border-radius: 999px;
		background: var(--xanh-nhat);
		overflow: hidden;
	}
	.thanh i {
		display: block;
		height: 100%;
		border-radius: inherit;
		background: color-mix(in srgb, var(--xanh) 55%, transparent);
		transition: width 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.dau .thanh i {
		background: var(--xanh);
	}
	.muc-tieu .thanh i {
		background: var(--xanh-la);
	}
	.so {
		text-align: right;
		font-variant-numeric: tabular-nums;
		color: var(--chu-phu);
		font-size: 0.92rem;
	}
</style>
