<!--
	Tien do: chuoi ngay, so tu da thuoc, lich 4 tuan, tu den han on, hop Leitner,
	tien do tung chu de. Du lieu chi nam tren may nay (localStorage).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { HOP_CAO_NHAT, HOP_THUOC, KHOANG_ON, ngayKhoa, tienDo } from '$lib/kho/tien-do.svelte';
	import { TU_VUNG } from '$lib/loi/tu-vung';
	import { phanTram } from '$lib/loi/dinh-dang';
	import BongMeo from '$lib/meo/BongMeo.svelte';
	import Flame from '@lucide/svelte/icons/flame';
	import Star from '@lucide/svelte/icons/star';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Target from '@lucide/svelte/icons/target';
	import Clock from '@lucide/svelte/icons/clock';
	import Trash from '@lucide/svelte/icons/trash';

	const NGAY_MS = 86_400_000;
	const THU = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

	let bayGio = $state(Date.now());
	onMount(() => {
		tienDo.nap();
		bayGio = Date.now();
	});

	const canOn = $derived(tienDo.daNap ? tienDo.canOn(bayGio) : []);
	const sapToi = $derived(
		Object.values(tienDo.tu).filter((b) => b.hanOn > bayGio && b.hanOn <= bayGio + 7 * NGAY_MS).length
	);

	/** 4 tuan gan nhat, bat dau tu thu Hai, 7 cot. */
	const lich = $derived.by(() => {
		const homNay = new Date(bayGio);
		homNay.setHours(12, 0, 0, 0);
		const thu = (homNay.getDay() + 6) % 7; // 0 = thu Hai
		const dau = homNay.getTime() - (thu + 21) * NGAY_MS;
		return Array.from({ length: 28 }, (_, j) => {
			const t = dau + j * NGAY_MS;
			const khoa = ngayKhoa(t);
			const so = tienDo.ngay[khoa] ?? 0;
			return { khoa, ngay: new Date(t).getDate(), so, tuongLai: t > homNay.getTime(), homNay: khoa === ngayKhoa(bayGio) };
		});
	});
	const mucLich = (so: number) => (so === 0 ? 0 : so < 5 ? 1 : so < 15 ? 2 : 3);

	const hop = $derived.by(() => {
		const dem = Array.from({ length: HOP_CAO_NHAT + 1 }, () => 0);
		for (const b of Object.values(tienDo.tu)) dem[b.hop]++;
		return dem;
	});
	const hopMax = $derived(Math.max(1, ...hop.slice(1)));

	const chuDe = $derived(
		TU_VUNG.chu_de.map((c) => {
			const tu = TU_VUNG.tu.filter((t) => t.chu_de === c.ma);
			const thuoc = tu.filter((t) => (tienDo.tu[t.i]?.hop ?? 0) >= HOP_THUOC).length;
			const tap = tu.filter((t) => tienDo.tu[t.i]).length;
			return { ...c, tong: tu.length, thuoc, tap };
		})
	);

	const loiMeo = $derived.by(() => {
		if (!tienDo.soDaTap) return 'Chưa có gì ở đây cả… Học từ đầu tiên với Mèo nhé! Mèo sẽ ghi lại và nhắc bạn ôn đúng lúc.';
		if (canOn.length) return `Hôm nay có ${canOn.length} từ đến hạn ôn. Ôn đúng lúc là nhớ lâu nhất đó!`;
		if (tienDo.chuoiNgay >= 3) return `Chuỗi ${tienDo.chuoiNgay} ngày liền! Mèo tự hào về bạn ghê.`;
		return 'Không có từ nào đến hạn. Học thêm từ mới hoặc chơi đố vui nha!';
	});

	function xoa() {
		if (confirm('Xoá toàn bộ tiến độ học trên máy này? Không lấy lại được đâu nhé.')) tienDo.xoaHet();
	}
</script>

<svelte:head><title>Tiến độ · VSLink</title></svelte:head>

<div class="khung-trang">
	<header class="dau-trang">
		<div>
			<p class="nhan-nho">Tiến độ</p>
			<h1>Hành trình của bạn</h1>
		</div>
		<div class="loi-meo">
			<BongMeo tamTrang={canOn.length ? 'co-vu' : tienDo.soDaTap ? 'vui' : 'cho'} kichThuoc={82} cau={loiMeo} />
		</div>
	</header>

	<div class="so-lieu">
		<div class="the o-so lua">
			<Flame size={26} />
			<b data-testid="chuoi-ngay">{tienDo.chuoiNgay}</b>
			<span>ngày liên tiếp</span>
		</div>
		<div class="the o-so vang">
			<Star size={26} />
			<b>{tienDo.soDaThuoc}<small>/400</small></b>
			<span>từ đã thuộc</span>
		</div>
		<div class="the o-so xanh">
			<BookOpen size={26} />
			<b>{tienDo.soDaTap}</b>
			<span>từ đã tập</span>
		</div>
		<div class="the o-so la">
			<Target size={26} />
			<b>{tienDo.tongLuot ? phanTram(tienDo.tiLeDung) : '–'}</b>
			<span>ký đúng · {tienDo.tongLuot} lượt</span>
		</div>
	</div>

	<div class="luoi">
		<section class="the">
			<h2>Cần ôn hôm nay</h2>
			{#if canOn.length}
				<div class="chip-ds">
					{#each canOn.slice(0, 40) as i (i)}
						<a class="chip" href="{base}/hoc/?tu={i}"><Clock size={14} /> {TU_VUNG.tu[i].tu}</a>
					{/each}
					{#if canOn.length > 40}<span class="chip">+{canOn.length - 40} từ</span>{/if}
				</div>
				<a class="nut on-ngay" href="{base}/hoc/?tu={canOn[0]}">Ôn ngay</a>
			{:else}
				<p class="phu-de">Không có từ nào đến hạn. {#if sapToi}Có {sapToi} từ sẽ đến hạn trong 7 ngày tới.{/if}</p>
				<a class="nut phu" href="{base}/hoc/">Học từ mới</a>
			{/if}
		</section>

		<section class="the">
			<h2>4 tuần gần đây</h2>
			<div class="lich" role="img" aria-label="Số lượt học mỗi ngày trong 4 tuần gần đây">
				{#each THU as t (t)}<span class="thu">{t}</span>{/each}
				{#each lich as o (o.khoa)}
					<span
						class="o-ngay muc-{mucLich(o.so)}"
						class:tuong-lai={o.tuongLai}
						class:hom-nay={o.homNay}
						title="{o.khoa}: {o.so} lượt"
					>{o.ngay}</span>
				{/each}
			</div>
			<p class="chu-thich">
				<span class="o-ngay muc-0"></span> không học
				<span class="o-ngay muc-1"></span> ít
				<span class="o-ngay muc-3"></span> chăm chỉ
			</p>
		</section>

		<section class="the">
			<h2>Hộp ôn tập</h2>
			<p class="phu-de">
				Ký đúng thì từ lên hộp cao hơn và được hẹn ôn thưa dần; ký sai thì về hộp 1 để ôn lại ngày mai. Từ hộp {HOP_THUOC}
				trở lên được coi là đã thuộc.
			</p>
			<div class="hop">
				{#each hop.slice(1) as so, j (j)}
					<div class="cot-hop">
						<span class="so">{so}</span>
						<span class="cot" style:height="{(so / hopMax) * 100}%" class:thuoc={j + 1 >= HOP_THUOC}></span>
						<span class="ten">Hộp {j + 1}</span>
						<small>{KHOANG_ON[j + 1]} ngày</small>
					</div>
				{/each}
			</div>
			<p class="nguon">
				Phương pháp hộp Leitner (S. Leitner, <i>So lernt man lernen</i>, 1972) dựa trên hiệu ứng ôn giãn cách
				(Cepeda và cộng sự, <i>Psychological Bulletin</i>, 2006).
			</p>
		</section>

		<section class="the">
			<h2>Theo chủ đề</h2>
			<ul class="chu-de">
				{#each chuDe as c (c.ma)}
					<li>
						<span class="ten">{c.ten}</span>
						<span class="thanh" aria-hidden="true">
							<i class="tap" style:width="{(c.tap / c.tong) * 100}%"></i>
							<i class="thuoc" style:width="{(c.thuoc / c.tong) * 100}%"></i>
						</span>
						<span class="so">{c.thuoc}/{c.tong}</span>
					</li>
				{/each}
			</ul>
			<p class="chu-thich">
				<span class="mau thuoc"></span> đã thuộc <span class="mau tap"></span> đã tập
			</p>
		</section>
	</div>

	<section class="rieng-tu">
		<p>
			Tiến độ chỉ lưu trên trình duyệt của máy này (không cần tài khoản, không gửi đi đâu). Xoá dữ liệu trình duyệt là
			mất tiến độ.
		</p>
		<button class="nut vien nho" onclick={xoa} disabled={!tienDo.soDaTap && !Object.keys(tienDo.ngay).length}>
			<Trash size={16} /> Xoá tiến độ
		</button>
	</section>
</div>

<style>
	.dau-trang {
		display: grid;
		grid-template-columns: auto minmax(0, 520px);
		justify-content: space-between;
		align-items: end;
		gap: 18px;
		margin-bottom: 18px;
	}
	@media (max-width: 820px) {
		.dau-trang {
			grid-template-columns: 1fr;
		}
	}
	.so-lieu {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 14px;
		margin-bottom: 18px;
	}
	@media (max-width: 820px) {
		.so-lieu {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	.o-so {
		display: grid;
		gap: 2px;
		padding: 16px 18px;
	}
	.o-so b {
		font-size: 2rem;
		font-weight: 900;
		line-height: 1.1;
		color: var(--chu);
	}
	.o-so b small {
		font-size: 1rem;
		color: var(--chu-phu);
	}
	.o-so span {
		color: var(--chu-phu);
		font-weight: 750;
		font-size: 0.9rem;
	}
	.o-so.lua :global(svg) {
		color: #f76b15;
	}
	.o-so.vang :global(svg) {
		color: var(--vang-chu);
	}
	.o-so.xanh :global(svg) {
		color: var(--xanh);
	}
	.o-so.la :global(svg) {
		color: var(--xanh-la-chu);
	}
	.luoi {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18px;
		align-items: start;
	}
	@media (max-width: 900px) {
		.luoi {
			grid-template-columns: 1fr;
		}
	}
	h2 {
		font-size: 1.2rem;
	}
	.chip-ds {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.chip-ds a {
		text-decoration: none;
		color: var(--vang-chu);
		border-color: color-mix(in srgb, var(--vang) 45%, transparent);
		background: var(--vang-nhat);
	}
	.on-ngay {
		margin-top: 14px;
	}
	.lich {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 6px;
		max-width: 420px;
	}
	.thu {
		text-align: center;
		font-size: 0.75rem;
		font-weight: 800;
		color: var(--chu-phu);
	}
	.o-ngay {
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		border-radius: 9px;
		font-size: 0.78rem;
		font-weight: 800;
		color: var(--chu-phu);
		background: var(--nen-2);
	}
	.o-ngay.muc-1 {
		background: color-mix(in srgb, var(--xanh) 25%, var(--the));
		color: var(--xanh-dam);
	}
	.o-ngay.muc-2 {
		background: color-mix(in srgb, var(--xanh) 55%, var(--the));
		color: #fff;
	}
	.o-ngay.muc-3 {
		background: var(--nut);
		color: #fff;
	}
	.o-ngay.tuong-lai {
		opacity: 0.35;
	}
	.o-ngay.hom-nay {
		box-shadow: 0 0 0 2px var(--vang);
	}
	.chu-thich {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
		margin: 12px 0 0;
		font-size: 0.8rem;
		color: var(--chu-phu);
		font-weight: 700;
	}
	.chu-thich .o-ngay {
		width: 14px;
		height: 14px;
		border-radius: 4px;
		margin-left: 6px;
	}
	.hop {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 10px;
		align-items: end;
		height: 170px;
	}
	.cot-hop {
		display: grid;
		grid-template-rows: auto 1fr auto auto;
		justify-items: center;
		height: 100%;
		font-weight: 800;
	}
	.cot-hop .cot {
		align-self: end;
		width: 70%;
		min-height: 4px;
		border-radius: 10px 10px 4px 4px;
		background: color-mix(in srgb, var(--xanh) 45%, var(--the));
		transition: height 0.4s ease;
	}
	.cot-hop .cot.thuoc {
		background: var(--xanh-la);
	}
	.cot-hop .so {
		font-size: 0.9rem;
	}
	.cot-hop .ten {
		font-size: 0.8rem;
		margin-top: 4px;
	}
	.cot-hop small {
		font-size: 0.72rem;
		color: var(--chu-phu);
	}
	.nguon {
		margin: 12px 0 0;
		font-size: 0.78rem;
		color: var(--chu-phu);
	}
	.chu-de {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 8px;
	}
	.chu-de li {
		display: grid;
		grid-template-columns: minmax(0, 10em) 1fr 3.4em;
		align-items: center;
		gap: 10px;
		font-weight: 750;
		font-size: 0.92rem;
	}
	.chu-de .ten {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.chu-de .thanh {
		position: relative;
		height: 10px;
		border-radius: 999px;
		background: var(--nen-2);
		overflow: hidden;
	}
	.chu-de .thanh i {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		border-radius: inherit;
	}
	.chu-de .thanh i.tap,
	.mau.tap {
		background: color-mix(in srgb, var(--xanh) 35%, var(--the));
	}
	.chu-de .thanh i.thuoc,
	.mau.thuoc {
		background: var(--xanh-la);
	}
	.chu-de .so {
		text-align: right;
		color: var(--chu-phu);
		font-variant-numeric: tabular-nums;
	}
	.mau {
		display: inline-block;
		width: 14px;
		height: 10px;
		border-radius: 999px;
	}
	.rieng-tu {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-top: 22px;
		color: var(--chu-phu);
		font-size: 0.9rem;
	}
	.rieng-tu p {
		margin: 0;
		max-width: 70ch;
	}
</style>
