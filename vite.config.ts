import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Frysen",
        short_name: "Frysen",
        display: "standalone",
        start_url: "/",
        background_color: "#0f1115",
        theme_color: "#3a86ff",
        icons: []
      }
    })
  ],
});
