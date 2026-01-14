import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate", // Tự động cập nhật app khi có bản mới
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "My Email App",
        short_name: "EmailApp",
        description: "Email Application with Offline Support",
        theme_color: "#ffffff",
        display: "standalone", // Quan trọng: Để app chạy full màn hình như app native
        start_url: "/", // Thêm start_url
        scope: "/",
        icons: [
          {
            src: "/pwa-192x192.png", // Tên file icon (bạn cần tạo ở bước 3)
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,

        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          // Thêm runtime caching
          {
            urlPattern: /^https:\/\/api\./, // Cache API calls
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300, // 5 phút
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: "module",
        navigateFallback: "index.html",
      },
    }),
  ],

  preview: {
    port: 5173, // Cố định port preview
    proxy: {
      "/api": {
        target: "http://localhost:3000", // Đổi port này thành port Backend của bạn (VD: 3000, 4000)
        changeOrigin: true,
        secure: false,
      },
      "/auth": {
        target: "http://localhost:3000", // Proxy cho cả auth nếu cần
        changeOrigin: true,
        secure: false,
      },
      // Nếu backend của bạn dùng prefix khác (VD: /mail), hãy thêm vào đây
      "/mail": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
