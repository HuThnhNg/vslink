<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import Meo from '$lib/meo/Meo.svelte';
	import { tienDo } from '$lib/kho/tien-do.svelte';
	import Languages from '@lucide/svelte/icons/languages';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Gamepad2 from '@lucide/svelte/icons/gamepad-2';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Camera from '@lucide/svelte/icons/camera';
	import Hand from '@lucide/svelte/icons/hand';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Flame from '@lucide/svelte/icons/flame';
	import Clock from '@lucide/svelte/icons/clock';

	onMount(() => tienDo.nap());
	const canOn = $derived(tienDo.daNap ? tienDo.canOn().length : 0);

	const TINH_NANG = [
		{
			href: '/dich/',
			icon: Languages,
			ten: 'Dịch ký hiệu',
			mo_ta: 'Ký trước camera hoặc tải video lên — Mèo đoán từ và cho xem 5 khả năng gần nhất.',
			mau: 'xanh'
		},
		{
			href: '/hoc/',
			icon: GraduationCap,
			ten: 'Học 400 từ',
			mo_ta: 'Xem video mẫu, ký lại, được chấm từng lần: đúng/sai, bàn tay nào, đoạn nào khác mẫu.',
			mau: 'la'
		},
		{
			href: '/do-vui/',
			icon: Gamepad2,
			ten: 'Đố vui',
			mo_ta: 'Xem ký hiệu đoán nghĩa, hoặc thấy chữ tự ký. Vài phút mỗi ngày là nhớ lâu.',
			mau: 'vang'
		},
		{
			href: '/tien-do/',
			icon: Trophy,
			ten: 'Tiến độ',
			mo_ta: 'Chuỗi ngày học, số từ đã thuộc, lịch ôn tập hẹn đúng lúc sắp quên.',
			mau: 'hong'
		}
	];
</script>

<svelte:head>
	<title>VSLink — Dịch và học Ngôn ngữ Ký hiệu Việt Nam cùng Mèo</title>
</svelte:head>

<div class="khung-trang">
	<section class="hero">
		<div class="hero-chu">
			<p class="nhan-nho">Ngôn ngữ Ký hiệu Việt Nam</p>
			<h1>Bạn ký bằng tay,<br /><span class="to-dam">Mèo hiểu liền!</span></h1>
			<p class="mo-ta">
				VSLink nhận ra <b>400 từ ký hiệu</b> thông dụng qua camera, ngay trên trình duyệt. Dịch thử, học theo video mẫu,
				và nghe bạn chó Mèo nhận xét từng lần ký.
			</p>
			<div class="nut-ds">
				<a class="nut lon" href="{base}/dich/"><Camera size={20} /> Thử dịch ngay</a>
				<a class="nut phu lon" href="{base}/hoc/"><GraduationCap size={20} /> Học cùng Mèo</a>
			</div>
			{#if tienDo.soDaTap}
				<div class="quay-lai">
					<span><Flame size={16} /> Chuỗi {tienDo.chuoiNgay} ngày</span>
					{#if canOn}
						<a href="{base}/tien-do/"><Clock size={16} /> {canOn} từ cần ôn hôm nay</a>
					{:else}
						<span>Đã thuộc {tienDo.soDaThuoc} từ</span>
					{/if}
				</div>
			{/if}
		</div>

		<div class="hero-meo" aria-hidden="false">
			<div class="nen-tron"></div>
			<span class="the-noi t1">Cảm ơn</span>
			<span class="the-noi t2">Xin lỗi</span>
			<span class="the-noi t3">Yêu thương</span>
			<div class="meo-lon"><Meo tamTrang="vui" kichThuoc={200} /></div>
			<p class="bong-hero">
				Gâu! Mình là <b>Mèo</b> — chó thật đó, chỉ tên Mèo thôi. Mình ký được cả “Con chó” lẫn “Con mèo” nha!
			</p>
		</div>
	</section>

	<section class="so-lieu" aria-label="Vài con số">
		<div>
			<b>400</b>
			<span>từ thông dụng trong 19 chủ đề: gia đình, ăn uống, màu sắc…</span>
		</div>
		<div>
			<b>89,5%</b>
			<span>đoán đúng ngay lần đầu trên tập kiểm tra VSL400 (người ký mô hình chưa từng gặp)</span>
		</div>
		<div>
			<b>97,8%</b>
			<span>có từ đúng nằm trong 5 gợi ý Mèo đưa ra</span>
		</div>
		<div>
			<b>0</b>
			<span>hình ảnh gửi lên mạng — mọi xử lý diễn ra ngay trên máy bạn</span>
		</div>
	</section>

	<section class="buoc-lam">
		<h2>Dùng thế nào?</h2>
		<ol>
			<li class="the">
				<span class="so">1</span>
				<Camera size={26} />
				<h3>Bật camera</h3>
				<p>Ngồi lùi ra một chút cho thấy từ đầu đến bụng, đủ sáng phía trước mặt.</p>
			</li>
			<li class="the">
				<span class="so">2</span>
				<Hand size={26} />
				<h3>Giơ tay lên và ký</h3>
				<p>Không cần bấm nút: Mèo tự biết lúc bạn bắt đầu và lúc hạ tay xuống.</p>
			</li>
			<li class="the">
				<span class="so">3</span>
				<Sparkles size={26} />
				<h3>Xem Mèo nói gì</h3>
				<p>Từ đoán được kèm độ chắc chắn; khi học, Mèo chỉ ra chỗ nên sửa.</p>
			</li>
		</ol>
	</section>

	<section class="tinh-nang">
		{#each TINH_NANG as t (t.href)}
			<a class="the o-tinh-nang" href="{base}{t.href}" data-mau={t.mau}>
				<span class="bieu-tuong"><t.icon size={26} /></span>
				<h3>{t.ten}</h3>
				<p>{t.mo_ta}</p>
				<span class="di">Mở <ArrowRight size={16} /></span>
			</a>
		{/each}
	</section>

	<section class="hai-cot">
		<div class="the meo-nhin-ro">
			<h2><Lightbulb size={22} /> Để Mèo nhìn rõ</h2>
			<ul>
				<li><b>Ánh sáng phía trước mặt</b>, tránh ngồi quay lưng ra cửa sổ.</li>
				<li><b>Thấy từ đầu đến bụng</b>, cả hai khuỷu tay nằm trong khung hình.</li>
				<li><b>Bắt đầu và kết thúc với tay hạ xuống</b> — Mèo dựa vào đó để cắt đúng đoạn ký.</li>
				<li><b>Ký rõ, không quá nhanh</b>, như đang ký cho người mới học xem.</li>
			</ul>
		</div>
		<div class="the minh-bach">
			<h2><ShieldCheck size={22} /> Mèo làm việc minh bạch</h2>
			<p>
				Đúng hay sai là do <b>mô hình nhận dạng</b> quyết định (mô hình SPOTER — Boháček &amp; Hrúz, WACV Workshops
				2022 — huấn luyện trên bộ VSL400, nhận dạng dáng người bằng MediaPipe Holistic). AI (Gemini) chỉ giúp Mèo
				<b>diễn đạt lại</b> các số đo cho dễ hiểu.
			</p>
			<p>
				Mô hình học từ video quay chuẩn; ở nhà ánh sáng và góc máy khác nên Mèo vẫn có thể nhầm — vì vậy Mèo luôn cho
				xem 5 khả năng chứ không chỉ một.
			</p>
			<a href="{base}/kiem-tra/">Tự kiểm tra máy của bạn →</a>
		</div>
	</section>
</div>

<style>
	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
		gap: 28px;
		align-items: center;
		padding: 18px 0 34px;
	}
	@media (max-width: 860px) {
		.hero {
			grid-template-columns: 1fr;
			padding-top: 0;
		}
	}
	h1 {
		font-size: clamp(2.2rem, 5.4vw, 3.6rem);
		margin-bottom: 14px;
	}
	.to-dam {
		color: var(--xanh);
		background: linear-gradient(transparent 62%, color-mix(in srgb, var(--vang) 35%, transparent) 62%);
		padding: 0 4px;
		border-radius: 4px;
	}
	.mo-ta {
		font-size: 1.12rem;
		color: var(--chu-phu);
		max-width: 52ch;
	}
	.nut-ds {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 8px;
	}
	.nut.lon {
		min-height: 52px;
		padding: 12px 24px;
		font-size: 1.05rem;
	}
	.quay-lai {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 18px;
	}
	.quay-lai > * {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border-radius: 999px;
		background: var(--the);
		border: 1px solid var(--vien);
		font-weight: 750;
		font-size: 0.9rem;
		color: var(--chu-phu);
		text-decoration: none;
	}
	.quay-lai a {
		color: var(--vang-chu);
		border-color: color-mix(in srgb, var(--vang) 45%, transparent);
		background: var(--vang-nhat);
	}
	.hero-meo {
		position: relative;
		display: grid;
		justify-items: center;
		min-height: 360px;
		align-content: center;
	}
	.nen-tron {
		position: absolute;
		width: min(340px, 80vw);
		aspect-ratio: 1;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, var(--xanh-nhat-2), var(--xanh-nhat) 60%, transparent 72%);
		top: 50%;
		left: 50%;
		transform: translate(-50%, -58%);
	}
	.meo-lon {
		position: relative;
		animation: bong-benh 4s ease-in-out infinite;
	}
	@keyframes bong-benh {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-8px);
		}
	}
	.bong-hero {
		position: relative;
		margin: 14px 0 0;
		max-width: 340px;
		padding: 12px 16px;
		border-radius: 20px;
		background: var(--the);
		border: 1.5px solid var(--vien);
		box-shadow: var(--bong);
		font-weight: 650;
		text-align: center;
	}
	.bong-hero::before {
		content: '';
		position: absolute;
		top: -9px;
		left: 50%;
		width: 16px;
		height: 16px;
		background: inherit;
		border-left: inherit;
		border-top: inherit;
		transform: translateX(-50%) rotate(45deg);
		border-radius: 4px 0 0 0;
	}
	.the-noi {
		position: absolute;
		z-index: 1;
		padding: 7px 14px;
		border-radius: 999px;
		background: var(--the);
		border: 1.5px solid var(--vien);
		box-shadow: var(--bong-nhe);
		font-weight: 850;
		font-size: 0.92rem;
		animation: bong-benh 5s ease-in-out infinite;
	}
	.t1 {
		top: 8%;
		left: 6%;
		color: var(--xanh);
	}
	.t2 {
		top: 22%;
		right: 2%;
		color: var(--hong);
		animation-delay: -1.5s;
	}
	.t3 {
		top: 48%;
		left: 0;
		color: var(--xanh-la-chu);
		animation-delay: -3s;
	}
	@media (max-width: 520px) {
		.the-noi {
			display: none;
		}
	}
	.so-lieu {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 14px;
		margin-bottom: 40px;
	}
	@media (max-width: 860px) {
		.so-lieu {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	.so-lieu div {
		display: grid;
		gap: 4px;
		padding: 18px;
		border-radius: var(--bo);
		background: var(--the);
		border: 1px solid var(--vien);
	}
	.so-lieu b {
		font-size: clamp(1.8rem, 3.6vw, 2.4rem);
		font-weight: 900;
		color: var(--xanh);
		line-height: 1.1;
	}
	.so-lieu span {
		font-size: 0.9rem;
		color: var(--chu-phu);
		font-weight: 650;
	}
	.buoc-lam {
		margin-bottom: 40px;
	}
	.buoc-lam ol {
		list-style: none;
		margin: 16px 0 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 16px;
	}
	@media (max-width: 760px) {
		.buoc-lam ol {
			grid-template-columns: 1fr;
		}
	}
	.buoc-lam li {
		position: relative;
		color: var(--xanh);
	}
	.buoc-lam li h3 {
		margin-top: 10px;
		color: var(--chu);
	}
	.buoc-lam li p {
		margin: 0;
		color: var(--chu-phu);
	}
	.buoc-lam .so {
		position: absolute;
		top: 16px;
		right: 18px;
		font-size: 2.6rem;
		font-weight: 900;
		line-height: 1;
		color: var(--xanh-nhat-2);
	}
	.tinh-nang {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 16px;
		margin-bottom: 40px;
	}
	@media (max-width: 980px) {
		.tinh-nang {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 560px) {
		.tinh-nang {
			grid-template-columns: 1fr;
		}
	}
	.o-tinh-nang {
		display: grid;
		gap: 6px;
		align-content: start;
		color: var(--chu);
		text-decoration: none;
		transition:
			transform 0.15s ease,
			border-color 0.15s ease;
	}
	.o-tinh-nang:hover {
		transform: translateY(-3px);
		border-color: var(--xanh);
	}
	.o-tinh-nang h3 {
		margin: 6px 0 0;
	}
	.o-tinh-nang p {
		margin: 0;
		color: var(--chu-phu);
		font-size: 0.95rem;
	}
	.bieu-tuong {
		display: grid;
		place-items: center;
		width: 52px;
		height: 52px;
		border-radius: 16px;
	}
	[data-mau='xanh'] .bieu-tuong {
		background: var(--xanh-nhat);
		color: var(--xanh);
	}
	[data-mau='la'] .bieu-tuong {
		background: var(--xanh-la-nhat);
		color: var(--xanh-la-chu);
	}
	[data-mau='vang'] .bieu-tuong {
		background: var(--vang-nhat);
		color: var(--vang-chu);
	}
	[data-mau='hong'] .bieu-tuong {
		background: color-mix(in srgb, var(--hong) 16%, var(--the));
		color: var(--hong);
	}
	.di {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		margin-top: 6px;
		color: var(--xanh-chu);
		font-weight: 850;
	}
	.hai-cot {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}
	@media (max-width: 860px) {
		.hai-cot {
			grid-template-columns: 1fr;
		}
	}
	.hai-cot h2 {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 1.3rem;
	}
	.hai-cot h2 :global(svg) {
		color: var(--xanh);
	}
	.meo-nhin-ro ul {
		margin: 0;
		padding-left: 1.2em;
		display: grid;
		gap: 8px;
		color: var(--chu-phu);
	}
	.meo-nhin-ro b,
	.minh-bach b {
		color: var(--chu);
	}
	.minh-bach p {
		color: var(--chu-phu);
	}
	.minh-bach a {
		font-weight: 800;
	}
</style>
