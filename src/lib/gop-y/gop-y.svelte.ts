// Ngu canh gop y (vd tu Meo vua doan sai) duoc giu trong bo nho khi chuyen trang, khong dua len URL.
import { goto } from '$app/navigation';
import { base } from '$app/paths';
import type { NguCanh } from './du-lieu';

export * from './du-lieu';

export const gopY = $state<{ nguCanh: NguCanh | null }>({ nguCanh: null });

/** Mo trang gop y, mang theo ngu canh cua man hinh hien tai. */
export function moGopY(nc: NguCanh) {
	gopY.nguCanh = nc;
	return goto(`${base}/gop-y/`);
}

