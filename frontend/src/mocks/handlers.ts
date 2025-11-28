// src/mocks/handlers.ts
import { http, HttpResponse } from "msw";
import { MOCK_EMAILS, FOLDERS } from "@/data/mockData";

// Lấy Base URL từ biến môi trường để khớp với Axios
const BASE_URL = import.meta.env.VITE_API_URL;

export const handlers = [
  // 1. GET /mailboxes
  http.get(`${BASE_URL}/mailboxes`, () => {
    return HttpResponse.json(FOLDERS);
  }),

  // 2. GET /mailboxes/:folderId/emails
  http.get(`${BASE_URL}/mailboxes/:folderId/emails`, ({ params }) => {
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
  http.get(`${BASE_URL}/emails/:id`, ({ params }) => {
    const { id } = params;
    const email = MOCK_EMAILS.find((e) => e.id === id);

    if (!email) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(email);
  }),
];