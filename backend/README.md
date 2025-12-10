<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

# G05 - 

## Enpoint được thêm mới:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/mail/mailboxes/:labelId/emails` | Get emails with pagination. Query: `?limit=20&pageToken=xyz` |
| `POST` | `/mail/emails/:id/modify` | Drag & Drop (Change labels). Body: `{ addLabels: [], removeLabels: [] }` |
| `GET` | `/mail/emails/:id/summary` | **[New]** Get AI summary of an email (Cached). |
| `POST` | `/snooze` | Snooze an email. Body: `{ messageId: "...", wakeUpTime: "ISO_DATE" }` |
| `GET` | `/snooze` | Get list of snoozed emails. Query: `?page=1&limit=10` |

## Cron job

Wake Up Snoozed Emails: Runs every minute (* * * * *). Checks snooze_logs for expired items and moves them back to INBOX.

## Database Collections

users: User information.

linked_accounts: Google OAuth tokens (Access/Refresh tokens).

snooze_logs: Tracks active snoozed emails and their wake-up times.

email_summaries: Caches AI-generated summaries by messageId



## Công nghệ

- Framework: NestJS.

- Database: MongoDB, Mongoose.

- Google API: googleapis (Official Node.js Client).

- Auth: Passport, JWT, Bcrypt.

## Cài đặt và Chạy

Yêu cầu tiên quyết

- Node.js (v18 trở lên)

- MongoDB (Local hoặc Atlas)

- Google Cloud Project (đã bật Gmail API)

- Các bước thực hiện

Di chuyển vào thư mục backend:

    cd backend


Cài đặt dependencies:

    npm install


Cấu hình biến môi trường:
Tạo file .env tại thư mục backend/ và cấu hình như sau:

    PORT=3000
    DATABASE_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/db

### JWT Config
    JWT_SECRET=your_secret_key
    JWT_REFRESH_SECRET=your_refresh_secret_key
    ACCESS_TOKEN_EXPIRATION=15m # Thời gian sống ngắn để bảo mật
    REFRESH_TOKEN_EXPIRATION=7d

### Google OAuth (Lấy từ Google Cloud Console)
    GOOGLE_CLIENT_ID=your-google-client-id
    GOOGLE_CLIENT_SECRET=your-google-client-secret
    GOOGLE_REDIRECT_URI=http://localhost:5173/login/oauth/google/callback

### Frontend URL (Cấu hình CORS)
    FRONTEND_URL=http://localhost:5173


Chạy server:

    npm run start:dev


Server sẽ chạy tại http://localhost:3000.

### Cấu hình Google Cloud (Bắt buộc)

Để Backend có thể truy cập Gmail của người dùng, bạn cần cấu hình đúng trên Google Console:

Tạo Project mới và Enable Gmail API.

Trong OAuth Consent Screen, thêm các scopes:

    .../auth/userinfo.email

    .../auth/userinfo.profile

    .../auth/gmail.readonly

    .../auth/gmail.send

    .../auth/gmail.modify

Trong Credentials, tạo OAuth Client ID cho Web Application:

    Authorized JavaScript origins: http://localhost:5173

    Authorized redirect URIs: http://localhost:5173/login/oauth/google/callback

📡 Danh sách API Endpoints chính

| Method | Endpoint                          | Mô tả                              | Auth |
|--------|------------------------------------|--------------------------------------|------|
| POST   | /auth/login                        | Đăng nhập tài khoản thường           |      |
| POST   | /auth/google                       | Trao đổi Code lấy Token Google       |      |
| POST   | /auth/refresh                      | Làm mới Access Token của App         |      |

### Mail
| Method | Endpoint                                | Mô tả                               | Auth |
|--------|------------------------------------------|---------------------------------------|------|
| GET    | /mail/mailboxes                          | Lấy danh sách thư mục (Labels)        |      |
| GET    | /mail/mailboxes/:id/emails               | Lấy danh sách email trong thư mục     |      |
| GET    | /mail/emails/:id                         | Lấy chi tiết nội dung email           |      |
| POST   | /mail/send                               | Gửi email mới                         |      |
| POST   | /mail/emails/:id/reply                   | Trả lời email (Gộp thread)            |      |
| POST   | /mail/emails/:id/forward                 | Chuyển tiếp email                     |      |
| GET    | /mail/attachments/:msgId/:attId          | Tải file đính kèm                     |      |


### Bảo mật

- Google Refresh Token: Được lưu trữ mã hóa trong database. Frontend không bao giờ được tiếp cận token này.

- Backend Proxy: Mọi thao tác với Gmail đều đi qua Backend. Backend sử dụng googleapis client để tự động xử lý việc refresh token của Google, đảm bảo phiên làm việc liên tục mà không cần user đăng nhập lại Google nhiều lần.