<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { DUONG_DAN } from '$lib/loi/duong-dan';
	import { chayMoHinh } from '$lib/loi/mo-hinh';
	import { napHolistic } from '$lib/loi/nhan-dang';
	import { goiGon, napCauHinh, hoiMeo, type LoiMeo } from '$lib/meo/hoi-meo';
	import { NHAN } from '$lib/loi/tu-vung';
	import type { DuKien } from '$lib/loi/danh-gia';
	import Meo from '$lib/meo/Meo.svelte';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';

	type Ca = { ten: string; hinh: number[]; keypoints: number[]; probs: number[]; top1: number[] };
	type KetQuaCa = { ten: string; lech: number; top1Trung: boolean; ms: number };

	let onnx = $state<{ dat: boolean | null; ca: KetQuaCa[]; loi: string | null }>({ dat: null, ca: [], loi: null });
	let viDu = $state<{ co: boolean; dat: boolean | null; top5: string[]; mong: string[]; lech: number } | null>(null);
	let camera = $state<{ dang: boolean; ketQua: string | null; loi: string | null }>({ dang: false, ketQua: null, loi: null });
	let meo = $state<{ api: string; dang: boolean; loi: LoiMeo | null }>({ api: '', dang: false, loi: null });

	async function kiemOnnx() {
		onnx = { dat: null, ca: [], loi: null };
		try {
			const { ca } = (await fetch(DUONG_DAN.kiemTra).then((r) => r.json())) as { ca: Ca[] };
			const ra: KetQuaCa[] = [];
			for (const c of ca) {
				const t0 = performance.now();
				const p = await chayMoHinh(new Float32Array(c.keypoints));
				const ms = performance.now() - t0;
				let lech = 0;
				for (let i = 0; i < p.length; i++) lech = Math.max(lech, Math.abs(p[i] - c.probs[i]));
				const B = c.hinh[0];
				const top1 = Array.from({ length: B }, (_, b) => {
					let m = 0;
					for (let j = 1; j < 400; j++) if (p[b * 400 + j] > p[b * 400 + m]) m = j;
					return m;
				});
				ra.push({ ten: c.ten, lech, top1Trung: top1.every((v, b) => v === c.top1[b]), ms });
			}
			onnx = { dat: ra.every((r) => r.lech < 1e-4 && r.top1Trung), ca: ra, loi: null };
		} catch (e) {
			onnx = { dat: false, ca: [], loi: String(e) };
		}
	}

	async function kiemViDu() {
		const r = await fetch(DUONG_DAN.viDuKiemTra).catch(() => null);
		if (!r?.ok || !(r.headers.get('content-type') ?? '').includes('json')) {
			viDu = { co: false, dat: null, top5: [], mong: [], lech: 0 };
			return;
		}
		const v = (await r.json()) as { keypoints: number[][][]; top5: { chi_so: number; nhan: string; xac_suat: number }[] };
		const p = await chayMoHinh(new Float32Array(v.keypoints.flat(2)));
		const thuTu = Array.from({ length: 400 }, (_, i) => i).sort((a, b) => p[b] - p[a]).slice(0, 5);
		const lech = Math.max(...v.top5.map((t) => Math.abs(p[t.chi_so] - t.xac_suat)));
		viDu = {
			co: true,
			dat: thuTu.every((i, k) => i === v.top5[k].chi_so) && lech < 1e-3,
			top5: thuTu.map((i) => `${NHAN[i]} ${(p[i] * 100).toFixed(1)}%`),
			mong: v.top5.map((t) => `${t.nhan} ${(t.xac_suat * 100).toFixed(1)}%`),
			lech
		};
	}

	async function kiemCamera() {
		camera = { dang: true, ketQua: null, loi: null };
		let stream: MediaStream | null = null;
		try {
			stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
			const s = stream.getVideoTracks()[0].getSettings();
			const t0 = performance.now();
			await napHolistic();
			camera = {
				dang: false,
				ketQua: `Camera ${s.width}×${s.height} (${s.frameRate ? Math.round(s.frameRate) + ' hình/giây' : ''}) · MediaPipe Holistic nạp xong sau ${((performance.now() - t0) / 1000).toFixed(1)} giây.`,
				loi: null
			};
		} catch (e) {
			camera = { dang: false, ketQua: null, loi: String(e) };
		} finally {
			stream?.getTracks().forEach((t) => t.stop());
		}
	}

	const MAU: DuKien = {
		tuMucTieu: 'Mẹ',
		mucDo: 'gan-dung',
		xepHang: 2,
		xacSuat: 0.21,
		tuDoan: 'Bố',
		xacSuatTuDoan: 0.44,
		top5: [{ tu: 'Bố', p: 0.44 }, { tu: 'Mẹ', p: 0.21 }, { tu: 'Anh', p: 0.08 }, { tu: 'Em', p: 0.05 }, { tu: 'Chị', p: 0.03 }],
		boPhan: { tayTrai: 'on', tayPhai: 'hoi-lech', canhTay: 'lech-nhieu' },
		giaiDoanLechNhat: 'giua',
		chatLuong: { soKhung: 45, thoiLuong: 1.8, fps: 25, tiLeTayTrai: 1, tiLeTayPhai: 1, tiLeNguoi: 1 }
	};

	async function hoiThuMeo() {
		meo.dang = true;
		meo.loi = await hoiMeo(MAU);
		meo.dang = false;
		if (meo.api && meo.loi.nguon === 'mau') chanDoanWorker();
	}

	/** Hoi thang Worker de biet vi sao Meo chua noi bang AI (thieu key, sai nguon, het luot...). */
	let chanDoan = $state<string | null>(null);
	async function chanDoanWorker() {
		chanDoan = 'Đang hỏi Worker…';
		try {
			const g = (await fetch(meo.api).then((r) => r.json())) as { co_key?: boolean };
			if (!g.co_key) {
				chanDoan = 'Worker chạy rồi nhưng CHƯA có secret GEMINI_API_KEY (Settings → Variables and Secrets).';
				return;
			}
			const r = await fetch(meo.api, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ du_kien: goiGon(MAU) })
			});
			const j = (await r.json().catch(() => ({}))) as { loi?: string; model?: string };
			chanDoan = r.ok
				? `Worker ổn — Gemini trả lời bằng model ${j.model}.`
				: r.status === 403
					? 'Worker từ chối địa chỉ web này: thêm địa chỉ trang vào biến ALLOWED_ORIGINS của Worker.'
					: r.status === 429
						? 'Hết lượt miễn phí của Gemini trong lúc này — Mèo tạm dùng lời soạn sẵn, lát nữa thử lại.'
						: `Worker báo lỗi HTTP ${r.status}${j.loi ? `: ${j.loi}` : ''}.`;
		} catch (e) {
			chanDoan = `Không gọi được Worker (${e}). Kiểm tra link trong cau-hinh.json, và ALLOWED_ORIGINS đã có địa chỉ trang này chưa.`;
		}
	}

	onMount(async () => {
		meo.api = (await napCauHinh()).meo_api ?? '';
		await kiemOnnx();
		await kiemViDu();
	});
</script>

<svelte:head><title>Kiểm tra hệ thống · VSLink</title></svelte:head>

<div class="khung-trang luoi">
	<section class="the">
		<p class="nhan-nho">Bước 1</p>
		<h2>Mô hình nhận dạng (ONNX)</h2>
		<p class="phu-de">
			Chạy lại các video mẫu đã chấm sẵn bằng Python, so với kết quả của trình duyệt. Lệch phải dưới 0,0001 và
			từ đoán ra phải trùng.
		</p>
		{#if onnx.dat === null && !onnx.loi}
			<p>Đang chạy…</p>
		{:else}
			<p class="ket-luan" data-testid="ket-qua-onnx" data-dat={String(onnx.dat)}>
				{#if onnx.dat}<CircleCheck size={22} /> Đạt — trình duyệt cho kết quả trùng Python.
				{:else}<CircleX size={22} /> Chưa đạt {onnx.loi ? `(${onnx.loi})` : ''}{/if}
			</p>
			<table>
				<thead><tr><th>Trường hợp</th><th>Lệch lớn nhất</th><th>Từ đoán</th><th>Thời gian</th></tr></thead>
				<tbody>
					{#each onnx.ca as c (c.ten)}
						<tr>
							<td>{c.ten}</td>
							<td>{c.lech.toExponential(1)}</td>
							<td>{c.top1Trung ? 'trùng' : 'KHÁC'}</td>
							<td>{c.ms.toFixed(0)} ms</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if viDu?.co}
			<h3>Video thật từ notebook</h3>
			<p data-testid="ket-qua-vi-du" data-dat={String(viDu.dat)}>
				{viDu.dat ? 'Đạt' : 'Chưa đạt'} — trình duyệt: {viDu.top5.join(', ')} · notebook: {viDu.mong.join(', ')}
			</p>
		{/if}
	</section>

	<section class="the">
		<p class="nhan-nho">Bước 2</p>
		<h2>Camera và MediaPipe</h2>
		<p class="phu-de">Mở camera, nạp mô hình nhận dạng dáng người MediaPipe (lần đầu hơi lâu).</p>
		<button class="nut" onclick={kiemCamera} disabled={camera.dang}>{camera.dang ? 'Đang kiểm tra…' : 'Kiểm tra camera'}</button>
		{#if camera.ketQua}<p class="ket-luan"><CircleCheck size={22} /> {camera.ketQua}</p>{/if}
		{#if camera.loi}<p class="ket-luan loi"><CircleX size={22} /> {camera.loi}</p>{/if}
	</section>

	<section class="the meo-the">
		<Meo tamTrang={meo.dang ? 'suy-nghi' : meo.loi ? (meo.loi.nguon === 'ai' ? 'vui' : 'co-vu') : 'cho'} kichThuoc={110} />
		<div>
			<p class="nhan-nho">Bước 3</p>
			<h2>Mèo nhận xét bằng AI</h2>
			<p class="phu-de">
				{meo.api ? `Đã cấu hình Worker: ${meo.api}` : 'Chưa cấu hình Worker (static/cau-hinh.json) — Mèo dùng lời soạn sẵn.'}
			</p>
			<div class="nut-ds">
				<button class="nut phu" onclick={hoiThuMeo} disabled={meo.dang}>Hỏi thử Mèo</button>
				{#if meo.api}<button class="nut vien" onclick={chanDoanWorker}>Kiểm tra Worker</button>{/if}
			</div>
			{#if meo.loi}
				<p class="bong-noi" data-testid="loi-meo" data-nguon={meo.loi.nguon}>
					{meo.loi.cau} <em>({meo.loi.nguon === 'ai' ? 'AI' : 'lời soạn sẵn'})</em>
				</p>
			{/if}
			{#if chanDoan}<p class="chan-doan" data-testid="chan-doan-worker">{chanDoan}</p>{/if}
		</div>
	</section>

	<p class="cong-cu">Công cụ cho nhóm: <a href="{base}/cong-cu/video-mau/">Chọn lại video mẫu từ QIPEDC →</a></p>
</div>

<style>
	.luoi {
		display: grid;
		gap: 20px;
		max-width: 860px;
	}
	.ket-luan {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 800;
		color: var(--xanh-la-chu);
	}
	.ket-luan[data-dat='false'],
	.ket-luan.loi {
		color: var(--do-chu);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.95rem;
	}
	th,
	td {
		text-align: left;
		padding: 8px 10px;
		border-bottom: 1px solid var(--vien);
	}
	th {
		color: var(--chu-phu);
		font-weight: 800;
	}
	.meo-the {
		display: flex;
		gap: 18px;
		align-items: flex-start;
	}
	.nut-ds {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.chan-doan {
		margin-top: 10px;
		font-weight: 700;
		color: var(--chu-phu);
	}
	.cong-cu {
		color: var(--chu-phu);
		font-weight: 700;
	}
	.bong-noi {
		margin-top: 14px;
		background: var(--xanh-nhat);
		padding: 12px 16px;
		border-radius: 16px;
	}
</style>
