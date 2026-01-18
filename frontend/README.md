# AWD Mail Client - Frontend

Giao diện người dùng cho ứng dụng **Email Client thế hệ mới**, được xây dựng theo kiến trúc **Single Page Application (SPA)**. Ứng dụng tích hợp quy trình làm việc Kanban, hỗ trợ AI và hoạt động mượt mà ngay cả khi mất kết nối mạng.

## Tính năng nổi bật

### Quản lý Email dạng Kanban
* **Drag & Drop:** Kéo thả email dễ dàng giữa các cột trạng thái: *Inbox, To Do, Doing, Done*.
* **Snooze:** Tạm hoãn email và tự động nhắc lại sau khoảng thời gian cài đặt.
* **Filtering & Sorting:** Lọc email chưa đọc, có đính kèm và sắp xếp theo thời gian thực.

### Tìm kiếm thông minh (Smart Search)
* **Fuzzy Search:** Tìm kiếm nhanh theo từ khóa (tiêu đề, người gửi) ngay khi gõ.
* **Semantic Search (AI):** Tìm kiếm theo ngữ nghĩa/ý định (Ví dụ: *"Tìm các email liên quan đến hóa đơn tháng trước"*).
* **Search Suggestions:** Gợi ý từ khóa thông minh.

### Trải nghiệm người dùng (UX) & Hiệu năng
* **Real-time Sync:** Tự động cập nhật Inbox ngay khi có email mới (sử dụng WebSockets/PubSub).
* **Offline Mode:** Ứng dụng vẫn hoạt động khi mất mạng. Các thao tác sẽ được đồng bộ tự động khi có mạng trở lại.
* **Theme Customization:** Hỗ trợ chế độ Sáng/Tối (Dark/Light Mode) với nút chuyển đổi nhanh.
* **Accessibility:** Hỗ trợ phím tắt và điều hướng bằng bàn phím.

---

## Công nghệ sử dụng

* **Core:** React 18+, Vite, TypeScript
* **State Management:** Zustand / React Context
* **Styling:** Tailwind CSS, Shadcn/UI
* **HTTP Client:** Axios (với Interceptor xử lý Refresh Token tự động)
* **Real-time:** Socket.io-client
* **Drag & Drop:** @hello-pangea/dnd

---

## Hướng dẫn cài đặt

### 1. Yêu cầu tiên quyết
* Node.js v18 trở lên.
* **Backend** đã được khởi chạy tại port `3001` (hoặc port tuỳ chỉnh của bạn).

### 2. Cài đặt thư viện
Tại thư mục `frontend/`, chạy lệnh:

```bash
npm install
```

## 3. Cấu hình môi trường (.env)
Tạo file .env tại thư mục gốc của frontend và điền các thông số:

```Đoạn mã
# URL của Backend API
VITE_API_URL=http://localhost:3000

# Google OAuth Client ID (Lấy từ Google Cloud Console)
VITE_GOOGLE_CLIENT_ID=your-google-client-id

# Redirect URI (Phải khớp với cấu hình trong Google Cloud)
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/login/oauth/google/callback
```
## 4. Chạy ứng dụng
Chế độ phát triển (Development):

```Bash
npm run dev
```
Truy cập: http://localhost:5173

Build cho Production:

```Bash
npm run build
npm run preview
```

## Hướng dẫn sử dụng (User Guide)
### Đăng nhập & Demo
* Bạn có thể đăng nhập bằng tài khoản Google thật.

* Hoặc sử dụng Demo Account (nếu Backend đã chạy Seed Data) để trải nghiệm đầy đủ tính năng mà không cần login Google.

**Thao tác trên Kanban**

* Kéo thả: Nhấn giữ vào một thẻ email và kéo sang cột mong muốn.

* Xem chi tiết: Bấm vào thẻ để xem nội dung email đầy đủ (HTML).

* Tóm tắt AI: Bấm nút "Summarize" trong chi tiết email để xem nội dung tóm gọn.

**Tìm kiếm**
* Nhập từ khoá vào thanh tìm kiếm trên Header.

* Kết quả sẽ hiển thị ngay lập tức (Fuzzy) hoặc nhấn Enter để tìm sâu hơn (Semantic).

**Bảo mật**

* Access Token: Được lưu trong bộ nhớ ứng dụng (Memory) để tránh XSS.

* Refresh Token: Được xử lý an toàn để duy trì phiên đăng nhập mà không làm phiền người dùng.

* CORS: Đã cấu hình chỉ chấp nhận request từ domain frontend.

