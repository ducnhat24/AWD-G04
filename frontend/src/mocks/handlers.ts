// src/mocks/handlers.ts
import { INITIAL_KANBAN_CONFIG } from "@/data/mockData";
import { FOLDERS, MOCK_EMAILS } from "@/features/emails/mocks/email.mock";
import { http, HttpResponse, passthrough } from "msw";

// Lấy Base URL từ biến môi trường để khớp với Axios
const BASE_URL = import.meta.env.VITE_API_URL;

const getPersistedConfig = () => {
  const saved = localStorage.getItem("kanban_config");
  return saved ? JSON.parse(saved) : INITIAL_KANBAN_CONFIG;
};

const saveConfig = (config: any) => {
  localStorage.setItem("kanban_config", JSON.stringify(config));
};

export const handlers = [
  // 1. GET /mailboxes
  http.get(`${BASE_URL}/mail/mailboxes`, () => {
    const authProvider = localStorage.getItem("authProvider");
    if (authProvider === "google") {
      return passthrough();
    }
    return HttpResponse.json(FOLDERS);
  }),

  // 2. GET /mailboxes/:folderId/emails
  http.get(`${BASE_URL}/mail/mailboxes/:folderId/emails`, ({ params }) => {
    const authProvider = localStorage.getItem("authProvider");
    if (authProvider === "google") {
      return passthrough();
    }
    const { folderId } = params;

    // Giả lập logic filter giống như backend
    let filteredEmails = MOCK_EMAILS;

    if (folderId === "starred") {
      filteredEmails = MOCK_EMAILS.filter((e) => e.isStarred);
    } else {
      filteredEmails = MOCK_EMAILS.filter((e) => e.folder === folderId);
    }

    return HttpResponse.json(filteredEmails);
  }),

  // 3. GET /emails/:id
  http.get(`${BASE_URL}/mail/emails/:id`, ({ params }) => {
    const authProvider = localStorage.getItem("authProvider");
    if (authProvider === "google") {
      return passthrough();
    }
    const { id } = params;
    const email = MOCK_EMAILS.find((e) => e.id === id);

    if (!email) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(email);
  }),

  // 4. GET /mail/attachments/:emailId/:attachmentId
  http.get(`${BASE_URL}/mail/attachments/:emailId/:attachmentId`, () => {
    const authProvider = localStorage.getItem("authProvider");
    if (authProvider === "google") {
      return passthrough();
    }
    // Return a dummy PDF blob
    const blob = new Blob(["Dummy attachment content"], {
      type: "application/pdf",
    });
    return new HttpResponse(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="mock.pdf"',
      },
    });
  }),

  http.get("/api/kanban/config", () => {
    const config = getPersistedConfig();
    return HttpResponse.json(config);
  }),

  http.put("/api/kanban/config", async ({ request }) => {
    const newConfig = (await request.json()) as Record<string, unknown>;
    saveConfig(newConfig); // Lưu xuống storage
    return HttpResponse.json(newConfig);
  }),
];
