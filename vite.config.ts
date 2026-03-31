import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    proxy: SUPABASE_URL
      ? {
          "/supabase-functions": {
            target: `${SUPABASE_URL}/functions/v1`,
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/supabase-functions/, ""),
            secure: false,
          },
        }
      : {},
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve("./src"),
    },
  },
});
