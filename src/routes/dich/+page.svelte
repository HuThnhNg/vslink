<!--
	Thong dich: ky truc tiep truoc camera (tu cat doan) hoac tai video len.
	Moi xu ly deu tren may nguoi dung: MediaPipe -> 60 khung -> mo hinh ONNX -> top 5.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import KhungCamera from '$lib/thanh-phan/KhungCamera.svelte';
	import Top5 from '$lib/thanh-phan/Top5.svelte';
	import BongMeo from '$lib/meo/BongMeo.svelte';
	import { PhienCamera } from '$lib/loi/camera.svelte';
	import type { KhungVao } from '$lib/loi/cat-doan';
	import { doChatLuong, topK, type ChatLuong, type DuDoan } from '$lib/loi/danh-gia';
	import { goiYGhiHinh, LOI_BO, phanTram, soGiay } from '$lib/loi/dinh-dang';
	import { DANH_GIA } from '$lib/loi/hang-so';
	import { dongGoi } from '$lib/loi/lay-mau';
	import { chayMoHinh } from '$lib/loi/mo-hinh';
	import { NHAN } from '$lib/loi/tu-vung';
	import { docVideo, LoiMediaPipe } from '$lib/loi/video-tai-len';
	import Camera from '@lucide/svelte/icons/camera';
	import Upload from '@lucide/svelte/icons/upload';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import Trash from '@lucide/svelte/icons/trash';

	type KetQua = { top: DuDoan[]; chatLuong: ChatLuong; nguon: 'camera' | 'video' };

	let che = $state<'truc-tiep' | 'video'>('truc-tiep');
	let giaLap = $state(false);
	let ketQua = $state<KetQua | null>(null);
	let thongBao = $state<string | null>(null);
	let loiCham = $state<string | null>(null);
	let lichSu = $state<{ i: number; tu: string; p: number; id: number }[]>([]);

	// ---- cham mot doan ky hieu ------------------------------------------------
	async function cham(khung: KhungVao[], thoiLuong: number, nguon: KetQua['nguon']) {
		const kp = khung.map((k) => k.kp);
		try {
			const p = await chayMoHinh(dongGoi(kp));
			const top = topK(p, NHAN, 5);
			ketQua = { top, chatLuong: doChatLuong(kp, thoiLuong), nguon };
			thongBao = null;
			loiCham = null;
			lichSu = [{ i: top[0].i, tu: top[0].tu, p: top[0].p, id: Date.now() }, ...lichSu].slice(0, 12);
		} catch (e) {
			console.error(e);
			loiCham = 'Mèo không chạy được mô hình nhận dạng (có thể do mạng yếu khi tải lần đầu). Tải lại trang rồi thử nhé.';
		}
	}

	const phien = new PhienCamera({
		onBatDau: () => {
			thongBao = null;
		},
		onDoan: (khung, thoiLuong) => cham(khung, thoiLuong, 'camera'),
		onBo: (lyDo) => {
			thongBao = LOI_BO[lyDo];
		}
	});

	const dangCham = $derived(che === 'truc-tiep' && phien.pha === 'dang-cham');
	const dau = $derived(ketQua?.top[0] ?? null);
	const chuaChac = $derived(!!dau && dau.p < DANH_GIA.nguongChuaChac);
	const goiY = $derived(ketQua ? goiYGhiHinh(ketQua.chatLuong) : null);

	// ---- tai video len --------------------------------------------------------
	let tep = $state<File | null>(null);
	let urlXem = $state<string | null>(null);
	let latGuong = $state(false);
	let tienTrinh = $state(0);
	let dangDoc = $state(false);
	let loiVideo = $state<string | null>(null);
	let doanCat = $state<{ tu: number; den: number } | null>(null);
	let dangKeo = $state(false);

	function nhanTep(f: File | undefined | null) {
		if (!f) return;
		if (!f.type.startsWith('video/') && !/\.(mp4|webm|mov|m4v|ogv)$/i.test(f.name)) {
			loiVideo = 'Tệp này không phải video. Chọn tệp .mp4, .webm hoặc .mov nhé.';
			return;
		}
		if (urlXem) URL.revokeObjectURL(urlXem);
		tep = f;
		urlXem = URL.createObjectURL(f);
		xuLyVideo();
	}

	async function xuLyVideo() {
		if (!tep || dangDoc) return;
		dangDoc = true;
		loiVideo = null;
		tienTrinh = 0;
		ketQua = null;
		doanCat = null;
		try {
			const kq = await docVideo(tep, { latGuong, onTienTrinh: (p) => (tienTrinh = p) });
			const coNguoi = kq.khung.filter((k) => k.tinHieu.coNguoi).length;
			if (kq.khung.length < 5 || coNguoi < kq.khung.length * 0.3) {
				loiVideo = 'Mèo không thấy rõ người trong video. Quay sao cho thấy từ đầu đến bụng và đủ sáng nhé.';
				return;
			}
			doanCat = { tu: kq.catTu, den: kq.catDen };
			await cham(kq.khung, kq.thoiLuong, 'video');
		} catch (e) {
			console.error(e);
			loiVideo =
				e instanceof LoiMediaPipe
					? 'Mèo chưa tải được mô hình nhìn dáng người (MediaPipe). Kiểm tra mạng rồi bấm “Đoán lại” nhé.'
					: `Mèo không đọc được video này (${(e as Error)?.message ?? e}). Thử video .mp4 hoặc .webm khác nhé.`;
		} finally {
			dangDoc = false;
		}
	}

	function doiChe(c: typeof che) {
		che = c;
		thongBao = null;
	}

	onMount(() => {
		giaLap = page.url.searchParams.has('gia-lap');
		if (page.url.searchParams.get('che') === 'video') che = 'video';
		return () => {
			if (urlXem) URL.revokeObjectURL(urlXem);
		};
	});
</script>

<svelte:head><title>Dịch ký hiệu · VSLink</title></svelte:head>

<div class="khung-trang">
	<header class="dau-trang">
		<div>
			<p class="nhan-nho">Thông dịch</p>
			<h1>Bạn ký, Mèo đoán!</h1>
			<p class="phu-de">
				Giơ tay lên ký một từ, ký xong thì hạ tay xuống — Mèo tự biết lúc bạn bắt đầu và kết thúc, không cần bấm
				nút.
			</p>
		</div>
		<div class="tab" role="tablist" aria-label="Cách dịch">
			<button role="tab" aria-selected={che === 'truc-tiep'} onclick={() => doiChe('truc-tiep')}>
				<Camera size={18} /> Ký trực tiếp
			</button>
			<button role="tab" aria-selected={che === 'video'} onclick={() => doiChe('video')}>
				<Upload size={18} /> Tải video lên
			</button>
		</div>
	</header>

	<div class="luoi">
		<section class="the cot-nhap">
			{#if che === 'truc-tiep'}
				{#if giaLap}
					<p class="gia-lap">Chế độ giả lập: một “người que” tự ký để thử cả luồng xử lý, không dùng camera.</p>
				{/if}
				<KhungCamera {phien} {giaLap}>
					{#if ketQua && dau && ketQua.nguon === 'camera' && phien.pha !== 'dang-ky'}
						{#key ketQua}
							<div class="phu-de-cam" class:chua-chac={chuaChac} in:fly={{ y: 16, duration: 250 }}>
								{dau.tu} <small>{phanTram(dau.p)}</small>
							</div>
						{/key}
					{/if}
				</KhungCamera>
			{:else}
				<div class="tai-len">
					<label
						class="vung-tha"
						class:keo={dangKeo}
						ondragover={(e) => {
							e.preventDefault();
							dangKeo = true;
						}}
						ondragleave={() => (dangKeo = false)}
						ondrop={(e) => {
							e.preventDefault();
							dangKeo = false;
							nhanTep(e.dataTransfer?.files?.[0]);
						}}
					>
						<input
							type="file"
							accept="video/*"
							class="an-di"
							data-testid="chon-video"
							onchange={(e) => nhanTep(e.currentTarget.files?.[0])}
						/>
						<Upload size={30} />
						<b>Chọn video hoặc kéo thả vào đây</b>
						<small>Video ngắn 1–12 giây, quay một từ, thấy từ đầu đến bụng. Video không rời khỏi máy bạn.</small>
					</label>
					<label class="cong-tac">
						<input type="checkbox" bind:checked={latGuong} />
						<span>
							Video quay kiểu <b>soi gương</b>
							<small>Bật nếu chữ trong video bị ngược (camera trước của một số điện thoại).</small>
						</span>
					</label>
					{#if urlXem}
						<!-- svelte-ignore a11y_media_has_caption -->
						<video src={urlXem} controls muted playsinline class="xem-lai" class:guong={latGuong}></video>
					{/if}
					{#if dangDoc}
						<div class="tien-trinh" role="status">
							<progress value={tienTrinh} max="1"></progress>
							<span>Mèo đang xem từng hình… {Math.round(tienTrinh * 100)}%</span>
						</div>
					{/if}
					{#if doanCat && !dangDoc}
						<p class="nho">Mèo cắt đoạn ký từ giây {soGiay(doanCat.tu)} đến {soGiay(doanCat.den)}.</p>
					{/if}
					{#if loiVideo}<p class="loi">{loiVideo}</p>{/if}
					{#if tep && !dangDoc}
						<button class="nut phu" onclick={xuLyVideo}><RotateCw size={18} /> Đoán lại</button>
					{/if}
				</div>
			{/if}
		</section>

		<section class="the cot-ket-qua" aria-live="polite" data-testid="ket-qua-dich">
			{#if loiCham}
				<BongMeo tamTrang="boi-roi" cau={loiCham} />
			{:else if dangCham || dangDoc}
				<BongMeo tamTrang="suy-nghi" dangNghi />
				<p class="giua phu-de">{dangDoc ? 'Mèo đang xem video của bạn…' : 'Mèo đang đoán…'}</p>
			{:else if thongBao}
				<BongMeo tamTrang="boi-roi" cau={thongBao} />
			{:else if ketQua && dau}
				<BongMeo tamTrang={chuaChac ? 'boi-roi' : 'vui'}>
					<p class="meo-noi">{chuaChac ? 'Hmm… Mèo chưa chắc lắm, có lẽ là' : 'Gâu! Mèo đoán bạn vừa ký'}</p>
					<p class="tu-lon" data-testid="tu-doan">{dau.tu}</p>
					<p class="do-chac">Mèo chắc {phanTram(dau.p)}</p>
				</BongMeo>
				{#if chuaChac}
					<p class="canh-bao">
						Mèo chưa chắc lắm — có thể là một trong các từ dưới đây. Thử ký chậm và rõ hơn, hoặc xem video mẫu ở
						mục Học.
					</p>
				{/if}
				{#if goiY}<p class="canh-bao">{goiY}</p>{/if}
				<h2 class="tieu-de-nho">5 từ Mèo nghĩ tới</h2>
				<Top5 ds={ketQua.top} lienKet />
				<a class="nut vien hoc-tu" href="{base}/hoc/?tu={dau.i}">
					<GraduationCap size={18} /> Học ký “{dau.tu}” cho chuẩn
				</a>
			{:else}
				<BongMeo tamTrang={phien.pha === 'dang-ky' ? 'nghe' : 'cho'}>
					<p class="meo-noi">
						{phien.pha === 'dang-ky' ? 'Mèo đang nhìn đây, cứ ký tiếp đi…' : 'Mèo sẵn sàng rồi! Làm theo 3 bước nhé:'}
					</p>
				</BongMeo>
				<ol class="buoc">
					<li><b>Bật camera</b>, ngồi lùi ra cho thấy từ đầu đến bụng.</li>
					<li><b>Giơ tay lên và ký</b> một từ trong 400 từ Mèo biết.</li>
					<li><b>Hạ tay xuống</b> — Mèo tự đoán và cho xem 5 khả năng.</li>
				</ol>
			{/if}

			{#if lichSu.length}
				<div class="lich-su">
					<div class="lich-su-dau">
						<h2 class="tieu-de-nho">Vừa dịch</h2>
						<button class="nut-chu" onclick={() => (lichSu = [])} aria-label="Xoá lịch sử"><Trash size={15} /> Xoá</button>
					</div>
					<div class="chip-ds">
						{#each lichSu as l (l.id)}
							<a class="chip" href="{base}/hoc/?tu={l.i}" title="Học từ “{l.tu}”">
								{l.tu} <small>{phanTram(l.p)}</small>
							</a>
						{/each}
					</div>
				</div>
			{/if}
		</section>
	</div>
</div>

<style>
	.dau-trang {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 20px;
	}
	.dau-trang .phu-de {
		max-width: 60ch;
		margin: 0;
	}
	.tab {
		display: inline-flex;
		padding: 5px;
		gap: 4px;
		border-radius: 999px;
		background: var(--the);
		border: 1px solid var(--vien);
		box-shadow: var(--bong-nhe);
	}
	.tab button {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		border: 0;
		background: transparent;
		padding: 9px 16px;
		border-radius: 999px;
		font-weight: 800;
		color: var(--chu-phu);
		cursor: pointer;
	}
	.tab button[aria-selected='true'] {
		background: var(--nut);
		color: #fff;
	}
	.luoi {
		display: grid;
		gap: 20px;
		grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
		align-items: start;
	}
	@media (max-width: 900px) {
		.luoi {
			grid-template-columns: 1fr;
		}
	}
	.gia-lap {
		margin: 0 0 12px;
		padding: 8px 12px;
		border-radius: var(--bo-nho);
		background: var(--vang-nhat);
		font-size: 0.9rem;
		font-weight: 700;
	}
	.phu-de-cam {
		padding: 8px 18px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--xanh-dam) 88%, transparent);
		color: #fff;
		font-size: clamp(1.2rem, 3vw, 1.7rem);
		font-weight: 900;
		box-shadow: 0 8px 24px -10px rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(6px);
	}
	.phu-de-cam small {
		font-size: 0.6em;
		font-weight: 800;
		opacity: 0.85;
	}
	.phu-de-cam.chua-chac {
		background: color-mix(in srgb, #6b5a2e 85%, transparent);
	}
	.cot-ket-qua {
		display: grid;
		gap: 14px;
		min-height: 320px;
		align-content: start;
	}
	.meo-noi {
		margin: 0;
		font-weight: 750;
	}
	.tu-lon {
		margin: 2px 0 0;
		font-size: clamp(1.8rem, 4vw, 2.5rem);
		font-weight: 900;
		line-height: 1.15;
		color: var(--xanh-dam);
		letter-spacing: -0.01em;
	}
	.do-chac {
		margin: 2px 0 0;
		color: var(--chu-phu);
		font-weight: 750;
	}
	.giua {
		text-align: center;
		margin: 0;
	}
	.canh-bao {
		margin: 0;
		padding: 10px 14px;
		border-radius: var(--bo-nho);
		background: var(--vang-nhat);
		font-size: 0.92rem;
		font-weight: 650;
	}
	.tieu-de-nho {
		font-size: 0.95rem;
		margin: 4px 0 0;
		color: var(--chu-phu);
		font-weight: 850;
	}
	.hoc-tu {
		justify-self: start;
	}
	.buoc {
		margin: 0;
		padding-left: 1.3em;
		display: grid;
		gap: 8px;
		color: var(--chu-phu);
	}
	.buoc b {
		color: var(--chu);
	}
	.lich-su {
		border-top: 1px dashed var(--vien);
		padding-top: 12px;
		display: grid;
		gap: 8px;
	}
	.lich-su-dau {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.nut-chu {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		border: 0;
		background: none;
		color: var(--chu-phu);
		font-weight: 750;
		cursor: pointer;
	}
	.chip-ds {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.chip-ds .chip {
		text-decoration: none;
		color: var(--chu);
	}
	.chip small {
		color: var(--chu-phu);
		font-weight: 700;
	}
	/* ---- tai video ---- */
	.tai-len {
		display: grid;
		gap: 14px;
	}
	.vung-tha {
		display: grid;
		justify-items: center;
		gap: 6px;
		padding: 34px 20px;
		border-radius: var(--bo);
		border: 2.5px dashed color-mix(in srgb, var(--xanh) 45%, transparent);
		background: var(--xanh-nhat);
		color: var(--xanh-dam);
		text-align: center;
		cursor: pointer;
		transition: background 0.15s ease;
	}
	.vung-tha:hover,
	.vung-tha.keo {
		background: var(--xanh-nhat-2);
	}
	.vung-tha:focus-within {
		outline: 3px solid var(--xanh);
		outline-offset: 2px;
	}
	.vung-tha small {
		color: var(--chu-phu);
		max-width: 44ch;
	}
	.cong-tac {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		cursor: pointer;
	}
	.cong-tac input {
		width: 20px;
		height: 20px;
		margin-top: 2px;
		accent-color: var(--xanh);
	}
	.cong-tac small {
		display: block;
		color: var(--chu-phu);
	}
	.xem-lai {
		width: 100%;
		max-height: 50vh;
		border-radius: var(--bo-vua);
		background: #0f1c2e;
	}
	.xem-lai.guong {
		transform: scaleX(-1);
	}
	.tien-trinh {
		display: grid;
		gap: 6px;
		font-weight: 750;
	}
	progress {
		width: 100%;
		height: 12px;
		accent-color: var(--xanh);
	}
	.nho {
		margin: 0;
		color: var(--chu-phu);
		font-size: 0.9rem;
	}
	.loi {
		margin: 0;
		color: var(--do-chu);
		font-weight: 750;
	}
</style>
