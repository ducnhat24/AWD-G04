// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { createIDBPersister } from "./lib/persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { NetworkStatus } from "./components/common/NetworkStatus";

// Hàm khởi tạo Mocking
// async function enableMocking() {
//   // Chỉ chạy ở môi trường development
//   const { worker } = await import("./mocks/browser");

//   return worker.start({
//     onUnhandledRequest: "bypass",
//   });
// }

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "online", // Chỉ fetch khi online

      retry: (failureCount, error: any) => {
        if (
          error?.message?.includes("fetch") ||
          error?.message?.includes("network")
        ) {
          return false;
        }
        return failureCount < 2;
      },

      staleTime: 1000 * 60 * 5, // 5 phút
      gcTime: 1000 * 60 * 60 * 24, // 24 giờ

      refetchOnWindowFocus: false,
      refetchOnMount: false, // Dùng cache trước
      refetchOnReconnect: true, // Refetch khi online lại
    },

    mutations: {
      networkMode: "online", // Mutations chỉ chạy khi online
      retry: false,
    },
  },
});

const persister = createIDBPersister();

// enableMocking().then(() => {
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister }}
      >
        <NetworkStatus />
        <App />
        <Toaster />
      </PersistQueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
// });
