import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import mkcert from "vite-plugin-mkcert";

export default defineConfig({
  plugins: [tailwindcss(), react(), mkcert()],
  base: "/", // ensure base path is correct
  server: {
    https: {
      key: "./.vite-plugin-mkcert/key.pem",
      cert: "./.vite-plugin-mkcert/cert.pem",
    },
    host: true,
    port: 5173,
  },
});
