// Admin UI strings: English (default) with a Vietnamese option per user
const en = {
  dashboard: "Dashboard", bookings: "Bookings", customers: "Customers", tours: "Tours", posts: "Travel guides", reviews: "Reviews", discounts: "Promo codes",
  templates: "Message templates", webhooks: "Webhooks", settings: "Languages & currencies", users: "Staff", audit: "Audit log", account: "My account", logout: "Log out", viewSite: "View site",
  save: "Save", saved: "Saved", search: "Search", status: "Status", all: "All", export: "Export CSV", new: "New", edit: "Edit", delete: "Delete", actions: "Actions",
  english: "English (primary)", vietnamese: "Vietnamese translation", denied: "Your role doesn't have access to that page.",
};
const vi: typeof en = {
  dashboard: "Tổng quan", bookings: "Booking", customers: "Khách hàng", tours: "Tour", posts: "Cẩm nang", reviews: "Đánh giá", discounts: "Mã giảm giá",
  templates: "Mẫu tin nhắn", webhooks: "Webhook", settings: "Ngôn ngữ & tiền tệ", users: "Nhân viên", audit: "Nhật ký", account: "Tài khoản", logout: "Đăng xuất", viewSite: "Xem website",
  save: "Lưu", saved: "Đã lưu", search: "Tìm", status: "Trạng thái", all: "Tất cả", export: "Xuất CSV", new: "Thêm mới", edit: "Sửa", delete: "Xóa", actions: "Thao tác",
  english: "Tiếng Anh (chính)", vietnamese: "Bản dịch tiếng Việt", denied: "Vai trò của bạn không có quyền vào trang đó.",
};
export const adminT = (l: string) => (l === "vi" ? vi : en);
