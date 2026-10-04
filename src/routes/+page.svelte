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
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import Users from '@lucide/svelte/icons/users';
	import MessageCircleHeart from '@lucide/svelte/icons/message-circle-heart';
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
			ten: 'Dịch từng từ',
			mo_ta: 'Ký một từ trước camera, Mèo cho biết đó là từ gì. Có thể tải video lên thay cho camera.',
			mau: 'xanh'
		},
		{
			href: '/dich/?che=cau',
			icon: MessagesSquare,
			ten: 'Ghép thành câu',
			mo_ta: 'Ký lần lượt từng từ, Mèo sắp xếp lại thành một câu tiếng Việt hoàn chỉnh.',
			mau: 'tim'
		},
		{
			href: '/hoc/',
			icon: GraduationCap,
			ten: 'Học 400 từ',
			mo_ta: 'Xem video mẫu rồi ký lại. Mèo chấm từng lần và chỉ ra bàn tay hay đoạn nào cần sửa.',
			mau: 'la'
		},
		{
			href: '/do-vui/',
			icon: Gamepad2,
			ten: 'Đố vui',
			mo_ta: 'Xem ký hiệu rồi đoán nghĩa, hoặc thấy chữ rồi tự ký. Vài phút mỗi ngày là nhớ lâu.',
			mau: 'vang'
		},
		{
			href: '/tien-do/',
			icon: Trophy,
			ten: 'Tiến độ',
			mo_ta: 'Theo dõi chuỗi ngày học và số từ đã thuộc. Mèo nhắc ôn đúng lúc bạn sắp quên.',
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
				VSLink nhận ra <b>400 từ</b> Ngôn ngữ Ký hiệu Việt Nam thông dụng qua camera. Dịch từng từ, ghép thành câu, học
				theo video mẫu và để bạn chó Mèo nhận xét từng lần ký.
			</p>
			<div class="nut-ds">
				<a class="nut lon" href="{base}/dich/"><Camera size={20} /> Thử dịch ngay</a>
				<a class="nut phu lon" href="{base}/hoc/"><GraduationCap size={20} /> Học cùng Mèo</a>
			</div>
			<p class="rieng-tu"><ShieldCheck size={18} /> Hình ảnh camera được xử lý ngay trên máy bạn, không gửi đi đâu.</p>
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
				Gâu! Mình là <b>Mèo</b>, chó thật đó, chỉ tên Mèo thôi. Mình ký được cả “Con chó” lẫn “Con mèo” nha!
			</p>
		</div>
	</section>

	<section class="buoc-lam">
		<h2>Bắt đầu trong 3 bước</h2>
		<ol>
			<li class="the">
				<span class="so">1</span>
				<Camera size={26} />
				<h3>Bật camera</h3>
				<p>Ngồi lùi ra một chút để camera thấy bạn từ đầu đến bụng, với ánh sáng phía trước mặt.</p>
			</li>
			<li class="the">
				<span class="so">2</span>
				<Hand size={26} />
				<h3>Giơ tay lên và ký</h3>
				<p>Không cần bấm nút. Mèo tự biết lúc bạn bắt đầu ký và lúc bạn hạ tay xuống.</p>
			</li>
			<li class="the">
				<span class="so">3</span>
				<Sparkles size={26} />
				<h3>Xem kết quả</h3>
				<p>Mèo hiện từ đoán được và mức độ chắc chắn. Khi học, Mèo chỉ ra chỗ nên sửa.</p>
			</li>
		</ol>
	</section>

	<h2 class="tieu-de-muc">Bạn có thể làm gì với VSLink?</h2>
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
				<li><b>Ánh sáng phía trước mặt.</b> Tránh ngồi quay lưng ra cửa sổ.</li>
				<li><b>Thấy từ đầu đến bụng.</b> Cả hai khuỷu tay nằm trong khung hình.</li>
				<li><b>Bắt đầu và kết thúc với tay hạ xuống.</b> Mèo dựa vào đó để biết bạn ký xong một từ.</li>
				<li><b>Ký rõ và không quá nhanh</b>, như đang ký cho người mới học xem.</li>
			</ul>
		</div>
		<div class="ve-nhom">
			<a class="the o-lien-ket" href="{base}/gioi-thieu/">
				<span class="bieu-tuong" data-mau="xanh"><Users size={24} /></span>
				<span>
					<b>Về dự án VSLink</b>
					<small>Nhóm thực hiện, cách VSLink hoạt động và độ chính xác.</small>
				</span>
				<ArrowRight size={18} />
			</a>
			<a class="the o-lien-ket" href="{base}/gop-y/">
				<span class="bieu-tuong" data-mau="hong"><MessageCircleHeart size={24} /></span>
				<span>
					<b>Góp ý cho nhóm</b>
					<small>Mèo đoán sai, gặp lỗi hay có ý tưởng mới? Nhóm luôn muốn nghe.</small>
				</span>
				<ArrowRight size={18} />
			</a>
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
		grid-template-columns: repeat(3, minmax(0, 1fr));
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
	.meo-nhin-ro h2 :global(svg) {
		color: var(--xanh);
	}
	.meo-nhin-ro ul {
		margin: 0;
		padding-left: 1.2em;
		display: grid;
		gap: 8px;
		color: var(--chu-phu);
	}
	.meo-nhin-ro b {
		color: var(--chu);
	}
	.rieng-tu {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 16px 0 0;
		color: var(--chu-phu);
		font-weight: 700;
		font-size: 0.95rem;
	}
	.rieng-tu :global(svg) {
		flex: none;
		color: var(--xanh-la-chu);
	}
	.tieu-de-muc {
		margin-bottom: 16px;
	}
	.ve-nhom {
		display: grid;
		gap: 16px;
		align-content: start;
	}
	.o-lien-ket {
		display: flex;
		align-items: center;
		gap: 14px;
		color: var(--chu);
		text-decoration: none;
		transition: border-color 0.15s ease;
	}
	.o-lien-ket:hover {
		border-color: var(--xanh);
	}
	.o-lien-ket > span:nth-child(2) {
		display: grid;
		gap: 2px;
		flex: 1;
	}
	.o-lien-ket small {
		color: var(--chu-phu);
		font-size: 0.92rem;
	}
	.o-lien-ket > :global(svg) {
		color: var(--xanh-chu);
		flex: none;
	}
	.o-lien-ket .bieu-tuong {
		flex: none;
	}
	[data-mau='tim'] .bieu-tuong {
		background: color-mix(in srgb, #8b6be0 16%, var(--the));
		color: #8b6be0;
	}
	.bieu-tuong[data-mau='xanh'] {
		background: var(--xanh-nhat);
		color: var(--xanh);
	}
	.bieu-tuong[data-mau='hong'] {
		background: color-mix(in srgb, var(--hong) 16%, var(--the));
		color: var(--hong);
	}
</style>
