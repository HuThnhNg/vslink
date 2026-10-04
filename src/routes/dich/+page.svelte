<!--
	Thong dich: ky truc tiep truoc camera (tu cat doan) hoac tai video len.
	Moi xu ly deu tren may nguoi dung: MediaPipe -> 60 khung -> mo hinh ONNX -> top 5.
	Ba che do: Ky tung tu · Ghep cau (gom top-3 cua tung tu, nghi 3 giay -> Worker/Gemini ghep thanh
	cau, src/lib/cau/ghep-cau.ts; khong co Worker thi noi tu) · Tai video len.
	Loi tren man hinh noi ve KET QUA, khong noi ve cong nghe (AI hay khong) — phan do o /gioi-thieu/.
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
	import { dongGoi, noiSuy } from '$lib/loi/lay-mau';
	import { chayMoHinh } from '$lib/loi/mo-hinh';
	import { NHAN } from '$lib/loi/tu-vung';
	import { docVideo, LoiMediaPipe } from '$lib/loi/video-tai-len';
	import { napCauHinh } from '$lib/meo/hoi-meo';
	import { ghepCau, themTu, TOI_DA_TU, tuDaDoi, type KetQuaCau, type TuTrongCau } from '$lib/cau/ghep-cau';
	import { moGopY } from '$lib/gop-y/gop-y.svelte';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import MessageCircleWarning from '@lucide/svelte/icons/message-circle-warning';
	import X from '@lucide/svelte/icons/x';
	import Camera from '@lucide/svelte/icons/camera';
	import Upload from '@lucide/svelte/icons/upload';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import Trash from '@lucide/svelte/icons/trash';

	type KetQua = { top: DuDoan[]; chatLuong: ChatLuong; nguon: 'camera' | 'video' };

	type Che = 'truc-tiep' | 'cau' | 'video';
	let che = $state<Che>('truc-tiep');
	let giaLap = $state(false);
	let ketQua = $state<KetQua | null>(null);
	let thongBao = $state<string | null>(null);
	let loiCham = $state<string | null>(null);
	let lichSu = $state<{ i: number; tu: string; p: number; id: number }[]>([]);

	// ---- ghep cau --------------------------------------------------------------
	const CHO_GHEP_MS = 3000; // nghi bao lau sau tu cuoi thi tu ghep cau
	const cheDoCau = $derived(che === 'cau');
	let moChon = $state<number | null>(null); // id cua tu dang mo bang doi tu
	let dayCau = $state<TuTrongCau[]>([]);
	let ketQuaCau = $state<KetQuaCau | null>(null);
	let dangGhep = $state(false);
	let henGhep: ReturnType<typeof setTimeout> | undefined;
	let lanGhep = 0; // bo ket qua cu neu day tu da doi trong luc cho Gemini
	const doiTu = $derived(ketQuaCau ? tuDaDoi(dayCau, ketQuaCau.chon) : []);

	function huyHen() {
		if (henGhep) clearTimeout(henGhep);
		henGhep = undefined;
	}

	async function ghep() {
		huyHen();
		if (!dayCau.length) return;
		const lan = ++lanGhep;
		dangGhep = true;
		try {
			const { meo_api } = await napCauHinh();
			const kq = await ghepCau(dayCau, { api: meo_api });
			if (lan === lanGhep) ketQuaCau = kq;
		} finally {
			if (lan === lanGhep) dangGhep = false;
		}
	}

	function doiDayCau(moi: TuTrongCau[]) {
		lanGhep++;
		dangGhep = false;
		huyHen();
		dayCau = moi;
		ketQuaCau = null;
		if (!moi.some((t) => t.id === moChon)) moChon = null;
	}

	/** Nguoi dung tu chon lai mot tu (khi Meo nhan nham): giu dung tu do, ghep lai cau. */
	function chonTu(id: number, u: DuDoan) {
		doiDayCau(dayCau.map((t) => (t.id === id ? { ...t, ungVien: [{ ...u, p: 1 }] } : t)));
		moChon = null;
		ghep();
	}

	// ---- cham mot doan ky hieu ------------------------------------------------
	async function cham(khung: KhungVao[], thoiLuong: number, nguon: KetQua['nguon']) {
		const kp = khung.map((k) => k.kp);
		try {
			// camera chay khong deu -> noi suy theo thoi gian; video tai len deu -> lay nhu notebook
			const p = await chayMoHinh(nguon === 'camera' ? noiSuy(khung) : dongGoi(kp));
			const top = topK(p, NHAN, 5);
			ketQua = { top, chatLuong: doChatLuong(kp, thoiLuong), nguon };
			thongBao = null;
			loiCham = null;
			lichSu = [{ i: top[0].i, tu: top[0].tu, p: top[0].p, id: Date.now() }, ...lichSu].slice(0, 12);
			if (cheDoCau) {
				doiDayCau(themTu(dayCau, top));
				if (nguon === 'camera') henGhep = setTimeout(ghep, CHO_GHEP_MS);
			}
		} catch (e) {
			console.error(e);
			loiCham = 'Mèo chưa sẵn sàng nhận dạng, có thể do mạng yếu khi tải lần đầu. Tải lại trang rồi thử nhé.';
		}
	}

	const phien = new PhienCamera({
		onBatDau: () => {
			thongBao = null;
			huyHen(); // dang ky tu tiep theo -> chua ghep
		},
		onDoan: (khung, thoiLuong) => cham(khung, thoiLuong, 'camera'),
		onBo: (lyDo) => {
			thongBao = LOI_BO[lyDo];
		}
	});

	const dangCham = $derived(che !== 'video' && phien.pha === 'dang-cham');
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
					? 'Mèo chưa tải được bộ nhận dáng người. Kiểm tra mạng rồi bấm “Đoán lại” nhé.'
					: `Mèo không đọc được video này (${(e as Error)?.message ?? e}). Thử video .mp4 hoặc .webm khác nhé.`;
		} finally {
			dangDoc = false;
		}
	}

	function doiChe(c: Che) {
		if ((c === 'cau') !== (che === 'cau')) doiDayCau([]);
		che = c;
		thongBao = null;
	}

	const TIEU_DE: Record<Che, { h1: string; mo_ta: string }> = {
		'truc-tiep': {
			h1: 'Bạn ký, Mèo đoán!',
			mo_ta: 'Giơ tay lên ký một từ rồi hạ tay xuống. Mèo tự biết lúc bạn bắt đầu và kết thúc, không cần bấm nút.'
		},
		cau: {
			h1: 'Ký từng từ, Mèo ghép thành câu',
			mo_ta: 'Ký lần lượt từng từ và hạ tay xuống giữa các từ. Nghỉ 3 giây là Mèo sắp xếp thành một câu tiếng Việt.'
		},
		video: {
			h1: 'Gửi video, Mèo đoán!',
			mo_ta: 'Chọn một video ngắn quay một từ ký hiệu. Video chỉ được xử lý trên máy bạn.'
		}
	};

	onMount(() => {
		giaLap = page.url.searchParams.has('gia-lap');
		const c = page.url.searchParams.get('che');
		if (c === 'video' || c === 'cau') che = c;
		return () => {
			if (urlXem) URL.revokeObjectURL(urlXem);
			huyHen();
		};
	});
</script>

<svelte:head><title>Dịch ký hiệu · VSLink</title></svelte:head>

<div class="khung-trang">
	<header class="dau-trang">
		<div>
			<p class="nhan-nho">Thông dịch</p>
			<h1>{TIEU_DE[che].h1}</h1>
			<p class="phu-de">{TIEU_DE[che].mo_ta}</p>
		</div>
		<div class="tab" role="tablist" aria-label="Cách dịch">
			<button role="tab" aria-selected={che === 'truc-tiep'} onclick={() => doiChe('truc-tiep')}>
				<Camera size={18} /> Từng từ
			</button>
			<button role="tab" aria-selected={che === 'cau'} onclick={() => doiChe('cau')} data-testid="che-cau">
				<MessagesSquare size={18} /> Ghép câu
			</button>
			<button role="tab" aria-selected={che === 'video'} onclick={() => doiChe('video')}>
				<Upload size={18} /> Video
			</button>
		</div>
	</header>

	<div class="luoi">
		<section class="the cot-nhap">
			{#if che !== 'video'}
				{#if giaLap}
					<p class="gia-lap">Chế độ giả lập: một “người que” tự ký để thử cả luồng xử lý, không dùng camera.</p>
				{/if}
				<KhungCamera
					{phien}
					{giaLap}
					goiY={cheDoCau ? (dayCau.length ? 'Ký từ tiếp theo nhé!' : 'Giơ tay lên và ký từ đầu tiên nhé!') : undefined}
				>
					{#if cheDoCau}
						{#if dayCau.length}
							<!-- phu de tren camera: nguoi dang ky thay ngay day tu va cau, khong phai cuon -->
							<div class="phu-de-cau" data-testid="phu-de-cau">
								<span class="tu-cam">{dayCau.map((t) => t.ungVien[0].tu).join(' · ')}</span>
								{#if dangGhep}
									<span class="cau-cam">Mèo đang ghép câu…</span>
								{:else if ketQuaCau}
									<span class="cau-cam">{ketQuaCau.cau}</span>
								{/if}
							</div>
						{/if}
					{:else if ketQua && dau && ketQua.nguon === 'camera' && phien.pha !== 'dang-ky'}
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
			{#if cheDoCau}
				{#if loiCham}
					<BongMeo tamTrang="boi-roi" cau={loiCham} />
				{:else if thongBao}
					<BongMeo tamTrang="boi-roi" cau={thongBao} />
				{/if}
				<div class="khung-cau" data-testid="khung-cau">
					{#if dayCau.length}
						<ol class="day-cau" aria-label="Các từ đã ký">
							{#each dayCau as t, k (t.id)}
								<li
									class="chip"
									class:chua-chac={t.ungVien[0].p < DANH_GIA.nguongChuaChac}
									class:dang-mo={moChon === t.id}
								>
									<button
										class="tu-nut"
										onclick={() => (moChon = moChon === t.id ? null : t.id)}
										aria-expanded={moChon === t.id}
										aria-label="Từ thứ {k + 1}: {t.ungVien[0].tu}. Bấm để đổi từ khác"
									>
										<span class="so">{k + 1}</span>
										{t.ungVien[0].tu}
									</button>
									<button
										class="xoa-tu"
										onclick={() => doiDayCau(dayCau.filter((x) => x.id !== t.id))}
										aria-label="Bỏ từ {t.ungVien[0].tu}"><X size={14} /></button
									>
								</li>
							{/each}
						</ol>
						{#each dayCau.filter((t) => t.id === moChon) as t (t.id)}
							<div class="doi-tu" data-testid="doi-tu">
								{#if t.ungVien.length > 1}
									<span>Không phải “{t.ungVien[0].tu}”? Chọn từ đúng:</span>
									<div class="chip-ds">
										{#each t.ungVien.slice(1) as u (u.i)}
											<button class="chip" onclick={() => chonTu(t.id, u)}>{u.tu}</button>
										{/each}
									</div>
								{:else}
									<span>Bạn đã chọn từ này. Nếu vẫn chưa đúng, bấm × để bỏ rồi ký lại.</span>
								{/if}
							</div>
						{/each}
						{#if dayCau.length >= TOI_DA_TU}<p class="nho">Đã đủ {TOI_DA_TU} từ. Bấm “Dịch thành câu” nhé.</p>{/if}
					{/if}

					{#if dangGhep}
						<p class="nho" role="status">Mèo đang ghép câu…</p>
					{:else if ketQuaCau}
						<p class="cau-lon" data-testid="cau-ghep">{ketQuaCau.cau}</p>
						{#if ketQuaCau.nguon === 'noi' && dayCau.length > 1}
							<p class="nho" data-testid="cau-chua-sap-xep">
								Mèo chưa sắp xếp được thành câu lúc này. Đây là các từ theo thứ tự bạn ký.
							</p>
						{/if}
						{#each doiTu as d (d.thay)}
							<p class="canh-bao">
								Mèo chọn “{d.tu}” thay cho “{d.thay}” cho hợp nghĩa. Nếu chưa đúng, bấm vào từ đó để đổi.
							</p>
						{/each}
					{:else if !dayCau.length}
						<BongMeo tamTrang={phien.pha === 'dang-ky' ? 'nghe' : 'cho'}>
							<p class="meo-noi">Mèo sẵn sàng ghép câu rồi!</p>
						</BongMeo>
						<ol class="buoc">
							<li><b>Ký từng từ</b>, hạ tay xuống sau mỗi từ.</li>
							<li><b>Nghỉ 3 giây.</b> Mèo sẽ sắp xếp các từ thành câu.</li>
							<li><b>Bấm vào một từ</b> nếu Mèo nhận nhầm để chọn từ đúng.</li>
						</ol>
					{/if}

					{#if dayCau.length}
						<div class="nut-cau">
							<button class="nut" onclick={ghep} disabled={dangGhep} data-testid="dich-thanh-cau">
								<Sparkles size={18} /> Dịch thành câu
							</button>
							<button class="nut vien" onclick={() => doiDayCau([])}>
								<Trash size={16} /> Làm lại
							</button>
						</div>
					{/if}
				</div>
				{#if ketQuaCau}
					<button
						class="nut-chu gop-y"
						onclick={() =>
							moGopY({
								trang: 'ghep-cau',
								theLoai: 'cau-sai',
								tuDoan: dayCau.map((t) => t.ungVien[0].tu),
								cau: ketQuaCau?.cau
							})}
					>
						<MessageCircleWarning size={16} /> Câu chưa đúng? Báo cho nhóm
					</button>
				{/if}
			{:else if loiCham}
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
						Mèo chưa chắc lắm, có thể là một trong các từ dưới đây. Thử ký chậm và rõ hơn, hoặc xem video mẫu ở mục Học.
					</p>
				{/if}
				{#if goiY}<p class="canh-bao">{goiY}</p>{/if}
				<h2 class="tieu-de-nho">5 từ Mèo nghĩ tới</h2>
				<Top5 ds={ketQua.top} lienKet />
				<div class="nut-cau">
					<a class="nut vien hoc-tu" href="{base}/hoc/?tu={dau.i}">
						<GraduationCap size={18} /> Học ký “{dau.tu}” cho chuẩn
					</a>
					<button
						class="nut-chu gop-y"
						onclick={() => moGopY({ trang: 'dich', theLoai: 'doan-sai', tuDoan: ketQua?.top.map((t) => t.tu) ?? [] })}
					>
						<MessageCircleWarning size={16} /> Mèo đoán sai? Báo cho nhóm
					</button>
				</div>
			{:else}
				<BongMeo tamTrang={phien.pha === 'dang-ky' ? 'nghe' : 'cho'}>
					<p class="meo-noi">
						{phien.pha === 'dang-ky' ? 'Mèo đang nhìn đây, cứ ký tiếp đi…' : 'Mèo sẵn sàng rồi! Làm theo 3 bước nhé:'}
					</p>
				</BongMeo>
				{#if che === 'video'}
					<ol class="buoc">
						<li><b>Chọn video</b> quay một từ, thấy người ký từ đầu đến bụng.</li>
						<li><b>Chờ Mèo xem</b> từng hình trong video.</li>
						<li><b>Xem kết quả</b> với 5 từ Mèo nghĩ tới.</li>
					</ol>
				{:else}
					<ol class="buoc">
						<li><b>Bật camera</b>, ngồi lùi ra để camera thấy bạn từ đầu đến bụng.</li>
						<li><b>Giơ tay lên và ký</b> một từ trong 400 từ Mèo biết.</li>
						<li><b>Hạ tay xuống.</b> Mèo tự đoán và cho xem 5 khả năng.</li>
					</ol>
				{/if}
			{/if}

			{#if lichSu.length && !cheDoCau}
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
	@media (max-width: 900px) {
		/* dien thoai: cot ket qua nam duoi camera, khong can chieu cao toi thieu (tranh khoang trang) */
		.cot-ket-qua {
			min-height: 0;
		}
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
	.khung-cau {
		display: grid;
		gap: 10px;
		padding: 14px;
		border-radius: var(--bo-vua);
		background: var(--xanh-nhat);
		border: 1px solid color-mix(in srgb, var(--xanh) 25%, transparent);
	}
	.day-cau {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.day-cau .chip {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		padding: 0 4px 0 0;
	}
	.day-cau .chip.dang-mo {
		border-color: var(--xanh);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--xanh) 35%, transparent);
	}
	.tu-nut {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 4px 6px 12px;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		font-weight: 800;
		cursor: pointer;
	}
	.doi-tu {
		display: grid;
		gap: 8px;
		padding: 10px 12px;
		border-radius: var(--bo-nho);
		background: var(--the);
		border: 1px solid var(--vien);
		font-weight: 700;
	}
	.chip-ds button.chip {
		cursor: pointer;
		font: inherit;
		font-weight: 800;
	}
	.nut-chu.gop-y {
		justify-self: start;
		color: var(--xanh-chu);
		padding: 6px 0;
	}
	/* phu de tren camera o che do ghep cau */
	.phu-de-cau {
		display: grid;
		gap: 4px;
		justify-items: center;
		max-width: 100%;
		padding: 10px 16px;
		border-radius: 18px;
		background: color-mix(in srgb, var(--xanh-dam) 88%, transparent);
		color: #fff;
		text-align: center;
		box-shadow: 0 8px 24px -10px rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(6px);
	}
	.tu-cam {
		font-weight: 800;
		font-size: 0.95rem;
		opacity: 0.9;
	}
	.cau-cam {
		font-weight: 900;
		font-size: clamp(1.1rem, 3vw, 1.5rem);
		line-height: 1.25;
	}
	.day-cau .chip.chua-chac {
		background: var(--vang-nhat);
	}
	.day-cau .so {
		font-size: 0.75rem;
		font-weight: 850;
		color: var(--chu-phu);
	}
	.xoa-tu {
		display: inline-grid;
		place-items: center;
		width: 22px;
		height: 22px;
		margin-right: -4px;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: var(--chu-phu);
		cursor: pointer;
	}
	.xoa-tu:hover {
		background: color-mix(in srgb, var(--chu) 10%, transparent);
	}
	.cau-lon {
		margin: 0;
		font-size: clamp(1.3rem, 3vw, 1.7rem);
		font-weight: 900;
		line-height: 1.25;
		color: var(--xanh-dam);
	}
	.nut-cau {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
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
