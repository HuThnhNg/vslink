<!--
	Gop y va ho tro: nguoi dung gui gop y cho nhom (qua Worker -> Google Sheet), xem cach xu ly
	su co thuong gap, va tu kiem tra camera. Ngu canh (tu Meo vua doan, cau vua ghep) do trang
	Dich mang sang qua moGopY(), khong nam tren URL.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import BongMeo from '$lib/meo/BongMeo.svelte';
	import { napCauHinh } from '$lib/meo/hoi-meo';
	import { napHolistic } from '$lib/loi/nhan-dang';
	import { gopY, guiGopY, THE_LOAI, type TheLoai } from '$lib/gop-y/gop-y.svelte';
	import Send from '@lucide/svelte/icons/send';
	import Camera from '@lucide/svelte/icons/camera';
	import LifeBuoy from '@lucide/svelte/icons/life-buoy';
	import MessageCircleHeart from '@lucide/svelte/icons/message-circle-heart';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import X from '@lucide/svelte/icons/x';

	const nguCanh = $state(gopY.nguCanh);
	gopY.nguCanh = null; // dung mot lan

	let theLoai = $state<TheLoai>(nguCanh?.theLoai ?? 'de-xuat');
	let noiDung = $state('');
	let dungRa = $state('');
	let lienHe = $state('');
	let nguoiDiec = $state(false);
	let web = $state(''); // o bay chong spam, an voi nguoi dung
	let giuNguCanh = $state(true);
	let dangGui = $state(false);
	let ketQua = $state<'ok' | 'chua-cai-dat' | 'qua-nhieu' | 'loi' | null>(null);
	let api = $state<string | undefined>(undefined);

	const canDungRa = $derived(theLoai === 'doan-sai' || theLoai === 'cau-sai');
	const hopLe = $derived(noiDung.trim().length >= 3);

	async function gui(e: SubmitEvent) {
		e.preventDefault();
		if (!hopLe || dangGui) return;
		dangGui = true;
		const kq = await guiGopY(
			{ theLoai, noiDung, dungRa: canDungRa ? dungRa : '', lienHe, nguoiDiec, web },
			giuNguCanh ? nguCanh : null,
			{ api, trinhDuyet: navigator.userAgent }
		);
		ketQua = kq.ok ? 'ok' : kq.lyDo;
		dangGui = false;
	}

	function guiTiep() {
		ketQua = null;
		noiDung = '';
		dungRa = '';
	}

	// ---- tu kiem tra camera (phan danh cho nguoi dung cua trang kiem tra he thong cu) ----
	let camera = $state<{ dang: boolean; ok: boolean | null; chu: string }>({ dang: false, ok: null, chu: '' });
	async function kiemCamera() {
		camera = { dang: true, ok: null, chu: 'Mèo đang mở camera…' };
		let stream: MediaStream | null = null;
		try {
			stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
			const s = stream.getVideoTracks()[0].getSettings();
			camera.chu = 'Camera đã bật. Mèo đang tải bộ nhận dáng người (lần đầu hơi lâu)…';
			await napHolistic();
			camera = {
				dang: false,
				ok: true,
				chu: `Mọi thứ đều ổn: camera ${s.width}×${s.height}${s.frameRate ? `, ${Math.round(s.frameRate)} hình/giây` : ''}. Bạn có thể dùng VSLink rồi!`
			};
		} catch (e) {
			const ten = (e as Error)?.name;
			camera = {
				dang: false,
				ok: false,
				chu:
					ten === 'NotAllowedError'
						? 'Trình duyệt đang chặn camera. Bấm vào biểu tượng ổ khoá cạnh địa chỉ web, cho phép Camera rồi thử lại.'
						: ten === 'NotFoundError'
							? 'Mèo không tìm thấy camera nào trên máy. Kiểm tra camera đã cắm hoặc đã bật chưa.'
							: ten === 'NotReadableError'
								? 'Camera đang được ứng dụng khác dùng (Zoom, Meet…). Tắt ứng dụng đó rồi thử lại.'
								: 'Camera chạy được nhưng Mèo chưa tải được bộ nhận dáng người. Kiểm tra mạng rồi thử lại.'
			};
		} finally {
			stream?.getTracks().forEach((t) => t.stop());
		}
	}

	onMount(async () => {
		api = (await napCauHinh()).meo_api || undefined;
	});
</script>

<svelte:head><title>Góp ý và hỗ trợ · VSLink</title></svelte:head>

<div class="khung-trang trang">
	<header>
		<p class="nhan-nho">Góp ý và hỗ trợ</p>
		<h1>Nhóm VSLink luôn muốn nghe bạn</h1>
		<p class="mo-ta">
			Mèo đoán sai, web gặp lỗi hay bạn có ý tưởng mới? Gửi cho nhóm ở đây. Nếu muốn nhóm trả lời, hãy để lại email hoặc
			Zalo.
		</p>
	</header>

	<section class="the" aria-labelledby="gui">
		<h2 id="gui"><MessageCircleHeart size={22} /> Gửi góp ý</h2>

		{#if ketQua === 'ok'}
			<BongMeo tamTrang="vui" cau="Gâu! Nhóm đã nhận được góp ý của bạn. Cảm ơn bạn nhiều nha!" />
			<div class="nut-ds">
				<button class="nut phu" onclick={guiTiep}>Gửi thêm góp ý</button>
				<a class="nut vien" href="{base}/">Về trang chủ</a>
			</div>
		{:else}
			<form onsubmit={gui} data-testid="form-gop-y">
				<fieldset>
					<legend>Bạn muốn góp ý về điều gì?</legend>
					<div class="chip-ds">
						{#each THE_LOAI as l (l.ma)}
							<label class="chip" class:chon={theLoai === l.ma}>
								<input type="radio" name="the-loai" value={l.ma} bind:group={theLoai} class="an-di" />
								{l.ten}
							</label>
						{/each}
					</div>
				</fieldset>

				{#if nguCanh && giuNguCanh && ((nguCanh.tuDoan?.length ?? 0) > 0 || nguCanh.cau)}
					<div class="ngu-canh" data-testid="ngu-canh">
						<div>
							<b>Đính kèm kết quả vừa rồi</b>
							{#if nguCanh.tuDoan?.length}<span>Mèo đoán: {nguCanh.tuDoan.join(', ')}</span>{/if}
							{#if nguCanh.cau}<span>Câu Mèo ghép: “{nguCanh.cau}”</span>{/if}
						</div>
						<button type="button" class="nut-chu" onclick={() => (giuNguCanh = false)} aria-label="Bỏ phần đính kèm">
							<X size={16} />
						</button>
					</div>
				{/if}

				<label class="o-nhap">
					<span>Nội dung <em>(bắt buộc)</em></span>
					<textarea
						bind:value={noiDung}
						rows="5"
						maxlength="2000"
						required
						placeholder={theLoai === 'doan-sai'
							? 'Ví dụ: Mình ký “Mẹ” nhưng Mèo đoán là “Bố”.'
							: theLoai === 'loi-web'
								? 'Bạn đang làm gì thì gặp lỗi? Lỗi hiện ra như thế nào?'
								: 'Bạn muốn nói gì với nhóm?'}
						data-testid="noi-dung"
					></textarea>
				</label>

				{#if canDungRa}
					<label class="o-nhap">
						<span>{theLoai === 'cau-sai' ? 'Câu đúng ra phải là' : 'Từ đúng ra phải là'} <em>(không bắt buộc)</em></span>
						<input type="text" bind:value={dungRa} maxlength="200" />
					</label>
				{/if}

				<label class="o-nhap">
					<span>Email hoặc Zalo để nhóm trả lời <em>(không bắt buộc)</em></span>
					<input type="text" bind:value={lienHe} maxlength="200" autocomplete="email" />
				</label>

				<label class="cong-tac">
					<input type="checkbox" bind:checked={nguoiDiec} />
					<span>Tôi là người Điếc hoặc khiếm thính <small>(không bắt buộc, giúp nhóm hiểu người dùng hơn)</small></span>
				</label>

				<label class="bay" aria-hidden="true">Đừng điền ô này <input type="text" tabindex="-1" bind:value={web} autocomplete="off" /></label>

				{#if ketQua === 'chua-cai-dat'}
					<p class="canh-bao" role="alert">
						Kênh góp ý đang được nhóm cài đặt, chưa gửi được lúc này. Bạn quay lại sau giúp Mèo nhé.
					</p>
				{:else if ketQua === 'qua-nhieu'}
					<p class="canh-bao" role="alert">Bạn vừa gửi khá nhiều góp ý. Đợi vài phút rồi gửi tiếp nhé.</p>
				{:else if ketQua === 'loi'}
					<p class="canh-bao" role="alert">Chưa gửi được, có thể do mạng. Nội dung vẫn còn đây, bạn bấm gửi lại nhé.</p>
				{/if}

				<p class="nho">Góp ý chỉ gồm những gì bạn viết ở trên và kết quả đính kèm. VSLink không gửi hình ảnh camera.</p>
				<button class="nut" type="submit" disabled={!hopLe || dangGui} data-testid="gui-gop-y">
					<Send size={18} />
					{dangGui ? 'Đang gửi…' : 'Gửi góp ý'}
				</button>
			</form>
		{/if}
	</section>

	<section class="the" aria-labelledby="ho-tro">
		<h2 id="ho-tro"><LifeBuoy size={22} /> Gặp sự cố?</h2>
		<details>
			<summary>Camera không bật được</summary>
			<p>
				Trình duyệt cần bạn cho phép dùng camera. Bấm vào biểu tượng ổ khoá cạnh địa chỉ web, chọn cho phép Camera rồi tải
				lại trang. Nếu camera đang mở trong ứng dụng khác (Zoom, Meet…), hãy tắt ứng dụng đó trước.
			</p>
		</details>
		<details>
			<summary>Mèo hay đoán sai</summary>
			<p>
				Ngồi đủ sáng, ánh sáng từ phía trước mặt. Lùi ra để camera thấy bạn từ đầu đến bụng. Giơ tay lên ký rồi hạ hẳn tay
				xuống sau mỗi từ. Bạn cũng có thể xem video mẫu ở mục Học để ký giống cách Mèo đã học.
			</p>
		</details>
		<details>
			<summary>Web chạy chậm hoặc giật</summary>
			<p>
				Một số máy yếu xử lý camera chậm. Hãy đóng bớt các thẻ khác, hoặc dùng “Tải video lên” ở trang Dịch: Mèo xem từng
				hình trong video nên không phụ thuộc tốc độ máy.
			</p>
		</details>
		<details>
			<summary>Video quay bằng điện thoại không mở được</summary>
			<p>Một số điện thoại quay video định dạng HEVC. Hãy quay lại ở chế độ H.264 hoặc gửi video dạng .mp4, .webm.</p>
		</details>

		<div class="kiem-camera">
			<div>
				<b>Tự kiểm tra camera</b>
				<span class="nho">Mèo thử mở camera và tải bộ nhận dáng người trên máy bạn.</span>
			</div>
			<button class="nut phu" onclick={kiemCamera} disabled={camera.dang} data-testid="kiem-camera">
				<Camera size={18} />
				{camera.dang ? 'Đang kiểm tra…' : 'Kiểm tra camera'}
			</button>
			{#if camera.chu}
				<p class="kq-camera" class:ok={camera.ok === true} class:loi={camera.ok === false} role="status">
					{#if camera.ok === true}<CircleCheck size={20} />{:else if camera.ok === false}<CircleX size={20} />{/if}
					{camera.chu}
				</p>
			{/if}
		</div>
	</section>
</div>

<style>
	.trang {
		display: grid;
		gap: 20px;
		max-width: 820px;
	}
	.mo-ta {
		font-size: 1.08rem;
		color: var(--chu-phu);
		max-width: 62ch;
	}
	h2 {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 1.3rem;
		margin-top: 0;
	}
	h2 :global(svg) {
		color: var(--xanh);
		flex: none;
	}
	form {
		display: grid;
		gap: 16px;
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
	}
	legend {
		font-weight: 800;
		margin-bottom: 8px;
	}
	.chip-ds {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.chip-ds .chip {
		cursor: pointer;
	}
	.chip.chon {
		background: var(--nut);
		border-color: var(--nut);
		color: #fff;
	}
	.chip:focus-within {
		outline: 3px solid var(--xanh);
		outline-offset: 2px;
	}
	.o-nhap {
		display: grid;
		gap: 6px;
		font-weight: 800;
	}
	.o-nhap em {
		font-style: normal;
		font-weight: 650;
		color: var(--chu-phu);
	}
	textarea,
	input[type='text'] {
		width: 100%;
		padding: 12px 14px;
		border-radius: var(--bo-nho);
		border: 1.5px solid var(--vien);
		background: var(--nen);
		color: var(--chu);
		font: inherit;
		font-weight: 600;
	}
	textarea:focus,
	input[type='text']:focus {
		outline: 3px solid color-mix(in srgb, var(--xanh) 45%, transparent);
		border-color: var(--xanh);
	}
	textarea {
		resize: vertical;
		min-height: 120px;
	}
	.ngu-canh {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 14px;
		border-radius: var(--bo-nho);
		background: var(--xanh-nhat);
	}
	.ngu-canh div {
		display: grid;
		gap: 2px;
	}
	.ngu-canh span {
		color: var(--chu-phu);
		font-weight: 650;
	}
	.nut-chu {
		display: inline-grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: var(--chu-phu);
		cursor: pointer;
	}
	.cong-tac {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		cursor: pointer;
		font-weight: 700;
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
		font-weight: 600;
	}
	.bay {
		position: absolute;
		left: -9999px;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}
	.canh-bao {
		margin: 0;
		padding: 10px 14px;
		border-radius: var(--bo-nho);
		background: var(--vang-nhat);
		font-weight: 650;
	}
	.nho {
		margin: 0;
		color: var(--chu-phu);
		font-size: 0.9rem;
	}
	form .nut {
		justify-self: start;
	}
	.nut-ds {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 14px;
	}
	details {
		border-top: 1px solid var(--vien);
		padding: 12px 0;
	}
	details:last-of-type {
		border-bottom: 1px solid var(--vien);
	}
	summary {
		cursor: pointer;
		font-weight: 800;
	}
	details p {
		margin: 8px 0 0;
		color: var(--chu-phu);
	}
	.kiem-camera {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 10px 16px;
		align-items: center;
		margin-top: 18px;
		padding: 14px;
		border-radius: var(--bo-vua);
		background: var(--xanh-nhat);
	}
	.kiem-camera > div {
		display: grid;
	}
	.kq-camera {
		grid-column: 1 / -1;
		display: flex;
		align-items: flex-start;
		gap: 8px;
		margin: 0;
		font-weight: 700;
	}
	.kq-camera :global(svg) {
		flex: none;
		margin-top: 2px;
	}
	.kq-camera.ok {
		color: var(--xanh-la-chu);
	}
	.kq-camera.loi {
		color: var(--do-chu);
	}
	@media (max-width: 560px) {
		.kiem-camera {
			grid-template-columns: 1fr;
		}
		.kiem-camera .nut {
			justify-self: start;
		}
	}
</style>
