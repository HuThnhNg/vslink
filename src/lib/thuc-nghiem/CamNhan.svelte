<!-- Cam nhan sau mot bo tu: moi cau thang 1–7, tra loi du moi gui duoc. -->
<script lang="ts">
	import { untrack } from 'svelte';

	let {
		cauHoi,
		onGui
	}: {
		cauHoi: readonly string[];
		onGui: (diem: number[]) => void;
	} = $props();

	// trang duoc dung lai theo {#key} moi buoc, nen chi can gia tri ban dau
	let diem = $state<(number | null)[]>(untrack(() => cauHoi.map(() => null)));
	const du = $derived(diem.every((d) => d !== null));
</script>

<section class="the" data-testid="cam-nhan">
	<p class="nhan-nho">Cảm nhận về bộ từ vừa học</p>
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
	<button class="nut" disabled={!du} onclick={() => onGui(diem as number[])} data-testid="gui-cam-nhan">Gửi và tiếp tục</button>
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
