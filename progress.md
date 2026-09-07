# Progress & Revisions Log

This log tracks the build history, feature additions, styling changes, and deployment plans for **TaskAssign Pro**.

---

## 📅 Chronological Updates

### Phase 1: Core ERP Foundations
- **Feature**: Built a light-scale ERP system tailored for an agency of 10 users.
- **Components**:
  - Daily Check-in & Chấm công (Attendance tracker with automatic lateness detection at 9:00 AM).
  - Department overview & structure management panel.
  - Kanban Board view featuring columns: Cần làm (Todo), Đang làm (InProgress), Đánh giá (Review), Hoàn thành (Done).
  - Daily Work Reports submission feed (Báo cáo ngày).
- **Security**: Complete JWT-based auth guard structure with role-based restrictions (`Admin`, `Lead`, `Member`).

### Phase 2: Role Scoping & Translation
- **Vietnamese Translation**: Localized all tabs, modals, buttons, and state indicators.
- **Visibility Scoping**: Restricted project and task queries so members only see items that match their participating projects, personal tasks, or departments.
- **Project Detail Overhaul**: Added lists displaying name tags of all members participating in the project.

### Phase 3: Card Layout & UI Restyling
- **Priority Formatting**: Redesigned Kanban task cards:
  - Title moved to the very top with larger, bolder typeface.
  - Priority badge positioned at the bottom with colors matching the background theme:
    - **High (Cao)**: Yellow text (`#d97706`).
    - **Medium (Trung bình)**: Blue text (`#2563eb`).
    - **Low (Thấp)**: White text on slate-grey badge (`#64748b`) for readability.
- **Asana Style Theme Overhaul**: Changed colors to easier read on computers:
  - Main workspace background set to light grey (`#f9f9fb`).
  - Cards, filters, details, and modal background panels converted to solid white (`#ffffff`).
  - Content text contrast increased using deep charcoal/black (`#151b26`).
  - Nav sidebar maintained in deep dark mode (`#1e1f21`) per specifications.

### Phase 4: Port Adjustment & Error Logging
- **Port config**: Switched client development port from `3000` to `3010`.
- **Backend Logging**:
  - Implemented request logging middleware showing incoming request data, payloads (with passwords masked), status, and response time.
  - Implemented automatic file logging to `backend/errors.log` on error responses ($\ge 500$) for production rollout diagnostics.

### Phase 5: Admin Control & Vercel Integration
- **CRUD Administration**: Integrated complete administrative capabilities in the backend and frontend. Admins can create, edit, and delete **Users** and **Departments** via the "Phòng ban & Nhân sự" settings dashboard.
- **Permission Hardening**: Enforced authorization boundaries so Admins bypass restrictions on editing or deleting all project profiles, while Leads are restricted to their own projects.
- **Vercel Routing Rewrite**: Created and synced [frontend/vercel.json](file:///Users/maxx/2026/bronew/bronew/taskassign-pro/frontend/vercel.json) pointing to the production Render backend service domain.

### Phase 6: Attendance, Salary & Permanent Persistence
- **Attendance & Payroll**:
  - Implemented 9:30 AM check-in lateness rules and calculated worked hours relative to the 9:30 AM - 6:30 PM (9.0h) standard shift.
  - Calculated monthly salaries proportionally based on worked hours relative to a 23-day target.
  - Added base salary attributes to user profiles, customizable via Admin CRUD controls.
- **Permanent Cloud Storage**:
  - Created a database wrapper in `database.js` to automatically bridge SQLite and PostgreSQL (using a `pg` pool when `DATABASE_URL` is set).
  - Implemented dynamic SQL translation (transforming SQLite table commands and `?` query arguments into PostgreSQL `$1, $2, ...` syntax).
  - Ensured all updates to users, departments, and project settings are stored permanently in the Neon cloud database.

### Phase 7: Triển Khai Nội Bộ VBE Agency (< 15 Nhân Sự, www.vbe.com.vn)
- **Múi giờ & Chấm công Chuẩn Việt Nam (GMT+7)**:
  - Xây dựng helper `getVietnamTime()` (`Asia/Ho_Chi_Minh`) chuẩn hóa toàn bộ thời gian hệ thống, khắc phục lỗi lệch múi giờ UTC khi deploy Render/Vercel.
  - Kiểm tra đi trễ chính xác tuyệt đối sau 09:30 AM theo giờ Việt Nam.
  - Bổ sung endpoint `GET /api/attendance/today-team` hỗ trợ điểm diện toàn bộ nhân sự VBE Agency trong ngày.
- **Widget Điểm diện Đội ngũ VBE**:
  - Tích hợp widget hiển thị danh sách toàn bộ nhân sự cùng trạng thái có mặt/chưa vào ca/đi trễ theo thời gian thực.
  - Thêm đồng hồ thời gian thực (Live Clock GMT+7) và thông số ca chuẩn: 09:30 - 18:30 (9.0h/ngày).
- **Thương hiệu & Nhận diện VBE Agency**:
  - Cập nhật logo VBE, slogan hệ thống, link website `www.vbe.com.vn`.
  - Cập nhật title web, favicon, gợi ý đăng nhập email domain `@vbe.com.vn`.
- **In ấn & Xuất Bảng Công**:
  - Thêm tính năng In/Xuất bảng công tháng (`window.print()`) kèm định dạng in ấn chuyên nghiệp cho phòng kế toán/quản lý.

### Phase 8: Chấm Công GPS (772 EFG Sư Vạn Hạnh, Q.10), Wi-Fi & Mobile Web App
- **Định vị Vệ tinh GPS & Geofencing**:
  - Trụ sở công ty: Số **772 EFG Sư Vạn Hạnh, Phường 12 (Hoà Hưng), Quận 10, TP.HCM** (tọa độ `10.7745, 106.6685`).
  - Thiết lập bán kính cho phép: **200m** (đảm bảo bao quát toà nhà EFG Building và chống sai số GPS trong nhà).
  - Tích hợp công thức Haversine đo khoảng cách chuẩn xác từng mét giữa vị trí nhân viên và trụ sở.
- **Xác thực Wi-Fi Văn phòng**:
  - Hỗ trợ mạng Wi-Fi **'VBE Agency'** (cho phép Admin tùy biến đổi tên mạng hoặc tọa độ trụ sở qua API `/api/company/settings`).
  - Hỗ trợ xác thực kép: GPS trong bán kính 200m HOẶC kết nối Wi-Fi văn phòng 'VBE Agency'.
- **Giao diện Tối ưu Hóa Di Động (Mobile-First)**:
  - Bổ sung **Mobile Bottom Navigation Bar** dưới đáy màn hình (5 tab: Tổng quan, Dự án, Lịch & Ca, Bảng lương, Nhân sự/Báo cáo) cho thao tác 1 chạm bằng ngón tay cái.
  - Thêm **Mobile Top Bar** hiển thị trạng thái vào ca và thông tin tài khoản.
  - **Modal Chấm công GPS & Wi-Fi chuyên biệt**: Radar quét vệ tinh, hiển thị khoảng cách thời gian thực, nút xác nhận lớn dễ bấm.
  - Ẩn sidebar desktop trên màn hình điện thoại ($\le 768px$) để tối ưu 100% diện tích làm việc.

### Phase 9: Kiểm Soát Chấm Công Ngoài Văn Phòng (Remote/WFH), Bắt Buộc Lý Do & Ghi Nhận Địa Chỉ GPS
- **Phát hiện Ngoài Văn Phòng (> 200m)**:
  - Khi nhân viên ở cách trụ sở 772 Sư Vạn Hạnh > 200m, hệ thống hiển thị cảnh báo rõ ràng khoảng cách (VD: 5.3km).
  - Yêu cầu xác nhận: "Bạn có muốn tiếp tục chấm công với trạng thái Ngoài văn phòng không?".
- **Bắt Buộc Nhập Lý Do (Lý do nhanh + Ghi chú chi tiết)**:
  - 4 danh mục lý do chính: `Làm việc tại nhà (WFH)`, `Gặp khách hàng / Đối tác`, `Đi công tác / Onsite`, `Khác`.
  - Ô nhập ghi chú lý do bắt buộc. Nếu để trống hệ thống sẽ chặn không cho chấm công.
- **Tự Động Ghi Nhận Địa Chỉ Thực Tế (Reverse Geocoding)**:
  - Sử dụng tọa độ GPS thực tế để phân giải thành địa chỉ đường phố cụ thể (số nhà, tên đường, phường, quận) và lưu vào hồ sơ chấm công của nhân viên.
- **Flag Trạng Thái & Giám Sát Hành Vi Nhân Viên**:
  - Tự động gắn cờ `check_in_location_type` (`Office` vs `Remote`).
  - Danh sách "Điểm diện Đội ngũ VBE Hôm nay" và bảng chi tiết chấm công hiển thị huy hiệu tím `Ngoài VP (5.3km)` kèm lý do và địa chỉ để Admin/Quản lý giám sát 100% minh bạch.

### Phase 10: Sửa Lỗi Bể Giao Diện & Tối Ưu Hóa Tỉ Lệ Co Giãn (Scale) Cho Mobile
- **Nguyên nhân cốt lõi**:
  - Các thành phần trang (`Dashboard`, `ProjectView`, `SalaryManager`, `CalendarView`, `DepartmentManager`) sử dụng thẻ `<style>` nội bộ chứa các lưới cố định nhiều cột (`grid-template-columns: repeat(4, 1fr)`, `3fr 1fr`, `280px 1fr`) và padding cố định `32px` đã ghi đè CSS media query bên ngoài.
- **Biện pháp khắc phục triệt để**:
  - **Khóa tràn ngang (Zero horizontal overflow)**: Thêm `max-width: 100vw`, `overflow-x: hidden`, `width: 100%` vào toàn bộ layout và body.
  - **Tối ưu Dashboard trên Mobile**:
    - Chuyển `main-dashboard-grid` thành 1 cột duy nhất.
    - Giảm padding từ 32px xuống 14px 12px, đảm bảo nội dung vừa khít màn hình 375px–430px.
    - Chuyển widget chấm công từ dàn ngang thành dàn dọc (full-width button), thao tác chạm ngón cái cực kỳ êm ái.
    - Thu nhỏ các thẻ chỉ số (Metrics) với icon 36px và bố cục 2 cột cân đối.
  - **Tối ưu Kanban Board (ProjectView)**:
    - Biến 4 cột việc (Todo, InProgress, Review, Done) thành dạng trượt ngang mượt mà (Horizontal Swipe) với hiệu ứng `scroll-snap-type: x mandatory`, mỗi cột rộng `82vw`.
    - Danh sách dự án trên mobile chuyển thành thanh thẻ trượt ngang gọn gàng.
  - **Tối ưu Bảng Lương, Lịch & Phòng Ban**:
    - Các bảng dữ liệu nhiều cột được bọc trong container cuộn ngang riêng biệt (`overflow-x: auto; -webkit-overflow-scrolling: touch`), không bao giờ làm vỡ khung màn hình điện thoại.
    - Thêm khoảng đệm an toàn `padding-bottom: 74px` và hỗ trợ `env(safe-area-inset-bottom)` cho iPhone có thanh Home Indicator.

### Phase 11: Sửa Lỗi Thêm/Bớt Dự Án Trên PostgreSQL & Chuẩn Hóa Phân Quyền (RBAC) Toàn Diện
- **Khắc phục lỗi thêm/bớt dự án trên Neon PostgreSQL (Production)**:
  - **Nguyên nhân**: Wrapper `database.js` tự động nối `RETURNING id` cho mọi câu lệnh `INSERT`. Các bảng liên kết nhiều-nhiều không có cột `id` (`project_members`, `project_departments`, `task_members`, `task_departments`) bị PostgreSQL báo lỗi `column "id" does not exist` dẫn tới mã phản hồi `500`.
  - **Khắc phục**: Loại trừ các bảng trung gian khỏi mệnh đề `RETURNING id` trong `database.js`.
  - **Xóa dự án an toàn**: Bổ sung dọn dẹp cascading (`DELETE` các bản ghi phụ thuộc ở `task_members`, `task_departments`, `tasks`, `project_members`, `project_departments` trước khi xóa `projects`), ngăn chặn triệt để lỗi ràng buộc khóa ngoại (foreign key violation).
  - **Khắc phục giao diện Modal**: Sửa màu chữ tiêu đề modal từ trắng `#fff` sang `var(--text-primary)`, khắc phục chữ tàng hình; thêm thông báo lỗi chi tiết (`alert(error)`) khi thêm/sửa/xóa dự án hoặc công việc thất bại.
- **Phân quyền chi tiết (RBAC)**:
  - **Quản trị viên (Admin)**: Toàn quyền quản trị toàn hệ thống. Có thể tạo dự án với nhiều phòng ban và gán nhiều nhân viên khác nhau. Xem và quản lý toàn bộ nhân sự, điểm diện, công việc và bảng lương mọi phòng ban.
  - **Trưởng phòng (Lead)**: Chỉ xem và quản lý các dự án thuộc phòng ban mình phụ trách (hoặc dự án do mình làm chủ trì / thành viên). Tự động gán phòng ban của mình khi tạo dự án mới. Điểm diện và báo cáo chỉ hiển thị nhân sự thuộc phòng ban của mình.
  - **Nhân viên (Member)**: Tuân thủ nguyên tắc *"ai được gán dự án nào thì xem được dự án đó"* — chỉ xem các dự án và công việc mà mình được trực tiếp gán vào (`owner`, `sub_owner`, hoặc trong danh sách thành viên `project_members` / `task_members`). Điểm diện chỉ hiển thị nhân sự cùng phòng ban và dữ liệu cá nhân.

---

## 🚀 Deployment Plan (Vercel + Neon + Render)

The system is configured to roll out on the following platforms:
1. **Frontend**: Deployed on **Vercel** (connects to the Git repository, builds `tsc && vite build` and serves static files globally).
2. **Backend**: Deployed on **Render** (Node.js web service running `node src/server.js`).
3. **Database**: Migrating SQLite to **Neon PostgreSQL** (serverless Postgres instance with free tier).

