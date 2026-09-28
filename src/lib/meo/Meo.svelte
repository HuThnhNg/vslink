<!--
	Mèo — chú chó trợ giảng của VSLink (vâng, chó tên Mèo).
	Nhân vật vẽ riêng cho VSLink, SVG thuần, đổi biểu cảm theo `tamTrang`.
-->
<script lang="ts">
	import type { TamTrang } from './loi-meo';

	let { tamTrang = 'cho', kichThuoc = 120 }: { tamTrang?: TamTrang; kichThuoc?: number } = $props();

	const MO_TA: Record<TamTrang, string> = {
		cho: 'đang chờ',
		nghe: 'đang chăm chú nhìn',
		'suy-nghi': 'đang suy nghĩ',
		vui: 'đang rất vui',
		'co-vu': 'đang cổ vũ bạn',
		'boi-roi': 'đang nghiêng đầu bối rối',
		ngu: 'đang ngủ'
	};
	const matVui = $derived(tamTrang === 'vui');
	const matNham = $derived(tamTrang === 'ngu');
	const nhayMat = $derived(tamTrang === 'co-vu');
	const miengMo = $derived(tamTrang === 'vui' || tamTrang === 'co-vu');
</script>

<svg
	class="meo {tamTrang}"
	width={kichThuoc}
	height={kichThuoc}
	viewBox="0 0 200 200"
	role="img"
	aria-label="Mèo — chú chó trợ giảng, {MO_TA[tamTrang]}"
>
	<ellipse cx="100" cy="191" rx="54" ry="6" class="bong" />

	<path class="duoi" d="M137 156 C 162 154 176 132 170 110 C 167 101 157 103 158 112 C 160 127 151 139 133 144 Z" />

	<g class="than">
		<path class="long" d="M56 192 C 50 152 70 128 100 128 C 130 128 150 152 144 192 Z" />
		<ellipse cx="100" cy="170" rx="24" ry="19" class="bung" />
		<ellipse cx="80" cy="189" rx="14" ry="8" class="chan" />
		<ellipse cx="120" cy="189" rx="14" ry="8" class="chan" class:gio={tamTrang === 'co-vu'} />
	</g>

	<g class="dau">
		<path class="tai tai-trai" d="M56 58 C 34 64 26 106 40 126 C 48 136 62 128 63 112 C 64 92 68 74 74 62 Z" />
		<path class="tai tai-phai" d="M144 58 C 166 64 174 106 160 126 C 152 136 138 128 137 112 C 136 92 132 74 126 62 Z" />
		<ellipse cx="100" cy="88" rx="55" ry="51" class="long" />
		<ellipse cx="123" cy="83" rx="17" ry="15" class="dom" />
		<path class="dom" d="M86 40 C 92 31 108 31 114 40 C 107 37 93 37 86 40 Z" />
		<ellipse cx="100" cy="109" rx="25" ry="18" class="mom" />

		{#if matVui}
			<path class="mat-cung" d="M71 89 Q 80 77 89 89" />
			<path class="mat-cung" d="M111 89 Q 120 77 129 89" />
		{:else if matNham}
			<path class="mat-cung" d="M71 88 Q 80 95 89 88" />
			<path class="mat-cung" d="M111 88 Q 120 95 129 88" />
		{:else}
			<g class="mat">
				<ellipse cx="80" cy="87" rx="7.5" ry="9" class="con-nguoi" />
				<circle cx="82.6" cy="83.4" r="2.7" class="sang" />
				<circle cx="77.8" cy="90.4" r="1.2" class="sang" />
			</g>
			{#if nhayMat}
				<path class="mat-cung" d="M111 89 Q 120 77 129 89" />
			{:else}
				<g class="mat">
					<ellipse cx="120" cy="87" rx="7.5" ry="9" class="con-nguoi" />
					<circle cx="122.6" cy="83.4" r="2.7" class="sang" />
					<circle cx="117.8" cy="90.4" r="1.2" class="sang" />
				</g>
			{/if}
			{#if tamTrang === 'boi-roi'}
				<path class="may" d="M110 70 Q 121 64 131 69" />
			{/if}
		{/if}

		<ellipse cx="67" cy="105" rx="8.5" ry="5.2" class="ma" />
		<ellipse cx="133" cy="105" rx="8.5" ry="5.2" class="ma" />

		<path class="mui" d="M92 100 Q 100 95 108 100 Q 105 108 100 109 Q 95 108 92 100 Z" />
		<ellipse cx="97.5" cy="100" rx="2.4" ry="1.3" class="sang" />

		{#if miengMo}
			<path class="mieng-mo" d="M89 113 Q 100 132 111 113 Q 100 117 89 113 Z" />
			<path class="luoi" d="M94.5 119 Q 100 130 105.5 119 Q 100 121 94.5 119 Z" />
		{:else if tamTrang === 'boi-roi'}
			<circle cx="100" cy="118" r="3.6" class="mieng-o" />
		{:else}
			<path class="mieng" d="M100 108 L100 112 M91 113 Q 95.5 119 100 113 Q 104.5 119 109 113" />
		{/if}
	</g>

	<path class="khan" d="M62 129 Q 100 147 138 129 L 133 139 Q 100 173 67 139 Z" />
	<circle cx="92" cy="146" r="2.4" class="cham" />
	<circle cx="108" cy="146" r="2.4" class="cham" />
	<circle cx="100" cy="156" r="2.4" class="cham" />

	{#if tamTrang === 'suy-nghi'}
		<g class="nghi">
			<circle cx="150" cy="44" r="5" /><circle cx="164" cy="34" r="6.5" /><circle cx="180" cy="22" r="8" />
		</g>
	{:else if tamTrang === 'boi-roi'}
		<text x="152" y="52" class="hoi">?</text>
	{:else if tamTrang === 'ngu'}
		<text x="146" y="50" class="z z1">z</text>
		<text x="160" y="34" class="z z2">z</text>
	{:else if tamTrang === 'vui' || tamTrang === 'co-vu'}
		<path class="sao s1" d="M160 38 l4 9 l9 4 l-9 4 l-4 9 l-4 -9 l-9 -4 l9 -4 Z" />
		<path class="sao s2" d="M34 52 l3 6 l6 3 l-6 3 l-3 6 l-3 -6 l-6 -3 l6 -3 Z" />
	{/if}
</svg>

<style>
	.meo {
		--meo-kem: #fff3e3;
		--meo-caramel: #e9a15b;
		--meo-dam: #2e2522;
		overflow: visible;
		display: block;
		flex: none;
	}
	.bong {
		fill: rgba(20, 40, 70, 0.1);
	}
	.long {
		fill: var(--meo-kem);
	}
	.bung,
	.mom {
		fill: #fffbf5;
	}
	.chan {
		fill: var(--meo-kem);
		stroke: #ecd7bd;
		stroke-width: 2;
	}
	.tai,
	.dom,
	.duoi {
		fill: var(--meo-caramel);
	}
	.con-nguoi,
	.mui,
	.mieng-o {
		fill: var(--meo-dam);
	}
	.sang {
		fill: #fff;
	}
	.mat-cung,
	.mieng,
	.may {
		fill: none;
		stroke: var(--meo-dam);
		stroke-width: 4;
		stroke-linecap: round;
	}
	.mieng {
		stroke-width: 2.6;
	}
	.may {
		stroke-width: 3;
	}
	.ma {
		fill: #ffadbd;
		opacity: 0.75;
	}
	.mieng-mo {
		fill: #8a3b3b;
	}
	.luoi {
		fill: #ff8ea5;
	}
	.khan {
		fill: var(--xanh, #3680c2);
	}
	.cham {
		fill: #fff;
		opacity: 0.9;
	}
	.nghi circle {
		fill: var(--the, #fff);
		stroke: var(--xanh, #3680c2);
		stroke-width: 2.5;
	}
	.hoi {
		font: 900 38px var(--font, sans-serif);
		fill: var(--xanh, #3680c2);
	}
	.z {
		font: 900 20px var(--font, sans-serif);
		fill: var(--xanh, #3680c2);
		opacity: 0.8;
	}
	.sao {
		fill: #ffc53d;
	}

	/* ---- chuyen dong ---- */
	.duoi {
		transform-origin: 137px 150px;
		animation: vay 1.4s ease-in-out infinite;
	}
	.vui .duoi,
	.co-vu .duoi {
		animation-duration: 0.36s;
	}
	.ngu .duoi {
		animation: none;
	}
	.dau {
		transform-origin: 100px 132px;
		transition: transform 0.35s ease;
	}
	.boi-roi .dau {
		transform: rotate(-10deg);
	}
	.nghe .dau {
		animation: gat 2.4s ease-in-out infinite;
	}
	.vui {
		animation: nhun 0.7s ease-in-out infinite;
	}
	.ngu .than,
	.ngu .dau {
		animation: tho 3.2s ease-in-out infinite;
	}
	.mat {
		transform-box: fill-box;
		transform-origin: center;
		animation: chop 4.6s infinite;
	}
	.tai {
		transform-box: fill-box;
		transform-origin: top center;
		transition: transform 0.3s ease;
	}
	.nghe .tai-trai {
		transform: rotate(8deg);
	}
	.nghe .tai-phai {
		transform: rotate(-8deg);
	}
	.gio {
		transform-box: fill-box;
		transform-origin: center;
		animation: vay-tay 0.9s ease-in-out infinite;
	}
	.nghi circle {
		animation: noi 1.2s ease-in-out infinite;
	}
	.nghi circle:nth-child(2) {
		animation-delay: 0.2s;
	}
	.nghi circle:nth-child(3) {
		animation-delay: 0.4s;
	}
	.z1 {
		animation: bay 2.4s ease-in-out infinite;
	}
	.z2 {
		animation: bay 2.4s ease-in-out 1.2s infinite;
	}
	.sao {
		transform-box: fill-box;
		transform-origin: center;
		animation: lap-lanh 1.1s ease-in-out infinite;
	}
	.s2 {
		animation-delay: 0.5s;
	}

	@keyframes vay {
		0%,
		100% {
			transform: rotate(-9deg);
		}
		50% {
			transform: rotate(12deg);
		}
	}
	@keyframes gat {
		0%,
		100% {
			transform: rotate(0);
		}
		50% {
			transform: rotate(3deg) translateY(-1px);
		}
	}
	@keyframes nhun {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-5px);
		}
	}
	@keyframes tho {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.015, 0.99);
		}
	}
	@keyframes chop {
		0%,
		94%,
		100% {
			transform: scaleY(1);
		}
		96% {
			transform: scaleY(0.1);
		}
	}
	@keyframes vay-tay {
		0%,
		100% {
			transform: translateY(0) rotate(0);
		}
		50% {
			transform: translateY(-10px) rotate(-18deg);
		}
	}
	@keyframes noi {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-4px);
		}
	}
	@keyframes bay {
		0% {
			transform: translate(0, 0);
			opacity: 0;
		}
		30% {
			opacity: 0.9;
		}
		100% {
			transform: translate(10px, -16px);
			opacity: 0;
		}
	}
	@keyframes lap-lanh {
		0%,
		100% {
			transform: scale(0.7);
			opacity: 0.6;
		}
		50% {
			transform: scale(1.15);
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.meo *,
		.meo {
			animation: none !important;
		}
	}
</style>
