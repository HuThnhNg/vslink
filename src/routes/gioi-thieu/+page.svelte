<!--
	Ve du an: nhom thuc hien, cach VSLink hoat dong, do chinh xac, du lieu gui di dau, nguon tham khao.
	Noi dung ky thuat dat o day (khong o trang chu, khong o luc tra ket qua).
-->
<script lang="ts">
	import { base } from '$app/paths';
	import Meo from '$lib/meo/Meo.svelte';
	import Users from '@lucide/svelte/icons/users';
	import Workflow from '@lucide/svelte/icons/workflow';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import ChartBar from '@lucide/svelte/icons/chart-bar';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import MessageCircleHeart from '@lucide/svelte/icons/message-circle-heart';
	import Camera from '@lucide/svelte/icons/camera';
	import ScanSearch from '@lucide/svelte/icons/scan-search';
	import ListOrdered from '@lucide/svelte/icons/list-ordered';
	import MessagesSquare from '@lucide/svelte/icons/messages-square';

	const TRUONG = 'Trường Phổ thông Năng khiếu, ĐHQG-HCM';
	const NHOM = [
		{ ten: 'Nguyễn Hữu Thịnh', lop: 'Lớp Toán, khoá 2025–2028' },
		{ ten: 'Phạm Phương Thảo', lop: 'Lớp Toán, khoá 2025–2028' }
	];
	const HO_TRO = [
		{ ten: 'Bùi Minh Triết', lop: 'Lớp Toán LN1, khoá 2024–2027' },
		{ ten: 'Lý Diệp Hoàng An', lop: 'Lớp Toán LN1, khoá 2024–2027' }
	];
	// hai chu cai cuoi (vd Nguyễn Hữu Thịnh -> HT) de hai ban cung ten chu T van khac nhau
	const viTat = (ten: string) => ten.split(' ').slice(-2).map((w) => w[0]).join('');

	const BUOC = [
		{ icon: Camera, ten: 'Camera', mo_ta: 'Hình ảnh ở lại trên máy bạn.' },
		{ icon: ScanSearch, ten: 'Nhận dáng người', mo_ta: 'MediaPipe tìm 75 điểm trên thân và hai bàn tay.' },
		{ icon: ListOrdered, ten: 'Nhận dạng từ', mo_ta: 'Mô hình SPOTER chọn 5 từ giống nhất trong 400 từ.' },
		{ icon: MessagesSquare, ten: 'Ghép câu', mo_ta: 'Sắp xếp các từ thành câu tiếng Việt.' }
	];
</script>

<svelte:head><title>Về dự án · VSLink</title></svelte:head>

<div class="khung-trang trang">
	<header class="dau">
		<div>
			<p class="nhan-nho">Về dự án</p>
			<h1>VSLink là gì?</h1>
			<p class="mo-ta">
				VSLink giúp mọi người dịch và học Ngôn ngữ Ký hiệu Việt Nam ngay trên trình duyệt, chỉ cần một chiếc camera. Dự án
				do học sinh Trường Phổ thông Năng khiếu, Đại học Quốc gia TP.HCM thực hiện, với mong muốn rút ngắn khoảng cách
				giao tiếp giữa người Điếc và người nghe.
			</p>
		</div>
		<Meo tamTrang="vui" kichThuoc={130} />
	</header>

	<section class="the" aria-labelledby="nhom">
		<h2 id="nhom"><Users size={22} /> Nhóm thực hiện</h2>
		<ul class="ds-nguoi">
			{#each NHOM as n (n.ten)}
				<li>
					<span class="anh" aria-hidden="true">{viTat(n.ten)}</span>
					<span class="thong-tin"><b>{n.ten}</b><small>{n.lop}</small><small>{TRUONG}</small></span>
				</li>
			{/each}
		</ul>
		<h3>Cảm ơn</h3>
		<p class="phu-de">
			Chân thành gửi lời cảm ơn đến hai bạn đã tham gia hỗ trợ chúng tôi trong quá trình nghiên cứu:
		</p>
		<ul class="ds-nguoi nho">
			{#each HO_TRO as n (n.ten)}
				<li>
					<span class="anh" aria-hidden="true">{viTat(n.ten)}</span>
					<span class="thong-tin"><b>{n.ten}</b><small>{n.lop}</small><small>{TRUONG}</small></span>
				</li>
			{/each}
		</ul>
	</section>

	<section class="the" aria-labelledby="so-lieu">
		<h2 id="so-lieu"><ChartBar size={22} /> Độ chính xác</h2>
		<div class="so-lieu">
			<div><b>400</b><span>từ thông dụng thuộc 19 chủ đề</span></div>
			<div><b>89,5%</b><span>số lần đoán đúng ngay ở gợi ý đầu tiên</span></div>
			<div><b>97,8%</b><span>số lần từ đúng nằm trong 5 gợi ý</span></div>
		</div>
		<p class="phu-de">
			Các số liệu trên được đo trên 9.751 video kiểm tra thuộc bộ dữ liệu VSL400, do 10 người ký mà mô hình chưa từng gặp
			trong quá trình huấn luyện. Khi sử dụng ở nhà, ánh sáng và góc máy thường khác với phòng quay mẫu nên độ chính xác có
			thể thấp hơn; vì vậy, Mèo luôn đưa ra 5 khả năng thay vì chỉ một.
		</p>
		<p class="phu-de">
			Ghép câu hiện là tính năng thử nghiệm. Trên bộ 101 câu kiểm tra, phương pháp kết hợp Gemini với các quy tắc ngữ pháp của
			Ngôn ngữ Ký hiệu Việt Nam đạt 83,8 điểm chrF++ (thang 100), cao hơn phương pháp chỉ dùng quy tắc (78,3 điểm).
		</p>
	</section>

	<section class="the" aria-labelledby="cach">
		<h2 id="cach"><Workflow size={22} /> VSLink hoạt động thế nào?</h2>
		<ol class="buoc">
			{#each BUOC as b, i (b.ten)}
				<li>
					<span class="so">{i + 1}</span>
					<b.icon size={22} />
					<b>{b.ten}</b>
					<span>{b.mo_ta}</span>
				</li>
			{/each}
		</ol>
		<p>
			Máy cắt đoạn tự nhận ra lúc bạn giơ tay lên và hạ tay xuống, nên không cần bấm nút. Mỗi đoạn ký được chuẩn hoá về 60
			khung hình rồi đưa vào mô hình <b>SPOTER</b> (Boháček và Hrúz, 2022), huấn luyện trên bộ dữ liệu <b>VSL400</b>.
		</p>
		<p>
			Ở chế độ Ghép câu, mỗi từ giữ 3 phương án kèm độ chắc chắn. Mô hình ngôn ngữ lớn <b>Gemini</b> chọn phương án hợp
			nghĩa nhất và sắp xếp lại theo ngữ pháp tiếng Việt, dựa trên các quy tắc của Ngôn ngữ Ký hiệu Việt Nam (chủ ngữ –
			tân ngữ – động từ, từ phủ định đứng sau động từ…).
		</p>
	</section>

	<section class="the" aria-labelledby="minh-bach">
		<h2 id="minh-bach"><ShieldCheck size={22} /> Minh bạch và riêng tư</h2>
		<ul class="gach">
			<li>
				<b>Hình ảnh camera:</b> toàn bộ quá trình nhận dạng diễn ra ngay trong trình duyệt, vì vậy hình ảnh và video của bạn
				không bao giờ rời khỏi thiết bị.
			</li>
			<li>
				<b>Kết quả nhận dạng:</b> việc đánh giá một lần ký là đúng hay chưa đúng hoàn toàn do mô hình nhận dạng quyết định;
				Gemini chỉ diễn đạt lại lời nhận xét của Mèo cho dễ hiểu và ghép các từ đã nhận dạng thành câu.
			</li>
			<li>
				<b>Dữ liệu gửi đi:</b> khi Mèo nhận xét hoặc ghép câu, web chỉ gửi tên các từ cùng độ chắc chắn tới máy chủ của nhóm
				để hỏi Gemini, tuyệt đối không gửi hình ảnh hay toạ độ cơ thể.
			</li>
			<li>
				<b>Góp ý:</b> mỗi góp ý chỉ gồm nội dung bạn tự viết và kết quả Mèo vừa đưa ra (nếu bạn giữ phần đính kèm); thông tin
				liên hệ là không bắt buộc.
			</li>
			<li>
				<b>Tiến độ học:</b> dữ liệu được lưu trên chính trình duyệt của bạn nên không cần tạo tài khoản; tuy nhiên, nếu bạn
				đổi thiết bị hoặc xoá dữ liệu trình duyệt thì tiến độ cũng sẽ mất.
			</li>
		</ul>
	</section>


	<section class="the" aria-labelledby="gioi-han">
		<h2 id="gioi-han"><TriangleAlert size={22} /> Giới hạn hiện tại</h2>
		<ul class="gach">
			<li>
				<b>Vốn từ:</b> VSLink hiện mới nhận dạng được 400 từ đơn; bộ từ vựng chưa có các đại từ như “tôi”, “bạn” và các từ để
				hỏi.
			</li>
			<li>
				<b>Cách ký khi ghép câu:</b> bạn cần hạ tay xuống giữa các từ, vì VSLink chưa dịch được những câu được ký liền mạch.
			</li>
			<li>
				<b>Nét mặt:</b> trong ngôn ngữ ký hiệu, nét mặt mang nhiều ý nghĩa ngữ pháp (chẳng hạn câu hỏi hay câu phủ định), nhưng
				VSLink hiện chưa nhận biết được nét mặt.
			</li>
			<li>
				<b>Hiệu năng:</b> trên máy có cấu hình yếu, web có thể chạy chậm; khi đó, bạn nên chọn chế độ “Video” ở trang Dịch để
				tải video lên thay vì dùng camera trực tiếp.
			</li>
		</ul>
	</section>

	<section class="the" aria-labelledby="nguon">
		<h2 id="nguon"><BookOpen size={22} /> Nguồn và tài liệu tham khảo</h2>
		<ul class="gach nho-chu">
			<li>Bộ dữ liệu VSL400 (400 từ Ngôn ngữ Ký hiệu Việt Nam).</li>
			<li>
				Video mẫu: <a href="https://qipedc.moet.gov.vn" target="_blank" rel="noopener">Từ điển Ngôn ngữ ký hiệu</a>, dự án
				QIPEDC, Bộ Giáo dục và Đào tạo.
			</li>
			<li>
				M. Boháček, M. Hrúz. Sign Pose-based Transformer for Word-level Sign Language Recognition (SPOTER). WACV Workshops,
				2022.
			</li>
			<li>I. Grishchenko, V. Bazarevsky. MediaPipe Holistic. Google AI Blog, 2020.</li>
			<li>
				Nguyễn Thị Bích Điệp. Nghiên cứu và phát triển phương pháp tiếp cận dựa trên cấu trúc và thống kê trong dịch tự
				động ngôn ngữ ký hiệu Việt Nam. Luận án Tiến sĩ, Học viện Khoa học và Công nghệ, 2023.
			</li>
			<li>
				O. M. Sincan, R. Bowden. Using an LLM to Turn Sign Spottings into Spoken Language Sentences. SLTAT @ ACM IVA,
				2025.
			</li>
			<li>
				Mã nguồn mở tại <a href="https://github.com/HuThnhNg/vslink" target="_blank" rel="noopener">GitHub</a> (giấy phép
				GPL-3.0).
			</li>
		</ul>
	</section>

	<a class="the gop-y" href="{base}/gop-y/">
		<MessageCircleHeart size={28} />
		<span>
			<b>Góp ý cho nhóm</b>
			<small>Mèo đoán sai, gặp lỗi hay có ý tưởng mới? Mỗi góp ý đều giúp VSLink tốt hơn.</small>
		</span>
	</a>
</div>

<style>
	.trang {
		display: grid;
		gap: 20px;
		max-width: 900px;
	}
	.dau {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
	}
	.mo-ta {
		font-size: 1.08rem;
		color: var(--chu-phu);
		max-width: 60ch;
	}
	@media (max-width: 640px) {
		.dau :global(svg) {
			display: none;
		}
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
	h3 {
		margin: 18px 0 4px;
		font-size: 1.05rem;
	}
	.the p {
		color: var(--chu-phu);
	}
	.the p b {
		color: var(--chu);
	}
	.ds-nguoi {
		list-style: none;
		margin: 0 0 6px;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}
	.ds-nguoi li {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 16px;
		border-radius: var(--bo-vua);
		background: var(--xanh-nhat);
	}
	@media (max-width: 640px) {
		.ds-nguoi {
			grid-template-columns: 1fr;
		}
	}
	.thong-tin {
		display: grid;
		gap: 2px;
		min-width: 0;
	}
	.thong-tin b {
		font-size: 1.05rem;
	}
	.ds-nguoi small {
		color: var(--chu-phu);
		font-weight: 650;
		font-size: 0.9rem;
		line-height: 1.35;
	}
	.anh {
		display: grid;
		place-items: center;
		flex: none;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--nut);
		color: #fff;
		font-weight: 900;
		font-size: 1.2rem;
	}
	.ds-nguoi.nho li {
		background: transparent;
		border: 1px solid var(--vien);
	}
	.ds-nguoi.nho .anh {
		width: 48px;
		height: 48px;
		font-size: 1.05rem;
		background: var(--xanh-nhat-2);
		color: var(--xanh-dam);
	}
	.buoc {
		list-style: none;
		margin: 0 0 14px;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 12px;
	}
	@media (max-width: 760px) {
		.buoc {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	.buoc li {
		position: relative;
		display: grid;
		gap: 4px;
		align-content: start;
		padding: 14px;
		border-radius: var(--bo-vua);
		border: 1px solid var(--vien);
		color: var(--xanh);
	}
	.buoc li b {
		color: var(--chu);
	}
	.buoc li span:last-child {
		color: var(--chu-phu);
		font-size: 0.92rem;
	}
	.buoc .so {
		position: absolute;
		top: 10px;
		right: 12px;
		font-weight: 900;
		font-size: 1.4rem;
		color: var(--xanh-nhat-2);
	}
	.gach {
		margin: 0;
		padding-left: 1.2em;
		display: grid;
		gap: 10px;
		color: var(--chu-phu);
	}
	.gach b {
		color: var(--chu);
	}
	.nho-chu {
		font-size: 0.92rem;
	}
	.so-lieu {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
		margin-bottom: 12px;
	}
	.so-lieu div {
		display: grid;
		gap: 2px;
		padding: 14px;
		border-radius: var(--bo-vua);
		background: var(--xanh-nhat);
	}
	.so-lieu b {
		font-size: clamp(1.5rem, 3vw, 2rem);
		font-weight: 900;
		color: var(--xanh);
		line-height: 1.1;
	}
	.so-lieu span {
		font-size: 0.9rem;
		color: var(--chu-phu);
		font-weight: 650;
	}
	@media (max-width: 520px) {
		.so-lieu {
			grid-template-columns: 1fr;
		}
	}
	.gop-y {
		display: flex;
		align-items: center;
		gap: 16px;
		color: var(--chu);
		text-decoration: none;
	}
	.gop-y:hover {
		border-color: var(--xanh);
	}
	.gop-y :global(svg) {
		color: var(--hong);
		flex: none;
	}
	.gop-y span {
		display: grid;
	}
	.gop-y small {
		color: var(--chu-phu);
		font-size: 0.95rem;
	}
</style>
