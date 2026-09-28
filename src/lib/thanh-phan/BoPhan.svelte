<!--
	Bang "bo phan nao / doan nao khac mau" — do bang phan tich che bot (occlusion
	sensitivity, Zeiler & Fergus, ECCV 2014), xem src/lib/loi/danh-gia.ts.
-->
<script lang="ts">
	import { GIAI_DOAN, PHAN, type DanhGiaPhan, type DuKien, type GiaiDoan, type Phan } from '$lib/loi/danh-gia';

	let { duKien }: { duKien: DuKien } = $props();

	const TEN: Record<Phan, string> = {
		tayTrai: 'Bàn tay trái',
		tayPhai: 'Bàn tay phải',
		canhTay: 'Vị trí & đường đi của tay'
	};
	const NHAN: Record<DanhGiaPhan, string> = {
		khop: 'Giống mẫu',
		on: 'Bình thường',
		'hoi-lech': 'Hơi khác mẫu',
		'lech-nhieu': 'Khác mẫu nhiều',
		'khong-thay': 'Ít thấy trong hình'
	};
	const TEN_GD: Record<GiaiDoan, string> = { dau: 'Đầu', giua: 'Giữa', cuoi: 'Cuối' };
</script>

<div class="bo-phan" data-testid="bo-phan">
	<ul>
		{#each PHAN as p (p)}
			<li data-muc={duKien.boPhan[p]}>
				<span>{TEN[p]}</span>
				<b><i></i>{NHAN[duKien.boPhan[p]]}</b>
			</li>
		{/each}
	</ul>
	<div class="giai-doan">
		<span>Đoạn khác mẫu nhiều nhất</span>
		<div class="ba-doan" role="img" aria-label={duKien.giaiDoanLechNhat ? `Đoạn ${TEN_GD[duKien.giaiDoanLechNhat].toLowerCase()} của động tác` : 'Không có đoạn nào nổi bật'}>
			{#each GIAI_DOAN as g (g)}
				<i class:lech={duKien.giaiDoanLechNhat === g}>{TEN_GD[g]}</i>
			{/each}
		</div>
		{#if !duKien.giaiDoanLechNhat}
			<small>{duKien.mucDo === 'dung' ? 'Không có — cả động tác đều ổn.' : 'Không có đoạn nào nổi bật hẳn.'}</small>
		{/if}
	</div>
</div>

<style>
	.bo-phan {
		display: grid;
		gap: 14px;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 6px;
	}
	li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 8px 12px;
		border-radius: var(--bo-nho);
		background: var(--nen-2);
		font-weight: 700;
	}
	li b {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-weight: 800;
		white-space: nowrap;
	}
	li i {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--chu-phu);
	}
	li[data-muc='khop'] b {
		color: var(--xanh-la-chu);
	}
	li[data-muc='khop'] i {
		background: var(--xanh-la);
	}
	li[data-muc='on'] b {
		color: var(--chu-phu);
	}
	li[data-muc='on'] i {
		background: var(--xanh);
	}
	li[data-muc='hoi-lech'] b {
		color: var(--vang-chu);
	}
	li[data-muc='hoi-lech'] i {
		background: var(--vang);
	}
	li[data-muc='lech-nhieu'] b {
		color: var(--do-chu);
	}
	li[data-muc='lech-nhieu'] i {
		background: var(--do);
	}
	li[data-muc='khong-thay'] b {
		color: var(--chu-phu);
		font-style: italic;
	}
	li[data-muc='khong-thay'] i {
		background: transparent;
		border: 2px dashed var(--chu-phu);
	}
	.giai-doan {
		display: grid;
		gap: 6px;
		font-weight: 700;
	}
	.giai-doan > span {
		color: var(--chu-phu);
		font-size: 0.9rem;
	}
	.ba-doan {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 4px;
	}
	.ba-doan i {
		font-style: normal;
		text-align: center;
		padding: 6px 0;
		background: var(--nen-2);
		color: var(--chu-phu);
		font-size: 0.85rem;
		font-weight: 800;
	}
	.ba-doan i:first-child {
		border-radius: 999px 0 0 999px;
	}
	.ba-doan i:last-child {
		border-radius: 0 999px 999px 0;
	}
	.ba-doan i.lech {
		background: var(--vang-nhat);
		color: var(--vang-chu);
		box-shadow: inset 0 0 0 2px var(--vang);
	}
	small {
		color: var(--chu-phu);
		font-weight: 650;
	}
</style>
