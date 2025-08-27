import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.github\.com\/.*$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "github-api",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
      },
      manifest: {
        name: "Frysen - Smart Inventory Management",
        short_name: "Frysen",
        description: "Smart inventory and shopping list management app",
        display: "standalone",
        start_url: "/",
        background_color: "#1565c0",
        theme_color: "#1565c0",
        orientation: "portrait-primary",
        scope: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icon-512.png", 
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ],
        categories: ["productivity", "utilities"],
        lang: "sv",
        dir: "ltr"
      },
      devOptions: {
        enabled: true,
        type: "module"
      }
    })
  ],
});
