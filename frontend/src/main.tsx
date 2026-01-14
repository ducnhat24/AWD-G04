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
      staleTime: 1000 * 60 * 1, // 1 phút

      gcTime: 1000 * 60 * 60 * 24,

      networkMode: "offlineFirst",
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
        <App />
        <Toaster />
      </PersistQueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
// });
