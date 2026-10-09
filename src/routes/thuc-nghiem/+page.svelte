<!--
	/thuc-nghiem/           -> nhap ma nguoi tham gia (O01… online, F01… offline)
	/thuc-nghiem/?ma=O07    -> link tu Google Form online, dien san ma
	Them &gia-lap=1 de thu luong khong can camera; khi gia lap, &giay=10 rut ngan thoi gian hoc moi bo.
	Thu tu buoc, bo tu, nhom: $lib/thuc-nghiem/kich-ban.ts. Ghi ket qua: $lib/thuc-nghiem/ghi.ts.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { napVideoMau, type TepVideoMau } from '$lib/loi/video-mau';
	import { napCauHinh } from '$lib/meo/hoi-meo';
	import { CAU_HINH, docMa, taoKichBan, type Buoc, type LanKy, type NguoiThamGia } from '$lib/thuc-nghiem/kich-ban';
	import { HangDoi, moTaThietBi, sangCsv, taoDong, type DongGhi, type SuKien, type TrangThaiGui } from '$lib/thuc-nghiem/ghi';
	import BaiNhanDien from '$lib/thuc-nghiem/BaiNhanDien.svelte';
	import HocBo from '$lib/thuc-nghiem/HocBo.svelte';
	import CamNhan from '$lib/thuc-nghiem/CamNhan.svelte';
	import KyLai from '$lib/thuc-nghiem/KyLai.svelte';

	const KHOA_PHIEN = 'vslink-tn-phien';

	let tepVideo = $state<TepVideoMau>({ phien_ban: 0, tu: {} });
	let giaLap = $state(false);
	/** chi de chay thu (kem gia-lap): ghi de thoi gian hoc moi bo */
	let giayThu = $state<number | null>(null);
	let maNhap = $state('');
	let loiMa = $state<string | null>(null);
	let nguoi = $state<NguoiThamGia | null>(null);
	let kichBan = $state<Buoc[]>([]);
	let idx = $state(0);
	let dongY = $state(false);
	let rutLui = $state(false);
	let dangDo = $state<{ ma: string; idx: number } | null>(null);
	let gui = $state<TrangThaiGui>({ choGui: 0, daLuu: 0, loi: null });
	let hangDoi: HangDoi | null = null;
	let tBuoc = 0;

	const buoc = $derived(kichBan[idx] as Buoc | undefined);
	const soBuocLam = $derived(kichBan.filter((b) => b.loai !== 'xong').length);

	function ghi(suKien: SuKien, them: Partial<DongGhi> = {}) {
		if (!nguoi || !buoc) return;
		hangDoi?.ghi(taoDong(nguoi, buoc.ten, suKien, them));
	}

	function luuPhien() {
		try {
			if (nguoi && buoc?.loai !== 'xong') localStorage.setItem(KHOA_PHIEN, JSON.stringify({ ma: nguoi.ma, idx }));
			else localStorage.removeItem(KHOA_PHIEN);
		} catch {
			/* bo qua */
		}
	}

	function vaoBuoc(i: number) {
		idx = i;
		tBuoc = performance.now();
		luuPhien();
		const b = kichBan[i];
		ghi('bat-dau', 'bo' in b ? { bo: b.bo, phan_hoi: b.phanHoi } : {});
		window.scrollTo({ top: 0 });
	}

	function hetBuoc(them: Partial<DongGhi> = {}) {
		const b = buoc;
		if (!b) return;
		ghi('het-buoc', { ms: Math.round(performance.now() - tBuoc), ...('bo' in b ? { bo: b.bo, phan_hoi: b.phanHoi } : {}), ...them });
		vaoBuoc(idx + 1);
	}

	function batDau(ma: string, tuBuoc = 0) {
		const n = docMa(ma);
		if (!n) {
			loiMa = 'Mã chưa đúng dạng. Ví dụ: O07 (online) hoặc F12 (tại trường).';
			return;
		}
		loiMa = null;
		nguoi = n;
		kichBan = taoKichBan(n);
		dongY = false;
		rutLui = false;
		dangDo = null;
		idx = tuBuoc;
		if (tuBuoc === 0) {
			ghi('thiet-bi', { thiet_bi: moTaThietBi(navigator as Navigator & { deviceMemory?: number }, screen) });
		}
		vaoBuoc(tuBuoc);
	}

	function nguoiTiepTheo() {
		nguoi = null;
		kichBan = [];
		idx = 0;
		maNhap = '';
		dongY = false;
		rutLui = false;
		try {
			localStorage.removeItem(KHOA_PHIEN);
		} catch {
			/* bo qua */
		}
	}

	function dungThamGia() {
		if (!confirm('Bạn muốn dừng tham gia? Dữ liệu của bạn sẽ không được dùng.')) return;
		ghi('rut-lui');
		rutLui = true;
		vaoBuoc(kichBan.length - 1);
	}

	function ghiKy(k: LanKy, b: Buoc) {
		ghi('ky', {
			bo: 'bo' in b ? b.bo : '',
			phan_hoi: 'phanHoi' in b ? b.phanHoi : null,
			tu: k.tu.tu,
			tra_loi: k.top5[0] ?? '',
			dung: k.hang === 1,
			hang: k.hang,
			muc_do: k.mucDo,
			top5: k.top5.join(', '),
			lan: k.lan,
			ms: k.ms
		});
	}

	function taiVe() {
		if (!hangDoi) return;
		const blob = new Blob([sangCsv(hangDoi.tatCa())], { type: 'text/csv;charset=utf-8' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `thuc-nghiem-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.csv`;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	onMount(() => {
		hangDoi = new HangDoi(async () => (await napCauHinh()).meo_api, localStorage, (t) => (gui = t));
		void hangDoi.gui(); // gui not dong con ton tu buoi truoc
		napVideoMau().then((t) => (tepVideo = t));
		giaLap = page.url.searchParams.has('gia-lap');
		const g = Number(page.url.searchParams.get('giay'));
		if (giaLap && Number.isInteger(g) && g > 0) giayThu = g;
		maNhap = page.url.searchParams.get('ma') ?? '';
		try {
			const d = JSON.parse(localStorage.getItem(KHOA_PHIEN) ?? 'null');
			if (d && typeof d.ma === 'string' && Number.isInteger(d.idx)) dangDo = d;
		} catch {
			/* bo qua */
		}
	});
</script>

<svelte:head><title>Thực nghiệm · VSLink</title></svelte:head>

<div class="khung-trang trang-tn" data-testid="thuc-nghiem">
	{#if !nguoi}
		<section class="the vao">
			<p class="nhan-nho">Thực nghiệm VSLink</p>
			<h1>Nhập mã người tham gia</h1>
			<p class="phu">Mã in trên phiếu của bạn, ví dụ <b>F12</b>. Nếu bạn làm ở nhà, mã nằm trong Google Form, ví dụ <b>O07</b>.</p>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					batDau(maNhap);
				}}
			>
				<input bind:value={maNhap} placeholder="F12" autocomplete="off" aria-label="Mã người tham gia" data-testid="o-ma" />
				<button class="nut" type="submit" data-testid="bat-dau">Bắt đầu</button>
			</form>
			{#if loiMa}<p class="loi" data-testid="loi-ma">{loiMa}</p>{/if}
			{#if dangDo}
				<p class="dang-do">
					Máy này còn một lượt đang dở của mã <b>{dangDo.ma}</b>.
					<button class="nut vien nho" onclick={() => dangDo && batDau(dangDo.ma, dangDo.idx)}>Làm tiếp {dangDo.ma}</button>
				</p>
			{/if}
		</section>
	{:else if buoc}
		{#if buoc.loai !== 'xong'}
			<div class="tien-trinh" aria-label="Tiến trình">
				<span>Mã {nguoi.ma} · Phần {idx + 1}/{soBuocLam}</span>
				<button class="nut-chu" onclick={dungThamGia}>Dừng tham gia</button>
			</div>
		{/if}

		{#if buoc.loai === 'dong-y'}
			<section class="the" data-testid="dong-y">
				<h1>Phiếu đồng ý tham gia</h1>
				<ul>
					<li>Nhóm VSLink (PTNK) tìm hiểu cách học ký hiệu tiếng Việt qua web. Buổi này khoảng 20 phút.</li>
					<li>Camera chỉ chạy trên máy này: không quay, không lưu, không gửi hình đi đâu. Nhóm chỉ nhận điểm số.</li>
					<li>Nhóm không hỏi tên. Kết quả chỉ gắn với mã trên phiếu và chỉ dùng cho nghiên cứu.</li>
					<li>Bạn có thể dừng bất cứ lúc nào mà không cần giải thích.</li>
					<li>Đây không phải bài thi, không có đúng sai về khả năng của bạn.</li>
				</ul>
				<label class="dong-y"><input type="checkbox" bind:checked={dongY} data-testid="o-dong-y" /> Mình đã đọc và đồng ý tham gia.</label>
				<div class="nut-ds">
					<button class="nut" disabled={!dongY} onclick={() => hetBuoc()} data-testid="tiep">Tiếp tục</button>
					<button class="nut vien" onclick={() => { ghi('rut-lui'); rutLui = true; vaoBuoc(kichBan.length - 1); }}>Mình không tham gia</button>
				</div>
			</section>
		{:else if buoc.loai === 'huong-dan'}
			<section class="the" data-testid="huong-dan">
				<h1>Cách ký trước camera</h1>
				<ol>
					<li>Ngồi sao cho camera thấy bạn từ đầu tới bụng, cả hai khuỷu tay.</li>
					<li>Mỗi lần ký: <b>giơ tay lên, ký một từ, rồi hạ tay xuống hẳn</b>. Web tự biết lúc bắt đầu và kết thúc.</li>
					<li>Khi trình duyệt hỏi, hãy cho phép dùng camera.</li>
				</ol>
				{#if nguoi.phan === 'online'}
					<p>Bạn sẽ: xem 6 video và chọn nghĩa, học 3 từ trong 5 phút, tự ký lại 3 từ, rồi xem lại 6 video. Khoảng 10 phút.</p>
				{:else}
					<p>Bạn sẽ: xem 8 video và chọn nghĩa, học hai bộ từ (mỗi bộ 5 phút), trả lời vài câu ngắn, rồi làm bài cuối.</p>
				{/if}
				<button class="nut" onclick={() => hetBuoc()} data-testid="tiep">Mình sẵn sàng</button>
			</section>
		{:else if buoc.loai === 'nhan-dien'}
			{@const b = buoc}
			{#key b.ten}
				<BaiNhanDien
					cau={b.cau}
					{tepVideo}
					tieuDe={b.ten === 'truoc-hoc' ? 'Trước khi học' : 'Sau khi học'}
					onTraLoi={(c, chon, ms) =>
						ghi('tra-loi', { tu: c.tu.tu, tra_loi: chon.tu, dung: chon.i === c.tu.i, ms })}
					onXong={() => hetBuoc()}
				/>
			{/key}
		{:else if buoc.loai === 'hoc'}
			{@const b = buoc}
			{#key b.ten}
				<HocBo
					tu={b.tu}
					phanHoi={b.phanHoi}
					giay={giayThu ?? b.giay}
					{tepVideo}
					{giaLap}
					onKy={(k) => ghiKy(k, b)}
					onXong={(fps) => hetBuoc({ fps })}
				/>
			{/key}
		{:else if buoc.loai === 'cam-nhan'}
			{@const b = buoc}
			{#key b.ten}
				<CamNhan
					cauHoi={CAU_HINH.camNhan}
					onGui={(diem) => {
						diem.forEach((d, j) => ghi('cam-nhan', { bo: b.bo, phan_hoi: b.phanHoi, cau_hoi: j + 1, diem: d }));
						hetBuoc();
					}}
				/>
			{/key}
		{:else if buoc.loai === 'ky-lai'}
			{@const b = buoc}
			<KyLai
				tu={b.tu}
				{giaLap}
				onKy={(k) => ghiKy(k, b)}
				onBoQua={(t) => ghi('bo-qua', { tu: t.tu })}
				onXong={(fps) => hetBuoc({ fps })}
			/>
		{:else}
			<section class="the xong" data-testid="xong">
				{#if rutLui}
					<h1>Cảm ơn bạn</h1>
					<p>Bạn đã dừng tham gia. Dữ liệu của mã {nguoi.ma} sẽ không được dùng.</p>
				{:else}
					<h1>Xong rồi, cảm ơn bạn!</h1>
					{#if nguoi.phan === 'online'}
						{#if CAU_HINH.linkFormOnline}
							<p>Quay lại Google Form để trả lời 5 câu cuối nhé.</p>
							<a class="nut" href={CAU_HINH.linkFormOnline}>Mở lại Google Form</a>
						{:else}
							<p>Bạn quay lại tab Google Form để trả lời 5 câu cuối nhé.</p>
						{/if}
					{:else}
						<p>Nhờ bạn chưa kể các từ vừa học cho bạn khác đến hết ngày thực nghiệm, để kết quả công bằng.</p>
					{/if}
				{/if}
				{#if nguoi.phan === 'offline'}
					<button class="nut vien" onclick={nguoiTiepTheo} data-testid="nguoi-tiep-theo">Người tiếp theo</button>
				{/if}
			</section>
		{/if}
	{/if}

	<details class="nhom">
		<summary>Dành cho người hướng dẫn</summary>
		<p data-testid="trang-thai-gui">
			Đã lưu trên máy: {gui.daLuu} dòng · Chờ gửi: {gui.choGui} dòng
			{#if gui.loi}<br /><span class="loi">{gui.loi}</span>{/if}
		</p>
		<div class="nut-ds">
			<button class="nut vien nho" onclick={() => hangDoi?.gui()}>Gửi lại ngay</button>
			<button class="nut vien nho" onclick={taiVe}>Tải toàn bộ kết quả trên máy (CSV)</button>
			{#if nguoi}<button class="nut vien nho" onclick={nguoiTiepTheo}>Về màn hình nhập mã</button>{/if}
		</div>
		{#if nguoi?.nhom}<p class="phu">Nhóm {nguoi.nhom}</p>{/if}
	</details>
</div>

<style>
	.trang-tn {
		display: grid;
		gap: 16px;
		padding-top: 16px;
		padding-bottom: 32px;
	}
	.vao {
		max-width: 560px;
	}
	.phu {
		color: var(--chu-phu);
	}
	form {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	input:not([type]) {
		font: inherit;
		font-size: 1.3rem;
		font-weight: 850;
		padding: 8px 14px;
		width: 9em;
		border-radius: var(--bo-nho);
		border: 1.5px solid var(--vien);
		background: var(--the);
		color: var(--chu);
		text-transform: uppercase;
	}
	.loi {
		color: var(--do-chu);
		font-weight: 700;
	}
	.dang-do {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}
	.tien-trinh {
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: var(--chu-phu);
		font-weight: 750;
	}
	.nut-chu {
		font: inherit;
		background: none;
		border: none;
		color: var(--chu-phu);
		text-decoration: underline;
		cursor: pointer;
	}
	.nut-ds {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.dong-y {
		display: flex;
		gap: 8px;
		align-items: center;
		font-weight: 800;
		margin: 12px 0;
	}
	.xong {
		display: grid;
		gap: 10px;
		justify-items: start;
	}
	.nhom {
		color: var(--chu-phu);
		font-size: 0.9rem;
	}
	.nhom summary {
		cursor: pointer;
		font-weight: 750;
	}
</style>
