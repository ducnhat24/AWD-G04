// src/constants/app.constant.ts

// Định nghĩa các Folder ID (Giữ nguyên giá trị như code cũ)
export const FOLDER_IDS = {
  INBOX: "INBOX",
  SNOOZED: "SNOOZED",
  TRASH: "TRASH",
  SENT: "SENT",
  DRAFT: "DRAFT",
  STARRED: "STARRED",
  SPAM: "SPAM",
} as const;

// Các chế độ xem (View Mode)
export const VIEW_MODES = {
  LIST: "list",
  KANBAN: "kanban",
} as const;

// Các chế độ soạn thảo (Compose Mode)
export const COMPOSE_MODES = {
  COMPOSE: "compose",
  REPLY: "reply",
  FORWARD: "forward",
} as const;

// Các bộ lọc tìm kiếm
export const SEARCH_FILTERS = {
  ALL: "all",
  UNREAD: "unread",
  HAS_ATTACHMENT: "has_attachment",
} as const;

// Key lưu trong LocalStorage
export const STORAGE_KEYS = {
  VIEW_MODE: "viewMode",
  THEME: "vite-ui-theme",
} as const;
