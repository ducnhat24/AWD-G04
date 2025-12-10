# G05 - React Email Client Frontend

Ứng dụng Single Page Application (SPA) đóng vai trò là giao diện người dùng cho Email Client tích hợp Gmail. Được xây dựng bằng React, Vite và Tailwind CSS, ứng dụng cung cấp trải nghiệm người dùng mượt mà để quản lý email với các tính năng **tăng cường AI và quy trình làm việc Kanban**.

## Tính năng

### Xác thực:

- Đăng nhập/Đăng ký bằng Email & Mật khẩu.

- Đăng nhập bằng Google (OAuth 2.0).

- Cơ chế tự động làm mới Token (Silent Refresh) giúp trải nghiệm liền mạch.

### Dashboard Email: (Giao diện đa chế độ)

- **Chế độ truyền thống:** Giao diện 3 cột hiện đại (Danh sách thư mục, Danh sách email, Chi tiết email).
    - Hiển thị danh sách email với phân trang và trạng thái đọc/chưa đọc.
    - Xem chi tiết nội dung email (hỗ trợ HTML) an toàn và xem/tải xuống file đính kèm.

- **Chế độ AI Workflow (Kanban):** Tập trung vào khả năng sắp xếp và ra quyết định nhanh chóng.
    - [cite_start]Tổ chức email thành giao diện Kanban trực quan với các cột tùy chỉnh (ví dụ: Inbox, To Do, Done, Snoozed)[cite: 77, 78].
    - [cite_start]Mỗi email được hiển thị là một "Card" chứa thông tin cơ bản (Người gửi, Chủ đề) và một **tóm tắt ngắn gọn được tạo ra bởi AI**[cite: 83, 103].
    - [cite_start]**Tóm tắt AI:** Tích hợp LLM để tạo tóm tắt nội dung email, giúp người dùng đưa ra quyết định nhanh chóng mà không cần đọc email dài dòng[cite: 98, 101, 102].

### Thao tác & Quản lý Quy trình làm việc:

- **Quản lý quy trình (Drag-and-Drop):** Cho phép kéo và thả Card giữa các cột. [cite_start]Hành động này sẽ kích hoạt cập nhật trạng thái của email ở Backend[cite: 85, 88].
- [cite_start]**Hoãn (Snooze) Email:** Cho phép người dùng tạm thời ẩn email khỏi chế độ xem hoạt động (ví dụ: Inbox) và di chuyển đến trạng thái "Snoozed"[cite: 91, 94]. [cite_start]Hệ thống sẽ tự động khôi phục email về trạng thái ban đầu sau khi hết thời gian hoãn[cite: 96].
- Soạn thảo email mới (Compose).
- Trả lời (Reply) và Chuyển tiếp (Forward) email.
- Đánh dấu đã đọc/chưa đọc, gắn sao, xóa email.

### Xử lý lỗi & UX:

- Thông báo lỗi user friendly (Toast notifications).

- Loading state và Skeleton loading.

- Xử lý đồng thời (Concurrency Guard) cho các request khi token hết hạn.

## Công nghệ

- Core: React 19, Vite, TypeScript.

- Styling: Tailwind CSS, Shadcn/UI.

- State Management & Fetching: React Query (@tanstack/react-query), Axios.

- Routing: React Router DOM.

- Forms: React Hook Form, Zod.

- Workflow: React Beautiful DND (@hello-pangea/dnd).

- Mocking (Dev): MSW (Mock Service Worker) - Đã tắt khi tích hợp Backend thật.

## Cài đặt và Chạy

- Yêu cầu tiên quyết

- Node.js (v18 trở lên)

- npm hoặc yarn

#### Các bước thực hiện

##### Di chuyển vào thư mục frontend:

    cd frontend


##### Cài đặt dependencies:

    npm install


##### Cấu hình biến môi trường:
Tạo file .env tại thư mục frontend/ và điền các thông tin sau (khớp với Backend):

    VITE_API_URL=http://localhost:3000

### Cấu hình OAuth (Lấy từ Google Cloud Console)
    VITE_GOOGLE_CLIENT_ID=your-google-client-id
    VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/login/oauth/google/callback


### Chạy ứng dụng:

    npm run dev

Ứng dụng sẽ chạy tại http://localhost:5173.

## Bảo mật Frontend

### Lưu trữ Token:

- Access Token: Được lưu trong bộ nhớ ứng dụng (In-memory variable & React Context), không lưu vào LocalStorage để tránh XSS.

- Refresh Token: Được lưu trong LocalStorage để duy trì phiên đăng nhập (có thể nâng cấp lên HttpOnly Cookie).

### Xử lý Token hết hạn:

- Sử dụng Axios Interceptor để bắt lỗi 401.

- Cơ chế Concurrency Guard đảm bảo chỉ có 1 request refresh token được gửi đi khi có nhiều API gọi cùng lúc bị lỗi.

## Demo Kịch bản "Hết hạn Token"

### Để kiểm chứng cơ chế tự động làm mới token:

- Đăng nhập vào ứng dụng.

- Chờ khoảng 15 phút (hoặc thời gian ACCESS_TOKEN_EXPIRATION được cấu hình ở file env ở Backend).

- Thực hiện một thao tác gọi API (ví dụ: chuyển đổi thư mục hoặc bấm nút "Test API Ping").

- Quan sát Tab Network trong DevTools:

- Request đầu tiên bị lỗi 401.

- Ngay sau đó là request /auth/refresh thành công 200.

- Cuối cùng là request ban đầu được gọi lại thành công 200.

- Người dùng không bị đăng xuất.