import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createEventHandler } from './server/live-events';
import { createAccountHandler } from './server/account-handler';
import { createMusicHandler } from './server/music';

export default defineConfig(({ mode }) => {
	const musicKey = loadEnv(mode, process.cwd(), 'TICKETMASTER_').TICKETMASTER_API_KEY;
	return { base: process.env.VITE_STATIC_SITE === 'true' ? '/elsewhere/' : '/', build: { rollupOptions: { output: { manualChunks: id => {
		if (!id.includes('node_modules')) return undefined;
		if (/[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
		if (id.includes('@dnd-kit')) return 'dnd';
		if (/better-auth|@better-fetch|nanostores|zod/.test(id)) return 'auth';
		return undefined;
	} } } }, plugins: [react(), {
	name: 'seattle-event-feed',
	configureServer(server) {
		const handler = createEventHandler();
		const music = createMusicHandler(() => process.env.TICKETMASTER_API_KEY || musicKey);
		server.middlewares.use((request, response, next) => { void music(request, response).then(handled => { if (!handled) next(); }).catch(next); });
		const accounts = createAccountHandler(() => { const address = server.httpServer?.address(); return process.env.BETTER_AUTH_URL || `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 5173}`; });
		server.middlewares.use((request, response, next) => { void accounts(request, response).then(handled => { if (!handled) next(); }).catch(next); });
		server.middlewares.use((request, response, next) => { void handler(request, response).then(handled => { if (!handled) next(); }).catch(next); });
	},
	configurePreviewServer(server) {
		const handler = createEventHandler();
		const music = createMusicHandler(() => process.env.TICKETMASTER_API_KEY || musicKey);
		server.middlewares.use((request, response, next) => { void music(request, response).then(handled => { if (!handled) next(); }).catch(next); });
		const accounts = createAccountHandler(() => { const address = server.httpServer.address(); return process.env.BETTER_AUTH_URL || `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 4173}`; });
		server.middlewares.use((request, response, next) => { void accounts(request, response).then(handled => { if (!handled) next(); }).catch(next); });
		server.middlewares.use((request, response, next) => { void handler(request, response).then(handled => { if (!handled) next(); }).catch(next); });
	},
}] };
});