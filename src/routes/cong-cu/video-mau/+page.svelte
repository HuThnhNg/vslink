<!--
	Cong cu cho nhom: chon lai video mau cho 400 tu.
	QIPEDC (danh sach + cau noi tai video) -> khop ten -> mo hinh cham tung bien the
	(Bac / Trung / Nam / cach khac) -> nhom duyet -> xuat static/du-lieu/video-mau.json.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { CauNoiQipedc } from '$lib/cong-cu/cau-noi.svelte';
	import { chamVideo } from '$lib/cong-cu/cham-video';
	import {
		boNgoac,
		ghepThem,
		khopTu,
		nhomQipedc,
		taoChiMuc,
		timQipedc,
		urlVideo,
		type MucQipedc,
		type UngVien
	} from '$lib/cong-cu/khop-tu';
	import {
		diemCua,
		khoaDiem,
		taoTepVideoMau,
		trangThaiTu,
		xepUngVien,
		type BangDiem,
		type LuaChon
	} from '$lib/cong-cu/xuat';
	import { phanTram } from '$lib/loi/dinh-dang';
	import { TEN_CHU_DE, TU_VUNG, boDau } from '$lib/loi/tu-vung';
	import { mienTuMa, TEN_MIEN } from '$lib/loi/video-mau';
	import { LoiMediaPipe } from '$lib/loi/video-tai-len';
	import Search from '@lucide/svelte/icons/search';
	import Copy from '@lucide/svelte/icons/copy';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Play from '@lucide/svelte/icons/play';
	import Pause from '@lucide/svelte/icons/pause';
	import Download from '@lucide/svelte/icons/download';
	import Check from '@lucide/svelte/icons/check';

	const K_DS = 'vslink-cc-qipedc';
	const K_DIEM = 'vslink-cc-diem';
	const K_CHON = 'vslink-cc-chon';
	const K_THEM = 'vslink-cc-them';
	const doc = <T,>(k: string, macDinh: T): T => {
		try {
			return (JSON.parse(localStorage.getItem(k) ?? 'null') as T) ?? macDinh;
		} catch {
			return macDinh;
		}
	};
	const ghi = (k: string, v: unknown) => {
		try {
			localStorage.setItem(k, JSON.stringify(v));
		} catch {
			/* het cho: van chay, chi khong nho */
		}
	};

	let giaLap = $state(false);
	let dsQ = $state.raw<MucQipedc[]>([]);
	let mau = $state('/videos/{ma}.mp4');
	let diem = $state<BangDiem>({});
	let chon = $state<LuaChon>({});
	/** i -> cac ma QIPEDC nhom tu tra va them (ten tren QIPEDC khac ten VSL400) */
	let them = $state<Record<number, string[]>>({});
	let lenh = $state('');
	let daChep = $state(false);

	const cauNoi = new CauNoiQipedc((ds, m) => {
		dsQ = ds;
		mau = m;
		ghi(K_DS, { ds, mau: m });
	});

	const chiMuc = $derived(taoChiMuc(dsQ));
	const theoMa = $derived(new Map(dsQ.map((x) => [x.ma, x])));
	const nhom = $derived(nhomQipedc(dsQ));
	const tuDong = $derived<UngVien[][]>(TU_VUNG.tu.map((t) => khopTu(t, chiMuc, mau)));
	const ungVien = $derived<UngVien[][]>(tuDong.map((uv, i) => ghepThem(uv, them[i], theoMa, mau)));
	const thongKe = $derived.by(() => {
		const c = { khop: 0, 'bo-ngoac': 0, 'bo-tien-to': 0, them: 0, cu: 0, khong: 0, video: 0, themTay: 0 };
		tuDong.forEach((uv) => {
			const dau = uv.find((u) => u.cach !== 'cu') ?? uv[0];
			if (!dau) c.khong++;
			else c[dau.cach]++;
		});
		ungVien.forEach((uv) => {
			c.video += uv.length;
			c.themTay += uv.filter((u) => u.cach === 'them').length;
		});
		return c;
	});
	const trangThai = $derived(ungVien.map((uv, i) => trangThaiTu(i, uv, diem, chon)));
	const demTrangThai = $derived(
		trangThai.reduce<Record<string, number>>((d, t) => ((d[t] = (d[t] ?? 0) + 1), d), {})
	);

	// ---- cham -------------------------------------------------------------------
	let dangCham = $state(false);
	let hienTai = $state('');
	let loiChung = $state<string | null>(null);
	let giayMoiVideo = $state(0);

	function hangCho() {
		const ra: { i: number; u: UngVien }[] = [];
		// tu co nhieu cach ky truoc (chon sai o day moi dang lo), roi den tu chi co mot cach
		const thuTu = ungVien.map((uv, i) => ({ uv, i })).sort((a, b) => Number(b.uv.length > 1) - Number(a.uv.length > 1));
		for (const { uv, i } of thuTu) for (const u of uv) if (!diem[khoaDiem(i, u.ma)]) ra.push({ i, u });
		return ra;
	}
	const conLai = $derived(hangCho().length);
	// chi dem video con trong danh sach (video tu them roi bo thi khong tinh)
	const daCham = $derived(ungVien.reduce((s, uv, i) => s + uv.filter((u) => diem[khoaDiem(i, u.ma)]).length, 0));

	async function chamTatCa() {
		if (dangCham) return;
		dangCham = true;
		loiChung = null;
		for (const { i, u } of hangCho()) {
			if (!dangCham) break;
			hienTai = `${TU_VUNG.tu[i].tu} · ${u.cach === 'cu' ? 'video cũ' : u.mien ? TEN_MIEN[u.mien] : u.ma}`;
			const t0 = performance.now();
			try {
				const blob = await cauNoi.layVideo(u.url);
				diem[khoaDiem(i, u.ma)] = await chamVideo(blob, i, { giaLap });
			} catch (e) {
				const m = (e as Error)?.message ?? String(e);
				if (e instanceof LoiMediaPipe) {
					loiChung = 'Không tải được MediaPipe (mô hình nhìn dáng người). Kiểm tra mạng rồi bấm chấm tiếp.';
					break;
				}
				if (/Chưa nối|không trả lời/.test(m)) {
					loiChung = `${m}. Bấm “Mở QIPEDC”, dán lại đoạn lệnh rồi chấm tiếp — kết quả cũ vẫn giữ.`;
					break;
				}
				diem[khoaDiem(i, u.ma)] = { loi: m };
			}
			ghi(K_DIEM, diem);
			const s = (performance.now() - t0) / 1000;
			giayMoiVideo = giayMoiVideo ? giayMoiVideo * 0.85 + s * 0.15 : s;
		}
		dangCham = false;
		hienTai = '';
	}

	function chamLaiLoi() {
		for (const k of Object.keys(diem)) if ('loi' in diem[k]) delete diem[k];
		ghi(K_DIEM, diem);
	}

	function datChon(i: number, ma: string | null) {
		if (ma === null) delete chon[i];
		else chon[i] = ma;
		ghi(K_CHON, chon);
	}

	function themUV(i: number, ds: string[]) {
		them[i] = [...new Set([...(them[i] ?? []), ...ds])];
		ghi(K_THEM, them);
	}

	function boThem(i: number, ma: string) {
		them[i] = (them[i] ?? []).filter((m) => m !== ma);
		if (!them[i].length) delete them[i];
		if (chon[i] === ma) delete chon[i];
		ghi(K_THEM, them);
		ghi(K_CHON, chon);
	}

	function xoaHet() {
		if (!confirm('Xoá toàn bộ kết quả chấm, lựa chọn tay và video tự thêm trên máy này?')) return;
		diem = {};
		chon = {};
		them = {};
		ghi(K_DIEM, diem);
		ghi(K_CHON, chon);
		ghi(K_THEM, them);
	}

	// ---- nhap / xuat ----------------------------------------------------------------
	async function nhapTep(e: Event) {
		const f = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!f) return;
		try {
			const j = JSON.parse(await f.text()) as { ds?: MucQipedc[]; mau?: string };
			if (!Array.isArray(j.ds)) throw new Error('không có danh sách');
			dsQ = j.ds;
			mau = j.mau ?? mau;
			cauNoi.datDs(dsQ, mau);
			ghi(K_DS, { ds: dsQ, mau });
		} catch (err) {
			alert(`File không đúng dạng (${(err as Error).message}).`);
		}
	}

	function taiXuong() {
		const tep = taoTepVideoMau(ungVien, diem, chon);
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([JSON.stringify(tep, null, 1)], { type: 'application/json' }));
		a.download = 'video-mau.json';
		a.click();
		setTimeout(() => URL.revokeObjectURL(a.href), 2000);
	}

	async function chepLenh() {
		try {
			await navigator.clipboard.writeText(lenh);
			daChep = true;
			setTimeout(() => (daChep = false), 2500);
		} catch {
			alert('Không chép tự động được — bấm “Xem đoạn lệnh”, bôi đen rồi Ctrl+C nhé.');
		}
	}

	// ---- duyet --------------------------------------------------------------------
	type Loc = 'tat-ca' | 'can-xem' | 'chua-cham' | 'da-xong';
	let loc = $state<Loc>('can-xem');
	let tim = $state('');
	let xemThu = $state<string | null>(null); // `${i}:${ma}`
	const NHOM: Record<Loc, (t: string) => boolean> = {
		'tat-ca': () => true,
		'can-xem': (t) => t === 'nghi' || t === 'chua-co',
		'chua-cham': (t) => t === 'chua-cham',
		'da-xong': (t) => t === 'tot' || t === 'kha' || t === 'tay' || t === 'khong'
	};
	const dsHien = $derived(
		TU_VUNG.tu.filter((t) => NHOM[loc](trangThai[t.i]) && (!tim || boDau(t.tu).includes(boDau(tim))))
	);
	const TEN_TT: Record<string, string> = {
		tot: 'Khớp tốt',
		kha: 'Khá',
		nghi: 'Cần xem',
		tay: 'Đã chọn tay',
		khong: 'Không dùng',
		'chua-co': 'Không tìm thấy',
		'chua-cham': 'Chưa chấm'
	};
	const nhanUV = (u: UngVien) =>
		u.cach === 'cu'
			? 'Video cũ'
			: u.cach === 'them'
				? `${u.tuQ}${u.mien ? ` · ${TEN_MIEN[u.mien]}` : ''}`
				: u.mien
					? TEN_MIEN[u.mien]
					: u.ma;
	const chinhCua = (i: number) => chon[i] ?? xepUngVien(i, ungVien[i], diem)[0]?.ma;
	const CACH_KHOP: Record<UngVien['cach'], string> = {
		khop: 'trùng tên',
		'bo-ngoac': 'khớp khi bỏ ngoặc',
		'bo-tien-to': 'khớp khi bỏ tiền tố',
		them: 'nhóm tự thêm',
		cu: 'video cũ'
	};

	// tra tay trong danh sach QIPEDC (tu co ten khac tren QIPEDC)
	let timCho = $state<number | null>(null);
	let timQ = $state('');
	let xemQ = $state<string | null>(null);
	const ketQuaTim = $derived(timCho === null ? [] : timQipedc(nhom, timQ));
	const nhanMa = (m: string) => {
		const mien = mienTuMa(m);
		return mien ? TEN_MIEN[mien] : 'Xem';
	};
	function moTim(i: number, tu: string) {
		if (timCho === i) {
			timCho = null;
			return;
		}
		timCho = i;
		timQ = boNgoac(tu);
		xemQ = null;
	}

	onMount(() => {
		giaLap = page.url.searchParams.has('gia-lap');
		const luu = doc<{ ds: MucQipedc[]; mau: string } | null>(K_DS, null);
		if (luu?.ds?.length) {
			dsQ = luu.ds;
			mau = luu.mau ?? mau;
			cauNoi.datDs(dsQ, mau);
		}
		diem = doc<BangDiem>(K_DIEM, {});
		chon = doc<LuaChon>(K_CHON, {});
		them = doc<Record<number, string[]>>(K_THEM, {});
		fetch(`${base}/cong-cu/lenh-qipedc.js`)
			.then((r) => r.text())
			.then((t) => (lenh = t));
		cauNoi.batDau();
		return () => {
			dangCham = false;
			cauNoi.dung();
		};
	});
</script>

<svelte:head>
	<title>Chọn video mẫu · Công cụ nhóm · VSLink</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="khung-trang luoi">
	<header>
		<p class="nhan-nho">Công cụ cho nhóm</p>
		<h1>Chọn lại video mẫu</h1>
		<p class="phu-de">
			Tìm video của từng từ trên từ điển QIPEDC, cho <b>mô hình chấm từng cách ký</b> (Bắc / Trung / Nam…): cách nào
			mô hình nhận ra rõ nhất là cách giống VSL400 nhất — cũng là cách Mèo chấm người học. Nhóm chỉ cần xem lại những
			từ bị gắn cờ.
		</p>
		{#if giaLap}<p class="gia-lap">Chế độ giả lập: không dùng MediaPipe, chỉ thử luồng xử lý.</p>{/if}
	</header>

	<!-- 1 -->
	<section class="the">
		<div class="dau-muc">
			<h2>1 · Nối với QIPEDC</h2>
			<span class="nhan-tt" data-tt={cauNoi.trangThai} data-testid="trang-thai-noi">
				{cauNoi.trangThai === 'da-noi'
					? `Đã nối · ${dsQ.length.toLocaleString('vi-VN')} video`
					: cauNoi.trangThai === 'cho'
						? 'Đang chờ đoạn lệnh…'
						: dsQ.length
							? `Có danh sách ${dsQ.length.toLocaleString('vi-VN')} video · chưa nối`
							: 'Chưa nối'}
			</span>
		</div>
		<ol class="buoc">
			<li>Bấm <b>Mở QIPEDC</b> — trang “Video 4000 từ” mở ở tab mới. Đừng mở bằng cách khác, tab phải do nút này mở.</li>
			<li>Bấm <b>Sao chép đoạn lệnh</b>.</li>
			<li>
				Ở tab QIPEDC: bấm <b>F12</b> → chọn <b>Console</b> → dán (Ctrl+V) → <b>Enter</b>. Lần đầu Chrome có thể bắt gõ
				<code>allow pasting</code> rồi Enter trước khi cho dán.
			</li>
			<li>Chờ 10–60 giây đến khi hiện thông báo “đã gom … video”. <b>Để tab QIPEDC mở</b> trong lúc chấm.</li>
		</ol>
		<div class="nut-ds">
			<button class="nut" onclick={() => cauNoi.moQipedc()}><ExternalLink size={18} /> Mở QIPEDC</button>
			<button class="nut phu" onclick={chepLenh} disabled={!lenh}>
				{#if daChep}<Check size={18} /> Đã chép{:else}<Copy size={18} /> Sao chép đoạn lệnh{/if}
			</button>
		</div>
		<details>
			<summary>Xem đoạn lệnh (chỉ đọc danh sách công khai, tải video QIPEDC cho trang này)</summary>
			<textarea readonly rows="10" data-testid="lenh-qipedc">{lenh}</textarea>
		</details>
		<p class="nho">
			Đã có file <code>qipedc-danh-sach.json</code>? <label class="chon-tep">Chọn file<input type="file" accept=".json" onchange={nhapTep} /></label>
			(vẫn cần nối tab QIPEDC để chấm).
		</p>
	</section>

	<!-- 2 -->
	{#if dsQ.length}
		<section class="the" data-testid="khop">
			<h2>2 · Khớp 400 từ</h2>
			<div class="so-lieu">
				<div><b>{thongKe.khop}</b><span>trùng tên</span></div>
				<div><b>{thongKe['bo-ngoac']}</b><span>bỏ phần trong ngoặc</span></div>
				<div><b>{thongKe['bo-tien-to']}</b><span>bỏ “con / quả / cái…”</span></div>
				<div><b>{thongKe.cu}</b><span>chỉ có video cũ</span></div>
				<div class="xau"><b>{thongKe.khong}</b><span>không tìm thấy</span></div>
			</div>
			<p class="nho">
				Tổng cộng {thongKe.video} video cần chấm cho 400 từ{thongKe.themTay
					? ` (có ${thongKe.themTay} video nhóm tự thêm)`
					: ''}. Từ không tìm thấy: ở mục 4 bấm <b>Tìm thêm</b> để tra tên khác trên QIPEDC.
			</p>
		</section>
	{/if}

	<!-- 3 -->
	{#if dsQ.length}
		<section class="the">
			<h2>3 · Chấm độ giống VSL400</h2>
			<p class="phu-de">
				Mỗi video mất vài giây. Có thể tạm dừng, tắt máy, hôm sau chấm tiếp — kết quả được lưu trên máy này.
			</p>
			<progress value={daCham} max={daCham + conLai}></progress>
			<p class="tien-trinh" data-testid="tien-trinh">
				Đã chấm <b>{daCham}</b>/{daCham + conLai} video
				{#if dangCham && giayMoiVideo}· còn khoảng {Math.ceil((conLai * giayMoiVideo) / 60)} phút{/if}
				{#if hienTai}<br /><span class="nho">Đang chấm: {hienTai}</span>{/if}
			</p>
			{#if loiChung}<p class="loi">{loiChung}</p>{/if}
			<div class="nut-ds">
				{#if dangCham}
					<button class="nut phu" onclick={() => (dangCham = false)}><Pause size={18} /> Tạm dừng</button>
				{:else}
					<button class="nut" onclick={chamTatCa} disabled={!conLai} data-testid="cham">
						<Play size={18} />
						{daCham ? 'Chấm tiếp' : 'Bắt đầu chấm'}
					</button>
					<button class="nut vien" onclick={chamLaiLoi}>Chấm lại video lỗi</button>
				{/if}
			</div>
		</section>
	{/if}

	<!-- 4 -->
	<section class="the">
		<h2>4 · Duyệt</h2>
		<div class="dem-tt">
			{#each Object.entries(TEN_TT) as [k, ten] (k)}
				<span class="nhan-tt" data-tt={k}>{ten}: {demTrangThai[k] ?? 0}</span>
			{/each}
		</div>
		<div class="loc">
			{#each [['can-xem', 'Cần xem'], ['chua-cham', 'Chưa chấm'], ['da-xong', 'Đã xong'], ['tat-ca', 'Tất cả']] as [k, ten] (k)}
				<button class="chip" aria-pressed={loc === k} onclick={() => (loc = k as Loc)}>{ten}</button>
			{/each}
			<input type="search" placeholder="Tìm từ…" bind:value={tim} aria-label="Tìm từ" />
		</div>
		<p class="nho">
			Mỗi từ: bấm ▶ để xem video, bấm <b>Chọn</b> nếu cách đó đúng hơn cách máy chọn. Không có video nào đúng → “Không
			dùng”.
		</p>
		<ul class="ds-tu" data-testid="ds-duyet">
			{#each dsHien.slice(0, 120) as t (t.i)}
				{@const uv = xepUngVien(t.i, ungVien[t.i], diem)}
				{@const chinh = chinhCua(t.i)}
				<li data-tt={trangThai[t.i]}>
					<div class="dong">
						<b class="ten">{t.tu}</b>
						<span class="chu-de">{TEN_CHU_DE[t.chu_de]}</span>
						<span class="nhan-tt" data-tt={trangThai[t.i]}>{TEN_TT[trangThai[t.i]]}</span>
						<span class="gian"></span>
						{#if dsQ.length}
							<button class="nut-chu" aria-expanded={timCho === t.i} onclick={() => moTim(t.i, t.tu)}>
								<Search size={13} /> Tìm thêm
							</button>
						{/if}
						{#if chon[t.i]}
							<button class="nut-chu" onclick={() => datChon(t.i, null)}>Để máy chọn</button>
						{/if}
						<button class="nut-chu" onclick={() => datChon(t.i, 'khong')} disabled={chon[t.i] === 'khong'}>Không dùng</button>
					</div>
					<div class="uv">
						{#each uv as u (u.ma)}
							{@const d = diem[khoaDiem(t.i, u.ma)]}
							{@const dd = diemCua(diem, t.i, u.ma)}
							<span class="the-uv" class:chinh={u.ma === chinh && chon[t.i] !== 'khong'}>
								<button
									class="xem"
									aria-label="Xem video {nhanUV(u)}"
									onclick={() => (xemThu = xemThu === `${t.i}:${u.ma}` ? null : `${t.i}:${u.ma}`)}
								>
									<Play size={13} />
								</button>
								<span>{nhanUV(u)}</span>
								<small>
									{#if dd}{phanTram(dd.p)} · #{dd.hang}{:else if d}lỗi{:else}chưa chấm{/if}
								</small>
								{#if u.ma === chinh && chon[t.i] !== 'khong'}
									<Check size={14} />
								{:else}
									<button class="nut-chu" onclick={() => datChon(t.i, u.ma)}>Chọn</button>
								{/if}
								{#if u.cach === 'them'}
									<button class="nut-chu bo" onclick={() => boThem(t.i, u.ma)} aria-label="Bỏ video {nhanUV(u)}">Bỏ</button>
								{/if}
							</span>
						{:else}
							<span class="nho">
								Chưa tự tìm thấy trên QIPEDC{dsQ.length ? ' — bấm “Tìm thêm” để tra tên khác, hoặc “Không dùng”.' : '.'}
							</span>
						{/each}
					</div>
					{#if timCho === t.i}
						<div class="tim-q">
							<input
								type="search"
								bind:value={timQ}
								placeholder="Gõ tên trên QIPEDC, không dấu cũng được"
								aria-label="Tìm trong danh sách QIPEDC cho “{t.tu}”"
							/>
							<ul class="kq-tim" data-testid="kq-tim">
								{#each ketQuaTim as n (n.goc)}
									{@const daCo = n.ma.every((m) => ungVien[t.i].some((u) => u.ma === m))}
									<li>
										<span class="kq-ten"><b>{n.tu}</b>{#if n.giaiNghia}<small> — {n.giaiNghia}</small>{/if}</span>
										<span class="kq-nut">
											{#each n.ma as m (m)}
												<button
													class="chip"
													aria-pressed={xemQ === m}
													aria-label="Xem video {n.tu} ({nhanMa(m)})"
													onclick={() => (xemQ = xemQ === m ? null : m)}
												>
													<Play size={12} />
													{nhanMa(m)}
												</button>
											{/each}
											{#if daCo}
												<small class="da-co">Đã có</small>
											{:else}
												<button class="nut-chu" onclick={() => themUV(t.i, n.ma)}>
													Thêm{n.ma.length > 1 ? ` cả ${n.ma.length}` : ''}
												</button>
											{/if}
										</span>
									</li>
								{:else}
									<li class="nho">
										{timQ.trim() ? 'Không thấy — thử gõ ngắn hơn hoặc từ đồng nghĩa.' : 'Gõ để tìm trong danh sách QIPEDC.'}
									</li>
								{/each}
							</ul>
							{#if xemQ}
								<!-- svelte-ignore a11y_media_has_caption -->
								<video src={urlVideo(mau, xemQ)} controls autoplay muted loop playsinline></video>
							{/if}
							<p class="nho">Thêm xong bấm <b>Chấm tiếp</b> ở mục 3 để mô hình chấm, hoặc bấm <b>Chọn</b> luôn nếu chắc chắn.</p>
						</div>
					{/if}
					{#if xemThu?.startsWith(`${t.i}:`)}
						{@const u = uv.find((x) => `${t.i}:${x.ma}` === xemThu)}
						{#if u}
							<div class="xem-thu">
								<!-- svelte-ignore a11y_media_has_caption -->
								<video src={u.url} controls autoplay muted loop playsinline></video>
								<p class="nho">
									{u.tuQ}{u.giaiNghia ? ` — ${u.giaiNghia}` : ''} · {CACH_KHOP[u.cach]}
									{#if diemCua(diem, t.i, u.ma)}· mô hình đoán: “{diemCua(diem, t.i, u.ma)?.doan}”{/if}
								</p>
							</div>
						{/if}
					{/if}
				</li>
			{:else}
				<li class="nho">Không có từ nào trong nhóm này.</li>
			{/each}
		</ul>
		{#if dsHien.length > 120}<p class="nho">Đang hiện 120/{dsHien.length} từ — dùng ô tìm để lọc.</p>{/if}
	</section>

	<!-- 5 -->
	<section class="the">
		<h2>5 · Xuất file cho web</h2>
		<p class="phu-de">
			File chỉ gồm các từ đã chấm hoặc đã chọn tay. Từ “Cần xem” vẫn được xuất nhưng web sẽ ghi chú và không dùng
			trong Đố vui cho tới khi nhóm chọn tay.
		</p>
		<ol class="buoc">
			<li>Bấm <b>Tải video-mau.json</b>.</li>
			<li>Chép đè vào thư mục <code>vslink\static\du-lieu\</code> trên máy.</li>
			<li>GitHub Desktop → Commit → Push. Khoảng 3 phút sau web dùng video mới.</li>
		</ol>
		<div class="nut-ds">
			<button class="nut" onclick={taiXuong} data-testid="xuat"><Download size={18} /> Tải video-mau.json</button>
			<button class="nut vien" onclick={xoaHet}>Xoá kết quả trên máy này</button>
		</div>
	</section>
</div>

<style>
	.luoi {
		display: grid;
		gap: 18px;
		max-width: 980px;
	}
	header .phu-de {
		max-width: 72ch;
	}
	.gia-lap {
		padding: 8px 12px;
		border-radius: var(--bo-nho);
		background: var(--vang-nhat);
		font-weight: 700;
	}
	h2 {
		font-size: 1.2rem;
		margin: 0;
	}
	.dau-muc {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
	}
	.buoc {
		margin: 12px 0;
		padding-left: 1.3em;
		display: grid;
		gap: 6px;
		color: var(--chu-phu);
	}
	.buoc b {
		color: var(--chu);
	}
	code {
		background: var(--nen-2);
		padding: 1px 6px;
		border-radius: 6px;
		font-size: 0.9em;
	}
	.nut-ds {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin: 10px 0;
	}
	details summary {
		cursor: pointer;
		font-weight: 800;
		color: var(--xanh-chu);
		margin-top: 6px;
	}
	textarea {
		width: 100%;
		margin-top: 8px;
		font: 0.78rem/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		background: var(--nen-2);
		color: var(--chu);
		border: 1px solid var(--vien);
		border-radius: var(--bo-nho);
		padding: 10px;
	}
	.nho {
		color: var(--chu-phu);
		font-size: 0.86rem;
		margin: 6px 0;
	}
	.chon-tep {
		color: var(--xanh-chu);
		font-weight: 800;
		cursor: pointer;
		text-decoration: underline;
	}
	.chon-tep input {
		display: none;
	}
	.nhan-tt {
		display: inline-flex;
		align-items: center;
		padding: 3px 10px;
		border-radius: 999px;
		background: var(--nen-2);
		color: var(--chu-phu);
		font-size: 0.78rem;
		font-weight: 800;
		white-space: nowrap;
	}
	.nhan-tt[data-tt='da-noi'],
	.nhan-tt[data-tt='tot'] {
		background: var(--xanh-la-nhat);
		color: var(--xanh-la-chu);
	}
	.nhan-tt[data-tt='cho'],
	.nhan-tt[data-tt='nghi'] {
		background: var(--vang-nhat);
		color: var(--vang-chu);
	}
	.nhan-tt[data-tt='kha'],
	.nhan-tt[data-tt='tay'] {
		background: var(--xanh-nhat);
		color: var(--xanh-dam);
	}
	.nhan-tt[data-tt='chua-co'] {
		background: var(--do-nhat);
		color: var(--do-chu);
	}
	.so-lieu {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
		gap: 10px;
		margin: 10px 0;
	}
	.so-lieu div {
		display: grid;
		padding: 10px 12px;
		border-radius: var(--bo-nho);
		background: var(--nen-2);
	}
	.so-lieu b {
		font-size: 1.5rem;
		font-weight: 900;
	}
	.so-lieu span {
		font-size: 0.82rem;
		color: var(--chu-phu);
		font-weight: 700;
	}
	.so-lieu .xau b {
		color: var(--do-chu);
	}
	progress {
		width: 100%;
		height: 12px;
		accent-color: var(--nut);
	}
	.tien-trinh {
		margin: 6px 0;
		font-weight: 700;
	}
	.loi {
		color: var(--do-chu);
		font-weight: 750;
	}
	.dem-tt,
	.loc {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 10px 0;
	}
	.loc input {
		flex: 1;
		min-width: 160px;
		padding: 6px 12px;
		border-radius: 999px;
		border: 1.5px solid var(--vien);
		background: var(--nen);
	}
	.ds-tu {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 8px;
	}
	.ds-tu > li {
		padding: 10px 12px;
		border-radius: var(--bo-vua);
		border: 1px solid var(--vien);
		background: var(--nen);
	}
	.dong {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}
	.ten {
		font-size: 1.05rem;
	}
	.chu-de {
		color: var(--chu-phu);
		font-size: 0.8rem;
		font-weight: 700;
	}
	.gian {
		flex: 1;
	}
	.nut-chu {
		border: 0;
		background: none;
		color: var(--xanh-chu);
		font-weight: 800;
		font-size: 0.82rem;
		cursor: pointer;
		padding: 2px 4px;
	}
	.nut-chu:disabled {
		color: var(--chu-phu);
		cursor: default;
	}
	.uv {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 8px;
	}
	.the-uv {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px 4px 4px;
		border-radius: 999px;
		border: 1.5px solid var(--vien);
		background: var(--the);
		font-weight: 750;
		font-size: 0.85rem;
	}
	.the-uv.chinh {
		border-color: var(--xanh-la);
		background: var(--xanh-la-nhat);
	}
	.the-uv small {
		color: var(--chu-phu);
		font-variant-numeric: tabular-nums;
	}
	.xem {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		border: 0;
		background: var(--nut);
		color: #fff;
		cursor: pointer;
	}
	.nut-chu.bo {
		color: var(--chu-phu);
		padding: 0 2px;
	}
	.dong .nut-chu {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.xem-thu {
		margin-top: 10px;
	}
	.xem-thu video,
	.tim-q video {
		width: min(100%, 480px);
		border-radius: var(--bo-nho);
		background: #0f1c2e;
	}
	.tim-q {
		margin-top: 10px;
		padding: 10px 12px;
		border-radius: var(--bo-nho);
		background: var(--nen-2);
		display: grid;
		gap: 8px;
	}
	.tim-q input {
		width: 100%;
		padding: 7px 12px;
		border-radius: 999px;
		border: 1.5px solid var(--vien);
		background: var(--nen);
		color: var(--chu);
	}
	.tim-q .nho {
		margin: 0;
	}
	.kq-tim {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 6px;
	}
	.kq-tim li:not(.nho) {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 6px 10px;
		padding: 6px 8px;
		border-radius: var(--bo-nho);
		background: var(--the);
	}
	.kq-ten small {
		color: var(--chu-phu);
	}
	.kq-nut {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
	}
	.kq-nut .chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 0.8rem;
		padding: 3px 10px;
	}
	.da-co {
		color: var(--xanh-la-chu);
		font-weight: 800;
	}
</style>
