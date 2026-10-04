<script lang="ts">
	import '@fontsource-variable/nunito';
	import '../app.css';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import Logo from '$lib/thanh-phan/Logo.svelte';
	import House from '@lucide/svelte/icons/house';
	import Languages from '@lucide/svelte/icons/languages';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Gamepad2 from '@lucide/svelte/icons/gamepad-2';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';

	let { children } = $props();

	const MUC = [
		{ href: '/', ten: 'Trang chủ', icon: House },
		{ href: '/dich/', ten: 'Dịch', icon: Languages },
		{ href: '/hoc/', ten: 'Học', icon: GraduationCap },
		{ href: '/do-vui/', ten: 'Đố vui', icon: Gamepad2 },
		{ href: '/tien-do/', ten: 'Tiến độ', icon: Trophy }
	];

	const dangO = (href: string) => {
		const p = page.url.pathname.slice(base.length) || '/';
		return href === '/' ? p === '/' : p.startsWith(href);
	};

	let toi = $state(false);
	$effect(() => {
		const dat = document.documentElement.dataset.giaoDien;
		toi = dat ? dat === 'toi' : matchMedia('(prefers-color-scheme: dark)').matches;
	});
	function doiGiaoDien() {
		toi = !toi;
		document.documentElement.dataset.giaoDien = toi ? 'toi' : 'sang';
		try {
			localStorage.setItem('vslink-giao-dien', toi ? 'toi' : 'sang');
		} catch {
			/* bo qua */
		}
	}
</script>

<svelte:head>
	<title>VSLink — Dịch và học Ngôn ngữ Ký hiệu Việt Nam</title>
</svelte:head>

<a class="bo-qua" href="#noi-dung">Bỏ qua, tới nội dung</a>

<header class="dau-trang">
	<div class="khung-trang thanh">
		<a href="{base}/" class="thuong-hieu" aria-label="VSLink — trang chủ">
			<Logo cao={26} />
		</a>
		<nav class="dieu-huong" aria-label="Chính">
			{#each MUC as m (m.href)}
				<a href="{base}{m.href}" aria-current={dangO(m.href) ? 'page' : undefined}>
					<m.icon size={18} strokeWidth={2.4} />
					{m.ten}
				</a>
			{/each}
		</nav>
		<button class="doi-mau" onclick={doiGiaoDien} aria-label={toi ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}>
			{#if toi}<Sun size={20} />{:else}<Moon size={20} />{/if}
		</button>
	</div>
</header>

<main id="noi-dung">
	{@render children()}
</main>

<footer class="chan-trang">
	<div class="khung-trang">
		<p>
			<strong>VSLink</strong> · Dịch thuật và học Ngôn ngữ Ký hiệu Việt Nam · Hình ảnh camera được xử lý trực tiếp trên máy
			bạn
		</p>
		<p class="lien-ket">
			<a href="{base}/gioi-thieu/">Về dự án</a>
			<a href="{base}/gop-y/">Góp ý</a>
		</p>
		<p class="nho">
			Một dự án của học sinh Trường Phổ thông Năng khiếu, ĐHQG-HCM
		</p>
	</div>
</footer>

<nav class="tab-duoi" aria-label="Chính (điện thoại)">
	{#each MUC as m (m.href)}
		<a href="{base}{m.href}" aria-current={dangO(m.href) ? 'page' : undefined}>
			<m.icon size={22} strokeWidth={2.3} />
			<span>{m.ten}</span>
		</a>
	{/each}
</nav>

<style>
	.bo-qua {
		position: absolute;
		left: -999px;
	}
	.bo-qua:focus {
		left: 12px;
		top: 12px;
		z-index: 100;
		background: var(--the);
		padding: 8px 14px;
		border-radius: 10px;
	}
	.dau-trang {
		position: sticky;
		top: 0;
		z-index: 20;
		backdrop-filter: saturate(1.4) blur(14px);
		background: color-mix(in srgb, var(--nen) 78%, transparent);
		border-bottom: 1px solid color-mix(in srgb, var(--vien) 70%, transparent);
	}
	.thanh {
		display: flex;
		align-items: center;
		gap: 16px;
		height: 64px;
	}
	.thuong-hieu {
		display: flex;
		align-items: center;
		padding: 6px 2px;
	}
	.dieu-huong {
		display: flex;
		gap: 4px;
		margin-inline: auto;
	}
	.dieu-huong a {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 8px 14px;
		border-radius: 999px;
		color: var(--chu-phu);
		font-weight: 800;
		text-decoration: none;
		transition: background 0.15s ease;
	}
	.dieu-huong a:hover {
		background: var(--xanh-nhat);
		color: var(--xanh-dam);
	}
	.dieu-huong a[aria-current='page'] {
		background: var(--nut);
		color: #fff;
	}
	.doi-mau {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		border-radius: 50%;
		border: 1.5px solid var(--vien);
		background: var(--the);
		color: var(--chu-phu);
		cursor: pointer;
		margin-left: auto;
	}
	main {
		padding-block: 28px 40px;
		min-height: calc(100dvh - 64px - 120px);
	}
	.chan-trang {
		border-top: 1px solid var(--vien);
		padding: 22px 0 28px;
		color: var(--chu-phu);
		font-size: 0.92rem;
	}
	.lien-ket {
		display: flex;
		flex-wrap: wrap;
		gap: 18px;
		margin: 0 0 8px;
		font-weight: 800;
	}
	.chan-trang .nho {
		font-size: 0.82rem;
		margin: 0;
	}
	.tab-duoi {
		display: none;
	}

	@media (max-width: 820px) {
		.dieu-huong {
			display: none;
		}
		main {
			padding-bottom: 96px;
		}
		.chan-trang {
			padding-bottom: 100px;
		}
		.tab-duoi {
			display: grid;
			grid-template-columns: repeat(5, 1fr);
			position: fixed;
			inset: auto 10px calc(10px + env(safe-area-inset-bottom)) 10px;
			z-index: 30;
			background: color-mix(in srgb, var(--the) 92%, transparent);
			backdrop-filter: blur(14px);
			border: 1px solid var(--vien);
			border-radius: 22px;
			box-shadow: var(--bong);
			padding: 6px;
		}
		.tab-duoi a {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 2px;
			padding: 6px 0;
			border-radius: 16px;
			color: var(--chu-phu);
			font-size: 0.72rem;
			font-weight: 800;
			text-decoration: none;
		}
		.tab-duoi a[aria-current='page'] {
			background: var(--xanh-nhat);
			color: var(--xanh-dam);
		}
	}
</style>
