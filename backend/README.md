<p align="center">
  <a href="http://nestjs.com/" target="blank">
    <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
  </a>
</p>

<p align="center">
  Backend RESTful API được xây dựng bằng <b>NestJS</b>, phục vụ cho ứng dụng <b>Email Client</b>.
  <br />
  Hệ thống hoạt động như một <b>Proxy Server</b> bảo mật giao tiếp với <b>Gmail API</b>, đồng thời đồng bộ dữ liệu vào <b>MongoDB</b> để phục vụ tìm kiếm nâng cao và quản lý quy trình.
</p>

<p align="center">
  <a href="https://www.npmjs.com/~nestjscore" target="_blank">
    <img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" />
  </a>
  <a href="https://www.npmjs.com/~nestjscore" target="_blank">
    <img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" />
  </a>
  <a href="https://circleci.com/gh/nestjs/nest" target="_blank">
    <img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" />
  </a>
  <a href="https://discord.gg/G7Qnnhy" target="_blank">
    <img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord" />
  </a>
</p>

---

# NestJS Email Client Backend

Backend service cho ứng dụng Email Client thế hệ mới, tích hợp Kanban Board và AI hỗ trợ. Dự án được xây dựng bằng NestJS và MongoDB, sử dụng Google Gmail API để đồng bộ dữ liệu.

## Tính năng chính
* **OAuth2 Authentication**: Đăng nhập và liên kết tài khoản Google an toàn.

* **Email Management**: Đọc, gửi, trả lời, chuyển tiếp email thông qua Gmail API.

* **Kanban Integration**: Tự động biến email thành thẻ Kanban để quản lý công việc (Inbox, Todo, Doing, Done).

* **Real-time Sync**: Đồng bộ email mới tức thì sử dụng Gmail Push Notifications (Pub/Sub).

* **AI Features**: Tóm tắt nội dung email, Semantic Search (Tìm kiếm ngữ nghĩa).

* **Demo Mode**: Hệ thống Seed Data thông minh để test UI mà không cần tài khoản Google thật.

---

## Công nghệ sử dụng

* **Framework**: NestJS

* **Database**: MongoDB (Mongoose)

* **Authentication**: Passport, JWT, Google OAuth2

* **External APIs**: Google Gmail API, Gemini AI

* **Real-time**: WebSockets (Socket.io)

---

## Cài đặt & Chạy dự án

### Yêu cầu tiên quyết

* Node.js v18+
* MongoDB (Local hoặc Atlas)
* Google Cloud Project (đã bật Gmail API)

### Cài đặt

```bash
cd backend
npm install
```

### Cấu hình môi trường (`.env`)

```env
# APP
PORT=3000
FRONTEND_URL=http://localhost:5173

# DATABASE
DATABASE_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/db

# AUTHENTICATION
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
ACCESS_TOKEN_EXPIRATION=15m
REFRESH_TOKEN_EXPIRATION=7d

# GOOGLE OAUTH (Xem hướng dẫn bên dưới)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# GOOGLE PUBSUB (Real-time sync)
GOOGLE_PUBSUB_TOPIC=projects/your-project-id/topics/gmail-watch

# AI
GEMINI_API_KEY=your_gemini_api_key
```

## Google OAuth Setup & Security
Để ứng dụng có thể truy cập Gmail của người dùng, bạn cần cấu hình OAuth2 trên Google Cloud Console.

### 1. Tạo Project & Credentials
Truy cập Google Cloud Console.

* Tạo Project mới.

* Vào APIs & Services > Library > Tìm và Enable Gmail API.

* Vào OAuth consent screen:

* User Type: External (hoặc Internal nếu dùng G-Suite).

* Thêm Scopes: https://mail.google.com/, email, profile.

* Thêm Test Users: Email của bạn (nếu để app ở chế độ Testing).

* Vào Credentials > Create Credentials > OAuth Client ID:

* Application type: Web application.

* Authorized redirect URIs: http://localhost:3000/auth/google/callback (Backend URL).

* Copy Client ID và Client Secret vào file .env.

### 2. Cơ chế lưu trữ Token (Token Storage)
Chúng tôi tuyệt đối không lưu mật khẩu của người dùng. Thay vào đó, hệ thống sử dụng cơ chế OAuth2 chuẩn:

* Access Token: Dùng để gọi API (Gmail), có thời hạn ngắn (1 giờ).

* Refresh Token: Dùng để lấy Access Token mới khi cái cũ hết hạn mà không cần người dùng đăng nhập lại.

é.

### 3. Cấu hình Real-time Notification (Google Pub/Sub)
Để ứng dụng nhận được thông báo ngay lập tức khi có email mới, bạn cần tạo một Topic trên Google Cloud Pub/Sub.

#### **Tạo Topic**:

Trong Google Cloud Console, tìm kiếm và chọn Pub/Sub > Topics.

* Bấm Create Topic.

* Đặt Topic ID (ví dụ: gmail-watch).

* Bỏ chọn "Add a default subscription" (nếu không cần thiết).

* Bấm Create.

Cấp quyền cho Gmail (Quan trọng):

* Sau khi tạo xong, bấm vào Topic vừa tạo.

* Chọn tab Permissions.

* Bấm Add Principal.

* Trong ô "New principals", nhập địa chỉ email hệ thống của Gmail: gmail-api-push@system.gserviceaccount.com

* Trong ô "Select a role", chọn Pub/Sub Publisher.

* Bấm Save. (Bước này cho phép Gmail được quyền đẩy thông báo vào Topic của bạn).

Cập nhật cấu hình:

* Copy Topic Name đầy đủ (có dạng projects/`<project-id>`/topics/`<topic-id>`).

* Dán vào file .env của Backend:

```
GOOGLE_PUBSUB_TOPIC=projects/your-project-id/topics/gmail-watch
```

### Quy trình bảo mật:

* Khi user login Google, Server nhận auth_code.

* Server đổi auth_code lấy cặp access_token và refresh_token.

* Token được lưu trong Collection linked_accounts.
z
* Security Consideration: Trong môi trường Production, refresh_token nên được mã hóa (Encrypt) ở tầng Database (Application Level Encryption) để đảm bảo an toàn nếu DB bị lộ.

### Chạy server

```bash
npm run start:dev
```

Server chạy tại: **[http://localhost:3000](http://localhost:3000)**


Chế độ Demo (Seed Data): Để nạp dữ liệu giả (không cần login Google thật):

```Bash
# Gọi API seed qua Postman hoặc Curl để nhận được tài khoản demo
POST http://localhost:3000/seed
```
---

## 📡 API Endpoints chính

| Endpoint | Description |
| :---- | :---- |
| **Auth** | |
| POST /auth/login | Đăng nhập hệ thống (trả về Access Token & User Info). |
| **Mock data** | |
| POST /seed | Seed data và trả về một tài khoản có thể đăng nhập hệ thống xem mock data. |
| **Search Features** | |
| GET /mail/search | Fuzzy Search: Tìm kiếm email theo từ khóa (Subject, Sender) dùng Fuse.js. |
| POST /mail/search/semantic | Semantic Search: Tìm kiếm email theo ngữ nghĩa dùng Vector Search (Gemini embedding). |
| GET /mail/suggestions | Auto-suggestion: Gợi ý từ khóa/người gửi khi user đang nhập liệu. |
| **Mail Operations** | |
| GET /mail/mailboxes | Lấy danh sách các hộp thư (Inbox, Sent, Drafts, Trash...). |
| GET /mail/mailboxes/:labelId/emails | Lấy danh sách email trong một hộp thư cụ thể (có phân trang). |
| GET /mail/emails/:id | Lấy chi tiết nội dung của một email. |
| GET /mail/emails/:id/summary | AI Summary: Lấy tóm tắt nội dung email do AI tạo ra. |
| POST /mail/send | Gửi email mới. |
| POST /mail/emails/:id/reply | Trả lời (Reply) một email. |
| POST /mail/emails/:id/forward | Chuyển tiếp (Forward) một email. |
| POST /mail/emails/:id/modify | Thay đổi trạng thái email (Đánh dấu đã đọc, Xóa, Gán nhãn...). |
| GET /mail/attachments/:msgId/:attId | Tải xuống file đính kèm của email. |
| POST /mail/sync | Đồng bộ mail |
| **Kanban Configuration** | |
| GET /kanban/config | Lấy cấu hình bảng Kanban cá nhân của user (danh sách cột, màu sắc, label mapping). |
| POST /kanban/config | Khởi tạo cấu hình Kanban mới (thường gọi khi user lần đầu vào Dashboard). |
| PUT /kanban/config | Cập nhật toàn bộ cấu hình Kanban (ví dụ: thay đổi thứ tự các cột, đổi tên nhiều cột cùng lúc). |
| DELETE /kanban/config | Xóa cấu hình Kanban hiện tại (Reset về mặc định). |
| PATCH /kanban/config/column/:id | Cập nhật thông tin chi tiết của một cột cụ thể (đổi tên cột, đổi màu, đổi Gmail Label liên kết). |
| DELETE /kanban/config/column/:id | Xóa một cột cụ thể khỏi bảng Kanban. |
| **Gmail Watch Pub&Sub** | |
| POST /mail/watch | Endpoint để Gmail Watch |
| POST /mail/notification | Endpoint để nhận thông báo từ Gmail Pub&Sub |

---

## Security Considerations
* **Least Privilege**: Chỉ xin quyền (Scope) tối thiểu cần thiết để app hoạt động.

* **JWT Authentication**: Bảo vệ các Internal API bằng Access Token ngắn hạn.

* **CORS**: Chỉ cho phép Frontend (CLIENT_URL) gọi API.

* **Sensitive Data**: Không bao giờ log access_token hoặc refresh_token ra console.