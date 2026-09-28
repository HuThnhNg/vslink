import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// GitHub Pages phục vụ web ở /<ten-repo>. Workflow deploy tự đặt BASE_PATH.
// Chạy trên máy (npm run dev) thì để trống.
const base = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ pages: 'build', assets: 'build', fallback: '404.html', strict: true }),
		paths: { base }
	}
};

export default config;
