<!--
	Tap mot tu: video mau + camera. Moi lan ky: mo hinh chay batch che bot (7 bien the)
	-> danhGia (dung / gan dung / chua dung + bo phan + giai doan) -> Meo dien giai.
	Ket luan dung / sai LUON do mo hinh quyet dinh; LLM chi dien dat lai.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { fly } from 'svelte/transition';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import KhungCamera from '$lib/thanh-phan/KhungCamera.svelte';
	import VideoMau from '$lib/thanh-phan/VideoMau.svelte';
	import Top5 from '$lib/thanh-phan/Top5.svelte';
	import BoPhan from '$lib/thanh-phan/BoPhan.svelte';
	import BongMeo from '$lib/meo/BongMeo.svelte';
	import { PhienCamera } from '$lib/loi/camera.svelte';
	import type { KhungVao } from '$lib/loi/cat-doan';
	import { danhGia, doChatLuong, taoBatchCheBot, topK, type DuDoan, type DuKien } from '$lib/loi/danh-gia';
	import { goiYGhiHinh, LOI_BO, phanTram } from '$lib/loi/dinh-dang';
	import { chayMoHinh } from '$lib/loi/mo-hinh';
	import { NHAN, TEN_CHU_DE, TU_VUNG, tuTheoChuDe, type Tu } from '$lib/loi/tu-vung';
	import { HOP_CAO_NHAT, HOP_THUOC, KHOANG_ON, tienDo } from '$lib/kho/tien-do.svelte';
	import { hoiMeo, type LoiMeo } from '$lib/meo/hoi-meo';
	import { tamTrangTuMucDo, type TamTrang } from '$lib/meo/loi-meo';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import SkipForward from '@lucide/svelte/icons/skip-forward';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Star from '@lucide/svelte/icons/star';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Target from '@lucide/svelte/icons/target';
	import CircleQuestionMark from '@lucide/svelte/icons/circle-question-mark';

	let { tu, giaLap = false }: { tu: Tu; giaLap?: boolean } = $props();

	type KetQua = { id: number; duKien: DuKien; top: DuDoan[]; loiMeo: LoiMeo | null };
	let ketQua = $state<KetQua | null>(null);
	let thongBao = $state<string | null>(null);
	let loiCham = $state<string | null>(null);
	let soLan = $state(0);
	/** hop cua tu luc bat dau buoi tap (xem capNhatBanGhi) */
	let hopGoc: number | null = null;
	let dem = 0;

	async function cham(khung: KhungVao[], thoiLuong: number) {
		const id = ++dem;
		const muc = tu;
		const kp = khung.map((k) => k.kp);
		let probs: Float32Array;
		try {
			probs = await chayMoHinh(taoBatchCheBot(kp));
		} catch (e) {
			console.error(e);
			loiCham = 'Mèo không chạy được mô hình nhận dạng (có thể do mạng yếu khi tải lần đầu). Tải lại trang rồi thử nhé.';
			return;
		}
		if (id !== dem || muc.i !== tu.i) return; // da doi tu trong luc cham
		const duKien = danhGia(probs, muc.i, NHAN, doChatLuong(kp, thoiLuong));
		ketQua = { id, duKien, top: topK(probs, NHAN, 5), loiMeo: null };
		thongBao = null;
		loiCham = null;
		hopGoc ??= tienDo.hop(muc.i);
		tienDo.ghi(muc.i, duKien.mucDo === 'dung', { hopGoc });
		soLan++;
		// Meo noi sau (AI co the mat vai giay) — camera khong phai cho
		hoiMeo(duKien).then((l) => {
			if (ketQua?.id === id) ketQua.loiMeo = l;
		});
	}

	const phien = new PhienCamera({
		onBatDau: () => {
			thongBao = null;
		},
		onDoan: (khung, thoiLuong) => cham(khung, thoiLuong),
		onBo: (lyDo) => {
			thongBao = LOI_BO[lyDo];
		}
	});

	// Doi tu (bam tu tiep theo) -> bo ket qua cu; camera van chay, cat doan lam lai.
	$effect(() => {
		void tu.i;
		untrack(() => {
			dem++;
			ketQua = null;
			thongBao = null;
			loiCham = null;
			soLan = 0;
			hopGoc = null;
			phien.datLai();
		});
	});

	const hauTo = $derived(giaLap ? '&gia-lap=1' : '');
	const cungChuDe = $derived(tuTheoChuDe(tu.chu_de));
	const viTri = $derived(cungChuDe.findIndex((t) => t.i === tu.i));
	const tuTruoc = $derived(cungChuDe[(viTri - 1 + cungChuDe.length) % cungChuDe.length]);
	const tuSau = $derived(cungChuDe[(viTri + 1) % cungChuDe.length]);
	const banGhi = $derived(tienDo.tu[tu.i]);
	const d = $derived(ketQua?.duKien ?? null);
	const goiY = $derived(d ? goiYGhiHinh(d.chatLuong) : null);

	const tamTrang = $derived.by((): TamTrang => {
		if (loiCham || thongBao) return 'boi-roi';
		if (ketQua) return ketQua.loiMeo ? tamTrangTuMucDo(ketQua.duKien.mucDo) : 'suy-nghi';
		if (phien.pha === 'dang-cham') return 'suy-nghi';
		if (phien.pha === 'dang-ky') return 'nghe';
		return 'cho';
	});

	/** Tu nen tap tiep: tu den han on -> tu chua thuoc cung chu de -> tu chua hoc. */
	function tuKeTiep(): number {
		const can = tienDo.canOn().filter((j) => j !== tu.i);
		if (can.length) return can[0];
		for (let s = 1; s < cungChuDe.length; s++) {
			const t = cungChuDe[(viTri + s) % cungChuDe.length];
			if (!tienDo.daThuoc(t.i)) return t.i;
		}
		const chua = TU_VUNG.tu.find((t) => !tienDo.tu[t.i] && t.i !== tu.i);
		return chua?.i ?? (tu.i + 1) % TU_VUNG.tu.length;
	}

	function thuLai() {
		dem++;
		ketQua = null;
		thongBao = null;
		phien.datLai();
	}
</script>

<div class="khung-trang">
	<nav class="dieu-huong-tu" aria-label="Chuyển từ">
		<a class="nut vien nho" href="{base}/hoc/{giaLap ? '?gia-lap=1' : ''}"><ArrowLeft size={16} /> Thư viện</a>
		<div class="truoc-sau">
			<a class="nut-tron" href="{base}/hoc/?tu={tuTruoc.i}{hauTo}" aria-label="Từ trước: {tuTruoc.tu}" title={tuTruoc.tu}>
				<ChevronLeft size={20} />
			</a>
			<span>{viTri + 1}/{cungChuDe.length} · {TEN_CHU_DE[tu.chu_de]}</span>
			<a class="nut-tron" href="{base}/hoc/?tu={tuSau.i}{hauTo}" aria-label="Từ sau: {tuSau.tu}" title={tuSau.tu}>
				<ChevronRight size={20} />
			</a>
		</div>
	</nav>

	<header class="tieu-de">
		<p class="nhan-nho">Tập ký</p>
		<h1 data-testid="tu-dang-tap">{tu.tu}</h1>
		<div class="hop" aria-label="Tiến độ từ này: hộp {banGhi?.hop ?? 0}/{HOP_CAO_NHAT}">
			{#each { length: HOP_CAO_NHAT } as _, k (k)}<i class:day={k < (banGhi?.hop ?? 0)}></i>{/each}
			<span>
				{#if !banGhi}Từ mới
				{:else if banGhi.hop >= HOP_THUOC}Đã thuộc · {banGhi.dung}/{banGhi.luot} lần đúng
				{:else}Đang học · {banGhi.dung}/{banGhi.luot} lần đúng{/if}
			</span>
		</div>
	</header>

	<div class="luoi">
		<section class="the o-mau" aria-label="Video mẫu">
			<h2 class="tieu-de-nho">1 · Xem mẫu</h2>
			<VideoMau src={tu.video} tu={tu.tu} />
		</section>

		<section class="the o-cam" aria-label="Camera của bạn">
			<h2 class="tieu-de-nho">2 · Ký lại trước camera</h2>
			{#if giaLap}
				<p class="gia-lap">Chế độ giả lập: “người que” tự ký một động tác cố định để thử luồng chấm, không dùng camera.</p>
			{/if}
			<KhungCamera {phien} {giaLap} goiY="Giơ tay lên và ký “{tu.tu}” nhé!">
				{#if ketQua && phien.pha !== 'dang-ky'}
					{#key ketQua.id}
						<div class="phu-de-cam" data-muc={ketQua.duKien.mucDo} in:fly={{ y: 16, duration: 250 }}>
							{#if ketQua.duKien.mucDo === 'dung'}Đúng rồi!
							{:else if ketQua.duKien.mucDo === 'gan-dung'}Gần đúng · hạng {ketQua.duKien.xepHang}
							{:else}Chưa đúng · Mèo thấy giống “{ketQua.duKien.tuDoan}”{/if}
						</div>
					{/key}
				{/if}
			</KhungCamera>
		</section>

		<section class="the o-kq" aria-live="polite" data-testid="ket-qua-hoc">
			<h2 class="tieu-de-nho">3 · Mèo nhận xét</h2>
			{#if loiCham}
				<BongMeo tamTrang="boi-roi" cau={loiCham} />
			{:else if ketQua && d}
				<div class="ket-luan" data-muc={d.mucDo} data-testid="ket-luan">
					{#if d.mucDo === 'dung'}
						<Star size={22} /> Đúng rồi! <small>Mèo chắc {phanTram(d.xacSuat)}</small>
					{:else if d.mucDo === 'gan-dung'}
						<Sparkles size={22} /> Gần đúng <small>“{d.tuMucTieu}” xếp hạng {d.xepHang}/400</small>
					{:else}
						<Target size={22} /> Chưa đúng <small>“{d.tuMucTieu}” xếp hạng {d.xepHang}/400</small>
					{/if}
				</div>
				<BongMeo {tamTrang} dangNghi={!ketQua.loiMeo} cau={ketQua.loiMeo?.cau ?? ''} nguon={ketQua.loiMeo?.nguon ?? null} />
				{#if thongBao}<p class="canh-bao">{thongBao}</p>{/if}
				{#if goiY}<p class="canh-bao">{goiY}</p>{/if}
				{#if banGhi}
					<p class="hen-on">
						{#if d.mucDo === 'dung'}
							Mèo hẹn bạn ôn lại từ này sau <b>{KHOANG_ON[banGhi.hop]} ngày</b>.
						{:else}
							Mèo sẽ nhắc bạn ôn lại từ này <b>ngày mai</b>. Ký đúng một lần là lên hộp mới!
						{/if}
					</p>
				{/if}
				<div class="nut-ds">
					<button class="nut phu" onclick={thuLai}><RotateCcw size={18} /> Thử lại</button>
					<button class="nut" onclick={() => goto(`${base}/hoc/?tu=${tuKeTiep()}${hauTo}`)}>
						Từ tiếp theo <SkipForward size={18} />
					</button>
				</div>

				<details class="chi-tiet" open>
					<summary>Mèo nhìn thấy gì?</summary>
					<div class="hai-cot">
						<div>
							<h3>5 từ mô hình nghĩ tới</h3>
							<Top5 ds={ketQua.top} mucTieu={{ i: tu.i, tu: tu.tu, hang: d.xepHang, p: d.xacSuat }} />
						</div>
						<div>
							<h3>Bộ phận nào khác mẫu?</h3>
							<BoPhan duKien={d} />
						</div>
					</div>
				</details>
			{:else}
				<BongMeo {tamTrang}>
					<p>
						{#if thongBao}{thongBao}
						{:else if phien.pha === 'dang-ky'}Mèo đang nhìn… ký xong thì hạ tay xuống nhé!
						{:else if phien.pha === 'dang-cham'}Để Mèo xem nào…
						{:else}Xem video mẫu vài lần, rồi bật camera và ký “<b>{tu.tu}</b>” cho Mèo chấm nha!{/if}
					</p>
				</BongMeo>
				<ul class="meo-nho">
					<li>Để camera thấy từ đầu đến bụng, cả hai khuỷu tay.</li>
					<li>Bật <b>Soi gương</b> ở video mẫu để bắt chước dễ hơn.</li>
					<li>Bắt đầu và kết thúc với hai tay hạ xuống.</li>
				</ul>
			{/if}

			<details class="cach-cham">
				<summary><CircleQuestionMark size={16} /> Mèo chấm thế nào?</summary>
				<ul>
					<li>
						<b>Đúng</b>: mô hình xếp “{tu.tu}” <b>hạng 1</b> trong 400 từ. <b>Gần đúng</b>: hạng 2–5.
						<b>Chưa đúng</b>: hạng 6 trở xuống.
					</li>
					<li>
						<b>Bộ phận / đoạn khác mẫu</b>: Mèo lần lượt che bàn tay trái, bàn tay phải, cánh tay, và cho “đứng hình”
						từng đoạn đầu/giữa/cuối, rồi chạy lại mô hình. Che một phần mà mô hình lại nhận ra “{tu.tu}” rõ hơn → phần
						đó đang khác mẫu (phương pháp che bớt — Zeiler &amp; Fergus, ECCV 2014).
					</li>
					<li>
						<b>Lời nhận xét</b>: AI (Gemini) chỉ diễn đạt lại các số đo trên cho dễ hiểu, không tự chấm đúng/sai.
						Không có mạng thì Mèo dùng lời soạn sẵn.
					</li>
					<li>
						Mô hình đoán đúng khoảng 9/10 lần trên tập kiểm tra VSL400 (video quay chuẩn, người ký chưa gặp khi huấn
						luyện). Với camera ở nhà có thể thấp hơn, nên hãy xem thêm 5 từ Mèo nghĩ tới.
					</li>
				</ul>
			</details>
		</section>
	</div>
</div>

<style>
	.dieu-huong-tu {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-bottom: 10px;
		flex-wrap: wrap;
	}
	.truoc-sau {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		font-weight: 750;
		color: var(--chu-phu);
		font-size: 0.9rem;
	}
	.nut-tron {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: var(--the);
		border: 1.5px solid var(--vien);
		color: var(--chu);
	}
	.nut-tron:hover {
		border-color: var(--xanh);
		color: var(--xanh);
	}
	.tieu-de {
		margin-bottom: 16px;
	}
	.tieu-de h1 {
		margin-bottom: 6px;
	}
	.hop {
		display: flex;
		align-items: center;
		gap: 5px;
		color: var(--chu-phu);
		font-weight: 750;
		font-size: 0.9rem;
	}
	.hop i {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--vien);
	}
	.hop i.day {
		background: var(--xanh);
	}
	.hop span {
		margin-left: 6px;
	}
	.luoi {
		display: grid;
		gap: 20px;
		grid-template-areas: 'mau' 'cam' 'kq';
	}
	@media (min-width: 980px) {
		.luoi {
			grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
			grid-template-rows: auto 1fr;
			grid-template-areas: 'cam mau' 'cam kq';
			align-items: start;
		}
		.o-cam {
			position: sticky;
			top: 80px;
		}
	}
	.o-mau {
		grid-area: mau;
	}
	.o-cam {
		grid-area: cam;
	}
	.o-kq {
		grid-area: kq;
		display: grid;
		gap: 14px;
		align-content: start;
	}
	.tieu-de-nho {
		font-size: 0.95rem;
		margin: 0 0 12px;
		color: var(--chu-phu);
		font-weight: 850;
	}
	.o-kq .tieu-de-nho {
		margin: 0;
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
		color: #fff;
		font-size: clamp(1.05rem, 2.6vw, 1.4rem);
		font-weight: 900;
		box-shadow: 0 8px 24px -10px rgba(0, 0, 0, 0.5);
		background: color-mix(in srgb, #b3261e 85%, transparent);
	}
	.phu-de-cam[data-muc='dung'] {
		background: color-mix(in srgb, #1b8a5a 90%, transparent);
	}
	.phu-de-cam[data-muc='gan-dung'] {
		background: color-mix(in srgb, #b7791f 90%, transparent);
	}
	.ket-luan {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		padding: 12px 16px;
		border-radius: var(--bo-vua);
		font-size: 1.35rem;
		font-weight: 900;
	}
	.ket-luan small {
		font-size: 0.9rem;
		font-weight: 750;
		color: var(--chu-phu);
	}
	.ket-luan[data-muc='dung'] {
		background: var(--xanh-la-nhat);
		color: var(--xanh-la-chu);
	}
	.ket-luan[data-muc='gan-dung'] {
		background: var(--vang-nhat);
		color: var(--vang-chu);
	}
	.ket-luan[data-muc='chua-dung'] {
		background: var(--do-nhat);
		color: var(--do-chu);
	}
	.canh-bao {
		margin: 0;
		padding: 10px 14px;
		border-radius: var(--bo-nho);
		background: var(--vang-nhat);
		font-size: 0.92rem;
		font-weight: 650;
	}
	.hen-on {
		margin: 0;
		color: var(--chu-phu);
		font-weight: 650;
		font-size: 0.92rem;
	}
	.nut-ds {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	details {
		border-top: 1px dashed var(--vien);
		padding-top: 10px;
	}
	summary {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
		font-weight: 850;
		color: var(--xanh-dam);
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary::after {
		content: '▾';
		margin-left: 4px;
		transition: transform 0.15s ease;
	}
	details[open] > summary::after {
		transform: rotate(180deg);
	}
	.hai-cot {
		display: grid;
		gap: 18px;
		margin-top: 12px;
	}
	.hai-cot h3 {
		font-size: 0.95rem;
		color: var(--chu-phu);
		margin-bottom: 8px;
	}
	.meo-nho {
		margin: 0;
		padding-left: 1.2em;
		color: var(--chu-phu);
		display: grid;
		gap: 4px;
		font-size: 0.92rem;
	}
	.cach-cham ul {
		margin: 10px 0 0;
		padding-left: 1.2em;
		display: grid;
		gap: 8px;
		color: var(--chu-phu);
		font-size: 0.9rem;
	}
	.cach-cham b {
		color: var(--chu);
	}
</style>
