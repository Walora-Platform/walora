import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import Components from "unplugin-vue-components/vite";
import path from "node:path";

// DEVELOPMENT SERVER CONFIG - runs in development, in production there is no vite server
// https://vite.dev/config/
export default defineConfig({
	envDir: path.resolve(__dirname, "../.."), // for VITE_PRIMEUI_LICENSE_KEY thats in .env
	plugins: [
		vue(),
		tailwindcss(),
		Components({
			dirs: ["src/components"],
			dts: true,
		}),
	],
	resolve: {
		alias: {
			/* 'shared-ui': path.resolve(__dirname, '../../shared/ui') */
			"@": "/src",
		},
	},
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:8081", // exposed backend's port from g4pl-backend container
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ""),
				/* rewrites it, because in development, there is no nginx server that will route /api/* to backend,
        vite dev. server communicates straight with the backend container - for that we need to remove "/api/" from the route (backend has routes eg. /login, not /api/login),
        but we use the "/api/" in production where nginx is routing that queries to backend container */
			},
		},
	},
});
