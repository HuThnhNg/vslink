<!--
	Do vui 2 kieu:
	  xem: xem video mau -> chon nghia dung trong 4 dap an (nhieu cung chu de cho kho).
	  ky : Meo dua mot tu -> ban ky truoc camera -> mo hinh cham (hang 1 = dung).
	Kieu "ky" ghi vao tien do on tap (hop Leitner); kieu "xem" chi tinh ngay hoc.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, scale } from 'svelte/transition';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import KhungCamera from '$lib/thanh-phan/KhungCamera.svelte';
	import VideoMau from '$lib/thanh-phan/VideoMau.svelte';
	import BongMeo from '$lib/meo/BongMeo.svelte';
	import Meo from '$lib/meo/Meo.svelte';
	import { PhienCamera } from '$lib/loi/camera.svelte';
	import { mucDoTuHang, topK, xepHang, type MucDo } from '$lib/loi/danh-gia';
	import { LOI_BO } from '$lib/loi/dinh-dang';
	import { noiSuy } from '$lib/loi/lay-mau';
	import { napVideoMau, videoCua, type TepVideoMau } from '$lib/loi/video-mau';
	import { chayMoHinh } from '$lib/loi/mo-hinh';
	import { NHAN, TEN_CHU_DE, TU_VUNG, tuTheoChuDe, xaoTron, type Tu } from '$lib/loi/tu-vung';
	import { tienDo } from '$lib/kho/tien-do.svelte';
	import type { TamTrang } from '$lib/meo/loi-meo';
	import Eye from '@lucide/svelte/icons/eye';
	import Hand from '@lucide/svelte/icons/hand';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import SkipForward from '@lucide/svelte/icons/skip-forward';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import PartyPopper from '@lucide/svelte/icons/party-popper';

	type Kieu = 'xem' | 'ky';
	type Cau = {
		tu: Tu;
		/** kieu xem: 4 dap an */
		lua: Tu[];
		/** kieu xem: chi so tu da chon */
		chon: number | null;
		/** kieu ky: ket qua lan ky gan nhat */
		ket: MucDo | null;
		hang: number | null;
		tuDoan: string | null;
		soLan: number;
		xemGoiY: boolean;
		boQua: boolean;
		hopGoc: number;
	};

	const SO_CAU: Record<Kieu, number> = { xem: 10, ky: 5 };

	let man = $state<'chon' | 'choi' | 'xong'>('chon');
	let kieu = $state<Kieu>('xem');
	let chuDe = $state('tat-ca');
	let ds = $state<Cau[]>([]);
	let k = $state(0);
	let giaLap = $state(false);
	let thongBao = $state<string | null>(null);
	let dangCham = $state(false);

	const cau = $derived(ds[k] as Cau | undefined);
	const daTraLoi = $derived(!!cau && (kieu === 'xem' ? cau.chon !== null : cau.ket !== null));
	const dungCau = (c: Cau) => (kieu === 'xem' ? c.chon === c.tu.i : c.ket === 'dung');
	const tinh = $derived(ds.filter((c) => !c.boQua));
	const soDung = $derived(tinh.filter(dungCau).length);
	const soGanDung = $derived(kieu === 'ky' ? tinh.filter((c) => c.ket === 'gan-dung').length : 0);

	/** Trang thai mot cau de to mau: '' = chua tra loi. */
	function kqCau(c: Cau): '' | 'dung' | 'gan' | 'sai' | 'bo' {
		if (c.boQua) return 'bo';
		if (kieu === 'xem') return c.chon === null ? '' : c.chon === c.tu.i ? 'dung' : 'sai';
		return c.ket === 'dung' ? 'dung' : c.ket === 'gan-dung' ? 'gan' : c.ket ? 'sai' : '';
	}

	function trongChuDe(t: Tu) {
		return chuDe === 'tat-ca' || t.chu_de === chuDe;
	}

	function taoLuaChon(t: Tu): Tu[] {
		const cung = tuTheoChuDe(t.chu_de).filter((x) => x.i !== t.i);
		const nguon = cung.length >= 3 ? cung : TU_VUNG.tu.filter((x) => x.i !== t.i);
		return xaoTron([t, ...xaoTron(nguon).slice(0, 3)]);
	}

	/** Kieu ky: uu tien tu den han on, roi tu da tap, roi tu moi. */
	function chonTuKy(n: number): Tu[] {
		const denHan = tienDo
			.canOn()
			.map((i) => TU_VUNG.tu[i])
			.filter(trongChuDe);
		const daTap = xaoTron(TU_VUNG.tu.filter((t) => trongChuDe(t) && tienDo.tu[t.i] && !denHan.includes(t)));
		const moi = xaoTron(TU_VUNG.tu.filter((t) => trongChuDe(t) && !tienDo.tu[t.i]));
		return xaoTron([...denHan, ...daTap, ...moi].slice(0, n));
	}

	// Video mau: kieu "xem" chi dung tu co video DA DUYET (video sai thi do sai).
	let tepVideo = $state<TepVideoMau>({ phien_ban: 0, tu: {} });
	let daNapVideo = $state(false);
	const coVideo = $derived(TU_VUNG.tu.filter((t) => videoCua(tepVideo, t).daDuyet));
	const coVideoChuDe = $derived(coVideo.filter(trongChuDe));
	const nguonXem = $derived(coVideoChuDe.length >= 4 ? coVideoChuDe : coVideo);

	function batDau(kieuMoi: Kieu) {
		if (kieuMoi === 'xem' && nguonXem.length < 4) return;
		kieu = kieuMoi;
		const n = SO_CAU[kieuMoi];
		const tu = kieuMoi === 'xem' ? xaoTron(nguonXem).slice(0, n) : chonTuKy(n);
		ds = tu.map((t) => ({
			tu: t,
			lua: kieuMoi === 'xem' ? taoLuaChon(t) : [],
			chon: null,
			ket: null,
			hang: null,
			tuDoan: null,
			soLan: 0,
			xemGoiY: false,
			boQua: false,
			hopGoc: tienDo.hop(t.i)
		}));
		k = 0;
		thongBao = null;
		man = 'choi';
		phien.datLai();
	}

	function chon(t: Tu) {
		if (!cau || cau.chon !== null) return;
		cau.chon = t.i;
	}

	/** Chot cau hien tai (kieu ky: ghi vao tien do) roi sang cau sau / ket thuc. */
	function cauTiep() {
		const c = ds[k];
		if (c && kieu === 'ky' && c.ket && !c.xemGoiY && !c.boQua) {
			tienDo.ghi(c.tu.i, c.ket === 'dung', { hopGoc: c.hopGoc });
		}
		thongBao = null;
		phien.datLai();
		if (k + 1 < ds.length) k++;
		else {
			if (kieu === 'xem') tienDo.ghiNgay();
			man = 'xong';
			phien.dung();
		}
	}

	function boQua() {
		if (!cau) return;
		cau.boQua = true;
		cauTiep();
	}

	// ---- kieu ky: camera ------------------------------------------------------
	const phien = new PhienCamera({
		onBatDau: () => {
			thongBao = null;
		},
		onDoan: async (khung) => {
			const kk = k;
			const c = ds[kk];
			if (man !== 'choi' || kieu !== 'ky' || !c || c.ket === 'dung') return;
			dangCham = true;
			try {
				const p = await chayMoHinh(noiSuy(khung));
				if (k !== kk || man !== 'choi') return;
				const hang = xepHang(p, c.tu.i);
				c.hang = hang;
				c.ket = mucDoTuHang(hang);
				c.tuDoan = topK(p, NHAN, 1)[0].tu;
				c.soLan++;
			} catch (e) {
				console.error(e);
				thongBao = 'Mèo chưa sẵn sàng nhận dạng, có thể do mạng yếu. Tải lại trang rồi thử nhé.';
			} finally {
				dangCham = false;
			}
		},
		onBo: (lyDo) => {
			thongBao = LOI_BO[lyDo];
		}
	});

	function thuLai() {
		if (!cau) return;
		cau.ket = null;
		cau.hang = null;
		cau.tuDoan = null;
		thongBao = null;
		phien.datLai();
	}

	const tamTrang = $derived.by((): TamTrang => {
		if (!cau) return 'cho';
		if (kieu === 'xem') return cau.chon === null ? 'nghe' : cau.chon === cau.tu.i ? 'vui' : 'boi-roi';
		if (dangCham || phien.pha === 'dang-cham') return 'suy-nghi';
		if (cau.ket === 'dung') return 'vui';
		if (cau.ket === 'gan-dung') return 'co-vu';
		if (cau.ket === 'chua-dung' || thongBao) return 'boi-roi';
		return phien.pha === 'dang-ky' ? 'nghe' : 'cho';
	});

	const ketLuanCuoi = $derived.by(() => {
		const n = tinh.length || 1;
		const r = soDung / n;
		if (r >= 0.9) return { tam: 'vui' as TamTrang, cau: 'Xuất sắc! Mèo phải vẫy đuôi liên tục luôn nè!' };
		if (r >= 0.6) return { tam: 'vui' as TamTrang, cau: 'Giỏi lắm! Ôn thêm mấy từ còn sai là thành cao thủ.' };
		if (r >= 0.3) return { tam: 'co-vu' as TamTrang, cau: 'Khá lắm rồi! Xem lại video mẫu các từ sai rồi chơi lại nha.' };
		return { tam: 'co-vu' as TamTrang, cau: 'Ai mới học cũng vậy mà! Tập từng từ ở mục Học rồi quay lại thử sức nhé.' };
	});

	function phim(e: KeyboardEvent) {
		if (man !== 'choi' || kieu !== 'xem' || !cau) return;
		if (e.target instanceof HTMLInputElement) return;
		const so = Number(e.key);
		if (cau.chon === null && so >= 1 && so <= cau.lua.length) chon(cau.lua[so - 1]);
		else if (cau.chon !== null && (e.key === 'Enter' || e.key === 'ArrowRight')) cauTiep();
	}

	onMount(async () => {
		tienDo.nap();
		tepVideo = await napVideoMau();
		daNapVideo = true;
		giaLap = page.url.searchParams.has('gia-lap');
		const kieuUrl = page.url.searchParams.get('kieu');
		if (kieuUrl === 'xem' || kieuUrl === 'ky') batDau(kieuUrl);
	});
</script>

<svelte:head><title>Đố vui · VSLink</title></svelte:head>
<svelte:window onkeydown={phim} />

<div class="khung-trang">
	{#if man === 'chon'}
		<header class="dau-trang">
			<div>
				<p class="nhan-nho">Đố vui</p>
				<h1>Thử tài cùng Mèo</h1>
				<p class="phu-de">Chơi vài phút mỗi ngày để nhớ lâu hơn. Chọn kiểu chơi và chủ đề nhé!</p>
			</div>
			<Meo tamTrang="co-vu" kichThuoc={120} />
		</header>

		<div class="hai-kieu">
			<button
				class="the kieu"
				onclick={() => batDau('xem')}
				data-testid="choi-xem"
				disabled={!daNapVideo || nguonXem.length < 4}
			>
				<span class="bieu-tuong xanh"><Eye size={28} /></span>
				<h2>Xem ký hiệu, đoán nghĩa</h2>
				<p class="phu-de">Xem video mẫu rồi chọn nghĩa đúng trong 4 đáp án. Mỗi lượt có {SO_CAU.xem} câu.</p>
				{#if daNapVideo && nguonXem.length < 4}
					<p class="tam-khoa" data-testid="xem-tam-khoa">
						Nhóm đang duyệt lại video mẫu cho đúng cách ký ({coVideo.length}/400 từ đã xong). Quay lại sau nhé!
					</p>
				{:else if daNapVideo && coVideoChuDe.length < 4 && chuDe !== 'tat-ca'}
					<p class="tam-khoa">Chủ đề này chưa đủ video mẫu, nên Mèo sẽ hỏi từ ở mọi chủ đề.</p>
				{:else}
					<span class="nut">Chơi ngay <ArrowRight size={18} /></span>
				{/if}
			</button>
			<button class="the kieu" onclick={() => batDau('ky')} data-testid="choi-ky">
				<span class="bieu-tuong cam"><Hand size={28} /></span>
				<h2>Thấy chữ, tự ký</h2>
				<p class="phu-de">
					Mèo đưa ra một từ, bạn ký lại trước camera. Mỗi lượt có {SO_CAU.ky} câu, ưu tiên những từ bạn sắp quên. Kết quả
					được ghi vào tiến độ.
				</p>
				<span class="nut">Chơi ngay <ArrowRight size={18} /></span>
			</button>
		</div>

		<section class="the chon-chu-de">
			<h2 class="tieu-de-nho">Chủ đề</h2>
			<div class="chip-ds">
				<button class="chip" aria-pressed={chuDe === 'tat-ca'} onclick={() => (chuDe = 'tat-ca')}>Mọi chủ đề</button>
				{#each TU_VUNG.chu_de as c (c.ma)}
					<button class="chip" aria-pressed={chuDe === c.ma} onclick={() => (chuDe = c.ma)}>{c.ten}</button>
				{/each}
			</div>
		</section>
	{:else if man === 'choi' && cau}
		<div class="thanh-cau">
			<button class="nut vien nho" onclick={() => ((man = 'chon'), phien.dung())}>Thoát</button>
			<ol class="cham-cau" aria-label="Tiến độ trò chơi">
				{#each ds as c, j (j)}
					<li class:hien-tai={j === k} data-kq={kqCau(c)}></li>
				{/each}
			</ol>
			<span class="diem">Câu {k + 1}/{ds.length} · <b>{soDung}</b> đúng</span>
		</div>

		{#if kieu === 'xem'}
			<div class="luoi-xem">
				<section class="the">
					<h2 class="tieu-de-nho">Ký hiệu này nghĩa là gì?</h2>
					{#key k}
						<VideoMau ds={videoCua(tepVideo, cau.tu).ds.slice(0, 1)} tu={cau.chon === null ? '?' : cau.tu.tu} />
					{/key}
				</section>
				<section class="the cot-dap-an">
					<div class="dap-an" role="group" aria-label="Đáp án">
						{#each cau.lua as t, j (t.i)}
							<button
								class="lua"
								data-testid="dap-an"
								class:dung={cau.chon !== null && t.i === cau.tu.i}
								class:sai={cau.chon === t.i && t.i !== cau.tu.i}
								disabled={cau.chon !== null}
								onclick={() => chon(t)}
							>
								<kbd>{j + 1}</kbd>
								{t.tu}
								{#if cau.chon !== null && t.i === cau.tu.i}<Check size={20} />{:else if cau.chon === t.i}<X size={20} />{/if}
							</button>
						{/each}
					</div>
					{#if cau.chon !== null}
						<div in:fly={{ y: 12, duration: 200 }} class="phan-hoi">
							<BongMeo
								{tamTrang}
								kichThuoc={84}
								cau={cau.chon === cau.tu.i
									? 'Chuẩn luôn! Mắt tinh ghê.'
									: `Chưa đúng rồi, đây là “${cau.tu.tu}”. Xem lại video một lần nữa cho nhớ nha.`}
							/>
							<div class="nut-ds">
								<button class="nut" onclick={cauTiep} data-testid="cau-tiep">
									{k + 1 < ds.length ? 'Câu tiếp theo' : 'Xem kết quả'}
									<ArrowRight size={18} />
								</button>
								{#if cau.chon !== cau.tu.i}
									<a class="nut vien" href="{base}/hoc/?tu={cau.tu.i}" target="_blank" rel="noopener">Tập từ này</a>
								{/if}
							</div>
						</div>
					{:else}
						<p class="goi-y-phim">Mẹo: bấm phím 1–4 để chọn nhanh.</p>
						<button class="nut-chu" onclick={boQua}><SkipForward size={16} /> Video không chạy? Bỏ qua câu này</button>
					{/if}
				</section>
			</div>
		{:else}
			<div class="luoi-ky">
				<section class="the o-cam">
					{#if giaLap}
						<p class="gia-lap">Chế độ giả lập: “người que” tự ký, không dùng camera.</p>
					{/if}
					<KhungCamera {phien} {giaLap} goiY="Giơ tay lên và ký “{cau.tu.tu}”!" />
				</section>
				<section class="the de-bai" aria-live="polite">
					<p class="nhan-nho">Ký từ này</p>
					{#key k}
						<p class="tu-de" in:scale={{ start: 0.9, duration: 200 }} data-testid="tu-de">{cau.tu.tu}</p>
					{/key}
					<p class="chu-de-nho">{TEN_CHU_DE[cau.tu.chu_de]}</p>
					<BongMeo {tamTrang} kichThuoc={84} dangNghi={dangCham}>
						<p data-testid="phan-hoi-ky">
							{#if cau.ket === 'dung'}Đúng rồi! Mèo nhận ra “{cau.tu.tu}” ngay.
							{:else if cau.ket === 'gan-dung'}Gần đúng rồi! Mèo thấy hơi giống “{cau.tuDoan}” hơn một chút.
							{:else if cau.ket === 'chua-dung'}Mèo thấy giống “{cau.tuDoan}” hơn. Thử lại hoặc xem gợi ý nhé.
							{:else if thongBao}{thongBao}
							{:else}Ký từ này trước camera, ký xong hạ tay xuống nhé!{/if}
						</p>
					</BongMeo>
					<div class="nut-ds">
						{#if cau.ket}
							<button class="nut" onclick={cauTiep} data-testid="cau-tiep">
								{k + 1 < ds.length ? 'Câu tiếp theo' : 'Xem kết quả'}
								<ArrowRight size={18} />
							</button>
							{#if cau.ket !== 'dung'}
								<button class="nut phu" onclick={thuLai}><RotateCcw size={18} /> Thử lại</button>
							{/if}
						{:else}
							<button class="nut phu" onclick={() => (cau.xemGoiY = true)} disabled={cau.xemGoiY}>
								<Lightbulb size={18} /> Xem gợi ý
							</button>
							<button class="nut vien" onclick={boQua}><SkipForward size={18} /> Bỏ qua</button>
						{/if}
					</div>
					{#if cau.xemGoiY}
						<p class="nho">Đã xem gợi ý: câu này không tính vào lịch ôn tập.</p>
						{@const v = videoCua(tepVideo, cau.tu)}
						<VideoMau ds={v.ds} tu={cau.tu.tu} i={cau.tu.i} canhBao={v.canhBao} guongMacDinh />
					{/if}
				</section>
			</div>
		{/if}
	{:else if man === 'xong'}
		<section class="the tong-ket" data-testid="tong-ket">
			<div class="tong-ket-dau">
				<Meo tamTrang={ketLuanCuoi.tam} kichThuoc={130} />
				<div>
					<p class="nhan-nho"><PartyPopper size={16} /> Xong rồi!</p>
					<p class="diem-lon">{soDung}<span>/{tinh.length}</span></p>
					<p>
						câu đúng{#if soGanDung}, {soGanDung} câu gần đúng{/if}.
						{ketLuanCuoi.cau}
					</p>
				</div>
			</div>
			<ul class="ds-ket-qua">
				{#each ds as c, j (j)}
					<li data-kq={kqCau(c) || 'sai'}>
						<span class="dau-kq">
							{#if c.boQua}–{:else if dungCau(c)}<Check size={16} />{:else}<X size={16} />{/if}
						</span>
						<span class="ten">{c.tu.tu}</span>
						{#if !c.boQua && !dungCau(c)}
							<a href="{base}/hoc/?tu={c.tu.i}">Tập từ này</a>
						{/if}
					</li>
				{/each}
			</ul>
			<div class="nut-ds">
				<button class="nut" onclick={() => batDau(kieu)}><RotateCcw size={18} /> Chơi lại</button>
				<button class="nut phu" onclick={() => (man = 'chon')}>Đổi kiểu chơi</button>
				<a class="nut vien" href="{base}/tien-do/">Xem tiến độ</a>
			</div>
		</section>
	{/if}
</div>

<style>
	.dau-trang {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 16px;
		margin-bottom: 18px;
	}
	.hai-kieu {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 18px;
		margin-bottom: 18px;
	}
	.kieu {
		display: grid;
		justify-items: start;
		gap: 8px;
		text-align: left;
		cursor: pointer;
		transition:
			transform 0.15s ease,
			border-color 0.15s ease;
	}
	.kieu:disabled {
		cursor: not-allowed;
		opacity: 0.75;
		transform: none;
	}
	.tam-khoa {
		margin: 0;
		padding: 8px 12px;
		border-radius: var(--bo-nho);
		background: var(--vang-nhat);
		color: var(--vang-chu);
		font-weight: 750;
		font-size: 0.9rem;
	}
	.kieu:hover {
		transform: translateY(-3px);
		border-color: var(--xanh);
	}
	.kieu h2 {
		margin: 4px 0 0;
	}
	.kieu p {
		margin: 0 0 6px;
	}
	.bieu-tuong {
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		border-radius: 18px;
	}
	.bieu-tuong.xanh {
		background: var(--xanh-nhat);
		color: var(--xanh);
	}
	.bieu-tuong.cam {
		background: var(--vang-nhat);
		color: var(--vang-chu);
	}
	.chip-ds {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.tieu-de-nho {
		font-size: 0.95rem;
		margin: 0 0 12px;
		color: var(--chu-phu);
		font-weight: 850;
	}
	.thanh-cau {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 16px;
		flex-wrap: wrap;
	}
	.cham-cau {
		display: flex;
		gap: 6px;
		list-style: none;
		margin: 0;
		padding: 0;
		flex: 1;
		min-width: 150px;
	}
	.cham-cau li {
		flex: 1;
		max-width: 44px;
		height: 10px;
		border-radius: 999px;
		background: var(--vien);
	}
	.cham-cau li.hien-tai {
		box-shadow: 0 0 0 2px var(--xanh);
	}
	.cham-cau li[data-kq='dung'] {
		background: var(--xanh-la);
	}
	.cham-cau li[data-kq='gan'] {
		background: var(--vang);
	}
	.cham-cau li[data-kq='sai'] {
		background: var(--do);
	}
	.cham-cau li[data-kq='bo'] {
		background: repeating-linear-gradient(45deg, var(--vien), var(--vien) 3px, transparent 3px, transparent 6px);
	}
	.diem {
		font-weight: 750;
		color: var(--chu-phu);
	}
	.diem b {
		color: var(--xanh-la-chu);
	}
	.luoi-xem,
	.luoi-ky {
		display: grid;
		gap: 20px;
		grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
		align-items: start;
	}
	@media (max-width: 900px) {
		.luoi-xem,
		.luoi-ky {
			grid-template-columns: 1fr;
		}
	}
	.cot-dap-an {
		display: grid;
		gap: 14px;
	}
	.dap-an {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.lua {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 64px;
		padding: 10px 14px;
		border-radius: var(--bo-vua);
		border: 2px solid var(--vien);
		background: var(--the);
		font-weight: 800;
		font-size: 1.05rem;
		text-align: left;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			transform 0.1s ease;
	}
	.lua:not(:disabled):hover {
		border-color: var(--xanh);
		transform: translateY(-1px);
	}
	.lua:disabled {
		cursor: default;
		color: var(--chu-phu);
	}
	.lua.dung {
		border-color: var(--xanh-la);
		background: var(--xanh-la-nhat);
		color: var(--xanh-la-chu);
	}
	.lua.sai {
		border-color: var(--do);
		background: var(--do-nhat);
		color: var(--do-chu);
	}
	.lua :global(svg) {
		margin-left: auto;
		flex: none;
	}
	kbd {
		display: inline-grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 7px;
		background: var(--xanh-nhat);
		color: var(--xanh-dam);
		font: inherit;
		font-size: 0.8rem;
		flex: none;
	}
	.phan-hoi {
		display: grid;
		gap: 12px;
	}
	.nut-ds {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.goi-y-phim {
		margin: 0;
		font-size: 0.85rem;
		color: var(--chu-phu);
	}
	.nut-chu {
		justify-self: start;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		border: 0;
		background: none;
		color: var(--chu-phu);
		font-weight: 750;
		cursor: pointer;
		padding: 0;
	}
	.gia-lap {
		margin: 0 0 12px;
		padding: 8px 12px;
		border-radius: var(--bo-nho);
		background: var(--vang-nhat);
		font-size: 0.9rem;
		font-weight: 700;
	}
	.de-bai {
		display: grid;
		gap: 12px;
	}
	.de-bai .nhan-nho {
		margin: 0;
	}
	.tu-de {
		margin: 0;
		font-size: clamp(2rem, 5vw, 3rem);
		font-weight: 900;
		line-height: 1.1;
		color: var(--xanh-dam);
	}
	.chu-de-nho {
		margin: -6px 0 0;
		color: var(--chu-phu);
		font-weight: 700;
	}
	.nho {
		margin: 0;
		color: var(--chu-phu);
		font-size: 0.88rem;
	}
	.tong-ket {
		max-width: 720px;
		margin-inline: auto;
		display: grid;
		gap: 18px;
	}
	.tong-ket-dau {
		display: flex;
		align-items: center;
		gap: 20px;
		flex-wrap: wrap;
	}
	.tong-ket-dau .nhan-nho {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0;
	}
	.diem-lon {
		margin: 0;
		font-size: 3.4rem;
		font-weight: 900;
		line-height: 1;
		color: var(--xanh);
	}
	.diem-lon span {
		font-size: 1.6rem;
		color: var(--chu-phu);
	}
	.ds-ket-qua {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 8px;
	}
	.ds-ket-qua li {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border-radius: var(--bo-nho);
		background: var(--nen-2);
		font-weight: 750;
	}
	.ds-ket-qua .ten {
		flex: 1;
	}
	.ds-ket-qua a {
		font-size: 0.85rem;
	}
	.dau-kq {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--vien);
		color: #fff;
	}
	[data-kq='dung'] .dau-kq {
		background: var(--xanh-la);
	}
	[data-kq='gan'] .dau-kq {
		background: var(--vang);
	}
	[data-kq='sai'] .dau-kq {
		background: var(--do);
	}
</style>
