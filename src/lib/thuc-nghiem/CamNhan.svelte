<!--
	Cau hoi thang 1–7 (cam nhan sau moi bo, do tu tin tiep can cong dong Diec), tra loi du moi gui duoc.
	luaChon: mot cau chon mot dap an dat truoc thang (vd. da tung gap nguoi Diec chua).
-->
<script lang="ts">
	import { untrack } from 'svelte';

	let {
		cauHoi,
		tieuDe = 'Cảm nhận về bộ từ vừa học',
		luaChon = null,
		onGui
	}: {
		cauHoi: readonly string[];
		tieuDe?: string;
		luaChon?: { cau: string; dapAn: readonly string[] } | null;
		/** diem: 1..7 moi cau; chon: so thu tu dap an luaChon (1..), null neu khong co */
		onGui: (diem: number[], chon: number | null) => void;
	} = $props();

	// trang duoc dung lai theo {#key} moi buoc, nen chi can gia tri ban dau
	let diem = $state<(number | null)[]>(untrack(() => cauHoi.map(() => null)));
	let chon = $state<number | null>(null);
	const du = $derived(diem.every((d) => d !== null) && (!luaChon || chon !== null));
</script>

<section class="the" data-testid="cam-nhan">
	<p class="nhan-nho">{tieuDe}</p>
	{#if luaChon}
		<fieldset>
			<legend>{luaChon.cau}</legend>
			<div class="lua-chon">
				{#each luaChon.dapAn as d, j (j)}
					<label class:chon={chon === j + 1}>
						<input type="radio" name="lua-chon" value={j + 1} bind:group={chon} />
						{d}
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}
	<p class="phu">1 = Hoàn toàn không đồng ý · 4 = Phân vân · 7 = Hoàn toàn đồng ý</p>
	{#each cauHoi as c, j (j)}
		<fieldset>
			<legend>{j + 1}. {c}</legend>
			<div class="thang">
				{#each [1, 2, 3, 4, 5, 6, 7] as so (so)}
					<label class:chon={diem[j] === so}>
						<input type="radio" name="cau-{j}" value={so} bind:group={diem[j]} />
						{so}
					</label>
				{/each}
			</div>
		</fieldset>
	{/each}
	<button class="nut" disabled={!du} onclick={() => onGui(diem as number[], chon)} data-testid="gui-cam-nhan">Gửi và tiếp tục</button>
</section>

<style>
	.phu {
		color: var(--chu-phu);
		margin: 0 0 12px;
	}
	fieldset {
		border: none;
		padding: 0;
		margin: 0 0 18px;
	}
	legend {
		font-weight: 800;
		margin-bottom: 8px;
	}
	.thang {
		display: grid;
		grid-template-columns: repeat(7, minmax(36px, 56px));
		gap: 6px;
	}
	.lua-chon {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.lua-chon label {
		padding: 10px 16px;
	}
	label {
		display: grid;
		place-items: center;
		padding: 10px 0;
		border-radius: var(--bo-nho);
		border: 1.5px solid var(--vien);
		background: var(--the);
		font-weight: 850;
		cursor: pointer;
	}
	label.chon {
		background: var(--xanh);
		border-color: var(--xanh);
		color: #fff;
	}
	input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
</style>
