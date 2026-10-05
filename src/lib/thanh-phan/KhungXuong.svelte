<!--
	Phat khung xuong mau (mot lan ky that trong VSL400) tren canvas vuong: lap lai, giu
	tu the dau 0,3 s va cuoi 0,5 s cho de nhin, chinh toc do, soi guong, tam dung.
	Ve bang cung but voi camera (ve.ts): canh tay + than mau trang, tay trai hong, tay phai
	vang, dau la mot vong tron — khong ve mat.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { ButVe } from '$lib/loi/ve';
	import { tuTheTai, type KhungMau } from '$lib/loi/khung-mau';

	let {
		khung,
		tu,
		tocDo = 1,
		guong = false,
		dung = false
	}: { khung: KhungMau; tu: string; tocDo?: number; guong?: boolean; dung?: boolean } = $props();

	const GIU_DAU = 0.3;
	const GIU_CUOI = 0.5;
	let canvas: HTMLCanvasElement | undefined = $state();

	onMount(() => {
		const but = new ButVe(1); // khong lam muot them: du lieu da muot san
		const ctx = canvas!.getContext('2d')!;
		let raf = 0;
		let truoc = performance.now();
		let e = 0; // thoi gian "noi dung" (giay, da nhan toc do)

		const kichThuoc = () => {
			const r = canvas!.getBoundingClientRect();
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const w = Math.max(1, Math.round(r.width * dpr));
			const h = Math.max(1, Math.round(r.height * dpr));
			if (canvas!.width !== w || canvas!.height !== h) {
				canvas!.width = w;
				canvas!.height = h;
			}
		};
		const ro = new ResizeObserver(kichThuoc);
		ro.observe(canvas!);
		kichThuoc();

		const ve = (bayGio: number) => {
			const dt = Math.min((bayGio - truoc) / 1000, 0.1);
			truoc = bayGio;
			const tong = GIU_DAU + khung.giay + GIU_CUOI;
			if (!dung) e = (e + dt * tocDo) % tong;
			const u = Math.min(Math.max((e - GIU_DAU) / khung.giay, 0), 1);
			but.ve(ctx, tuTheTai(khung, u), 'day-du', { dauTron: true, dayNet: 1.6 });
			raf = requestAnimationFrame(ve);
		};
		raf = requestAnimationFrame(ve);
		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
		};
	});
</script>

<div class="khung-xuong" role="img" aria-label="Mô phỏng khung xương ký hiệu “{tu}”">
	<canvas bind:this={canvas} class:guong aria-hidden="true" data-testid="khung-xuong"></canvas>
</div>

<style>
	.khung-xuong {
		position: absolute;
		inset: 0;
	}
	canvas {
		position: absolute;
		inset: 0;
		margin: auto;
		height: 100%;
		max-width: 100%;
		aspect-ratio: 1 / 1;
		display: block;
		background: radial-gradient(circle at 50% 38%, #1c3150 0%, #0f1c2e 70%);
	}
	canvas.guong {
		transform: scaleX(-1);
	}
</style>
