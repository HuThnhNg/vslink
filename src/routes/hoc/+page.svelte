<!--
	/hoc/          -> thu vien 400 tu
	/hoc/?tu=12    -> tap tu so 12 (doc query SAU khi hydrate: trang duoc dung san,
	                  luc build chua biet query)
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { tienDo } from '$lib/kho/tien-do.svelte';
	import { TU_VUNG } from '$lib/loi/tu-vung';
	import ThuVien from '$lib/hoc/ThuVien.svelte';
	import LuyenTap from '$lib/hoc/LuyenTap.svelte';

	let daSan = $state(false);
	onMount(() => {
		tienDo.nap();
		daSan = true;
	});

	const tuChon = $derived.by(() => {
		if (!daSan) return null;
		const s = page.url.searchParams.get('tu');
		if (s === null || s === '') return null;
		const i = Number(s);
		return Number.isInteger(i) && i >= 0 && i < TU_VUNG.tu.length ? TU_VUNG.tu[i] : null;
	});
	const giaLap = $derived(daSan && page.url.searchParams.has('gia-lap'));
</script>

<svelte:head>
	<title>{tuChon ? `Tập ký “${tuChon.tu}”` : 'Học 400 từ'} · VSLink</title>
</svelte:head>

{#if tuChon}
	<LuyenTap tu={tuChon} {giaLap} />
{:else}
	<ThuVien {giaLap} />
{/if}
