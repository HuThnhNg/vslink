<!--
	Thu vien 400 tu: tim khong dau, loc theo chu de va theo tien do (can on / dang hoc /
	da thuoc / chua hoc). Bam mot tu -> trang tap tu do (/hoc/?tu=i).
-->
<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { HOP_CAO_NHAT, HOP_THUOC, tienDo } from '$lib/kho/tien-do.svelte';
	import { boDau, TEN_CHU_DE, TU_VUNG, xaoTron } from '$lib/loi/tu-vung';
	import BongMeo from '$lib/meo/BongMeo.svelte';
	import Search from '@lucide/svelte/icons/search';
	import Star from '@lucide/svelte/icons/star';
	import Clock from '@lucide/svelte/icons/clock';
	import Shuffle from '@lucide/svelte/icons/shuffle';
	import X from '@lucide/svelte/icons/x';

	let { giaLap = false }: { giaLap?: boolean } = $props();

	type Loc = 'tat-ca' | 'can-on' | 'dang-hoc' | 'da-thuoc' | 'chua-hoc';
	const LOC: { ma: Loc; ten: string }[] = [
		{ ma: 'tat-ca', ten: 'Tất cả' },
		{ ma: 'can-on', ten: 'Cần ôn' },
		{ ma: 'dang-hoc', ten: 'Đang học' },
		{ ma: 'da-thuoc', ten: 'Đã thuộc' },
		{ ma: 'chua-hoc', ten: 'Chưa học' }
	];
	const CHI_MUC = TU_VUNG.tu.map((t) => boDau(t.tu));

	let tim = $state('');
	let chuDe = $state('tat-ca');
	let loc = $state<Loc>('tat-ca');

	const canOn = $derived(new Set(tienDo.canOn()));
	const q = $derived(boDau(tim));
	const ds = $derived(
		TU_VUNG.tu.filter((t) => {
			if (chuDe !== 'tat-ca' && t.chu_de !== chuDe) return false;
			if (q && !CHI_MUC[t.i].includes(q)) return false;
			const b = tienDo.tu[t.i];
			if (loc === 'can-on') return canOn.has(t.i);
			if (loc === 'da-thuoc') return !!b && b.hop >= HOP_THUOC;
			if (loc === 'dang-hoc') return !!b && b.hop < HOP_THUOC;
			if (loc === 'chua-hoc') return !b;
			return true;
		})
	);
	const dauOn = $derived(tienDo.canOn()[0]);
	const hauTo = $derived(giaLap ? '&gia-lap=1' : '');

	function ngauNhien() {
		const chua = TU_VUNG.tu.filter((t) => !tienDo.daThuoc(t.i) && (chuDe === 'tat-ca' || t.chu_de === chuDe));
		const t = xaoTron(chua.length ? chua : TU_VUNG.tu)[0];
		goto(`${base}/hoc/?tu=${t.i}${hauTo}`);
	}
</script>

<div class="khung-trang">
	<header class="dau-trang">
		<div class="gioi-thieu">
			<p class="nhan-nho">Học tập</p>
			<h1>Thư viện 400 từ</h1>
			<p class="phu-de">
				Chọn một từ → xem video mẫu → ký lại trước camera. Mèo chấm bằng mô hình nhận dạng và chỉ ra chỗ nên sửa.
			</p>
			<div class="hanh-dong">
				{#if dauOn !== undefined}
					<a class="nut" href="{base}/hoc/?tu={dauOn}{hauTo}"><Clock size={18} /> Ôn {canOn.size} từ đến hạn</a>
				{/if}
				<button class={dauOn !== undefined ? 'nut phu' : 'nut'} onclick={ngauNhien}>
					<Shuffle size={18} /> Học một từ ngẫu nhiên
				</button>
			</div>
		</div>
		<div class="thong-ke the">
			<BongMeo tamTrang={tienDo.soDaThuoc ? 'vui' : 'cho'} kichThuoc={78}>
				<p>
					{#if tienDo.soDaTap === 0}
						Chưa học từ nào — bắt đầu với chủ đề <b>Gia đình</b> nhé!
					{:else}
						Bạn đã thuộc <b>{tienDo.soDaThuoc}</b> từ, đang tập <b>{tienDo.soDaTap - tienDo.soDaThuoc}</b> từ.
					{/if}
				</p>
			</BongMeo>
		</div>
	</header>

	<div class="bo-loc the">
		<label class="o-tim">
			<Search size={18} />
			<input type="search" placeholder="Tìm từ, gõ không dấu cũng được…" bind:value={tim} aria-label="Tìm từ" />
			{#if tim}
				<button class="xoa" onclick={() => (tim = '')} aria-label="Xoá ô tìm"><X size={16} /></button>
			{/if}
		</label>
		<div class="hang-chip" role="group" aria-label="Lọc theo tiến độ">
			{#each LOC as l (l.ma)}
				<button class="chip" aria-pressed={loc === l.ma} onclick={() => (loc = l.ma)}>
					{l.ten}{#if l.ma === 'can-on' && canOn.size}&nbsp;<span class="dem">{canOn.size}</span>{/if}
				</button>
			{/each}
		</div>
		<div class="hang-chip cuon" role="group" aria-label="Lọc theo chủ đề">
			<button class="chip" aria-pressed={chuDe === 'tat-ca'} onclick={() => (chuDe = 'tat-ca')}>Mọi chủ đề</button>
			{#each TU_VUNG.chu_de as c (c.ma)}
				<button class="chip" aria-pressed={chuDe === c.ma} onclick={() => (chuDe = c.ma)}>{c.ten}</button>
			{/each}
		</div>
	</div>

	<p class="so-luong" aria-live="polite">{ds.length} từ</p>

	{#if ds.length}
		<ul class="luoi-tu">
			{#each ds as t (t.i)}
				{@const b = tienDo.tu[t.i]}
				<li>
					<a
						class="the-tu"
						href="{base}/hoc/?tu={t.i}{hauTo}"
						data-trang-thai={canOn.has(t.i) ? 'can-on' : b && b.hop >= HOP_THUOC ? 'da-thuoc' : b ? 'dang-hoc' : 'moi'}
					>
						<span class="ten">{t.tu}</span>
						<span class="chu-de">{TEN_CHU_DE[t.chu_de]}</span>
						<span class="huy-hieu">
							{#if canOn.has(t.i)}
								<Clock size={13} /> Cần ôn
							{:else if b && b.hop >= HOP_THUOC}
								<Star size={13} /> Đã thuộc
							{:else if b}
								<span class="cham-hop" aria-label="Hộp {b.hop}/{HOP_CAO_NHAT}">
									{#each { length: HOP_CAO_NHAT } as _, k (k)}<i class:day={k < b.hop}></i>{/each}
								</span>
							{/if}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="rong the">
			<BongMeo tamTrang="boi-roi" cau="Mèo tìm hoài không thấy từ nào như vậy. Thử bỏ bớt bộ lọc hoặc gõ từ khác nhé." />
		</div>
	{/if}
</div>

<style>
	.dau-trang {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
		gap: 20px;
		align-items: end;
		margin-bottom: 18px;
	}
	@media (max-width: 820px) {
		.dau-trang {
			grid-template-columns: 1fr;
		}
	}
	.gioi-thieu .phu-de {
		max-width: 58ch;
	}
	.hanh-dong {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.thong-ke {
		padding: 16px 18px 6px;
	}
	.thong-ke p {
		margin: 0;
	}
	.bo-loc {
		display: grid;
		gap: 12px;
		padding: 14px;
		position: sticky;
		top: 72px;
		z-index: 5;
	}
	@media (max-width: 820px) {
		.bo-loc {
			position: static;
		}
	}
	.o-tim {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 14px;
		min-height: 48px;
		border-radius: 999px;
		border: 2px solid var(--vien);
		background: var(--nen);
		color: var(--chu-phu);
	}
	.o-tim:focus-within {
		border-color: var(--xanh);
	}
	.o-tim input {
		flex: 1;
		min-width: 0;
		border: 0;
		outline: 0;
		background: transparent;
		font-size: 1rem;
		font-weight: 650;
		color: var(--chu);
	}
	.xoa {
		display: grid;
		place-items: center;
		border: 0;
		background: var(--vien);
		width: 26px;
		height: 26px;
		border-radius: 50%;
		cursor: pointer;
		color: var(--chu);
	}
	.hang-chip {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.hang-chip.cuon {
		flex-wrap: nowrap;
		overflow-x: auto;
		padding-bottom: 4px;
		scrollbar-width: thin;
	}
	.dem {
		display: inline-grid;
		place-items: center;
		min-width: 20px;
		height: 20px;
		padding: 0 6px;
		border-radius: 999px;
		background: var(--vang);
		color: #fff;
		font-size: 0.75rem;
	}
	.so-luong {
		margin: 14px 4px 10px;
		color: var(--chu-phu);
		font-weight: 750;
		font-size: 0.9rem;
	}
	.luoi-tu {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
		gap: 12px;
	}
	.the-tu {
		display: grid;
		gap: 2px;
		height: 100%;
		padding: 14px 14px 12px;
		border-radius: var(--bo-vua);
		background: var(--the);
		border: 1.5px solid var(--vien);
		color: var(--chu);
		text-decoration: none;
		transition:
			transform 0.15s ease,
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}
	.the-tu:hover {
		transform: translateY(-2px);
		border-color: var(--xanh);
		box-shadow: var(--bong-nhe);
	}
	.ten {
		font-weight: 850;
		font-size: 1.05rem;
		line-height: 1.25;
	}
	.chu-de {
		font-size: 0.8rem;
		color: var(--chu-phu);
		font-weight: 700;
	}
	.huy-hieu {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		min-height: 20px;
		margin-top: 6px;
		font-size: 0.78rem;
		font-weight: 800;
	}
	[data-trang-thai='can-on'] {
		border-color: color-mix(in srgb, var(--vang) 60%, transparent);
		background: linear-gradient(180deg, var(--vang-nhat), var(--the) 70%);
	}
	[data-trang-thai='can-on'] .huy-hieu {
		color: var(--vang-chu);
	}
	[data-trang-thai='da-thuoc'] {
		background: linear-gradient(180deg, var(--xanh-la-nhat), var(--the) 70%);
	}
	[data-trang-thai='da-thuoc'] .huy-hieu {
		color: var(--xanh-la-chu);
	}
	.cham-hop {
		display: inline-flex;
		gap: 3px;
	}
	.cham-hop i {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--vien);
	}
	.cham-hop i.day {
		background: var(--xanh);
	}
	.rong {
		max-width: 560px;
	}
</style>
