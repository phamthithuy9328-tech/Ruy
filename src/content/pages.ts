// Static page copy per language. Placeholders in [brackets] must be replaced with AmGo's real details
// (and the policies reviewed by AmGo's legal advisor) before applying for OnePay merchant approval.
import type { Locale } from "@/i18n/config";

type Section = { id: string; title: string; body: string[] };

export const about: Record<Locale, { lead: string; sections: Section[] }> = {
  en: {
    lead: "AmGo Travel is a Vietnamese tour operator based in Hanoi. We design small-group and private tours across Vietnam, run by local guides who grew up in the places they show you.",
    sections: [
      { id: "story", title: "Our story", body: ["We started AmGo because we wanted visitors to see the Vietnam we love: the family homestays, the noodle stall with no sign, the mountain pass at sunrise. Today we host thousands of travelers a year, and we still keep our groups small."] },
      { id: "promise", title: "Our promise", body: ["Clear prices with nothing hidden at checkout.", "Licensed guides, insured trips and vehicles we inspect ourselves.", "A real person on WhatsApp before, during and after your trip."] },
      { id: "license", title: "Licensed & registered", body: ["[Registered company name] · Business registration [number] · International tour operator license [number], issued by the Vietnam National Authority of Tourism."] },
    ],
  },
  vi: {
    lead: "AmGo Travel là công ty lữ hành Việt Nam có trụ sở tại Hà Nội. Chúng tôi thiết kế tour nhóm nhỏ và tour riêng khắp Việt Nam, dẫn dắt bởi những hướng dẫn viên lớn lên ngay tại nơi họ giới thiệu.",
    sections: [
      { id: "story", title: "Câu chuyện của chúng tôi", body: ["AmGo ra đời để du khách thấy một Việt Nam mà chúng tôi yêu: homestay gia đình, quán bún không biển hiệu, con đèo lúc bình minh. Mỗi năm chúng tôi đón hàng nghìn khách và vẫn giữ đoàn nhỏ."] },
      { id: "promise", title: "Cam kết", body: ["Giá minh bạch, không phụ phí ẩn khi thanh toán.", "Hướng dẫn viên có thẻ, chuyến đi có bảo hiểm, xe được kiểm tra định kỳ.", "Luôn có người thật hỗ trợ trước, trong và sau chuyến đi."] },
      { id: "license", title: "Giấy phép", body: ["[Tên công ty] · Mã số doanh nghiệp [số] · Giấy phép kinh doanh lữ hành quốc tế [số] do Cục Du lịch Quốc gia Việt Nam cấp."] },
    ],
  },
};

export const policies: Record<Locale, Section[]> = {
  en: [
    { id: "terms", title: "Terms & conditions", body: ["By booking with AmGo Travel you agree to these terms. A booking is confirmed once payment (deposit or full) is received, or when we confirm a reserve-now-pay-later hold by email.", "Prices are per person in the tour's base currency. Prices shown in other currencies are converted at our daily rate for reference; the amount and currency charged are shown before you pay.", "We may adjust the order of an itinerary for safety or weather. If a tour cannot run, we offer a new date or a full refund."] },
    { id: "cancellation", title: "Cancellation & refunds", body: ["More than 15 days before departure: full refund.", "7–14 days before departure: 30% fee.", "3–6 days before departure: 50% fee.", "Less than 48 hours before departure or no-show: no refund.", "Refunds are made to the original payment method within 7–14 working days. Card refunds are made in the currency originally charged; exchange-rate differences set by your bank are outside our control."] },
    { id: "payment", title: "Payment policy", body: ["Card payments are processed by OnePay (onepay.vn) on its secure hosted page. AmGo never sees or stores your card details.", "International cards (Visa, Mastercard, JCB, Amex) are charged in [USD/VND, per merchant contract]. Vietnamese ATM cards and QR payments are charged in VND.", "Deposits are non-transferable between bookings. The balance must be paid before departure as stated in your confirmation."] },
    { id: "privacy", title: "Privacy policy", body: ["We collect only what we need to run your trip: name, contact details, nationality and traveler names. We use them to deliver your booking, send trip information and, if you agree, occasional travel inspiration.", "We process personal data in line with Vietnam's Decree 13/2023/ND-CP on personal data protection and, for visitors in the EU/EEA and UK, the GDPR. Our legal bases are contract performance, legal obligations and, for marketing and analytics cookies, your consent.", "We share data only with the suppliers who deliver your trip (hotels, transport, guides), our payment processor OnePay, and our messaging providers (email, WhatsApp, Zalo, SMS). We keep booking records for as long as accounting law requires.", "You can ask us at any time to access, correct, export or delete your data, or withdraw consent, by emailing [privacy@amgotravel.com]. You may also complain to your local data protection authority.", "Cookies: essential cookies remember your language, currency and checkout. Analytics and advertising cookies load only after you click \"Accept all\"."] },
  ],
  vi: [
    { id: "terms", title: "Điều khoản sử dụng", body: ["Khi đặt tour với AmGo Travel, bạn đồng ý với các điều khoản này. Booking được xác nhận khi chúng tôi nhận thanh toán (cọc hoặc toàn bộ), hoặc khi xác nhận giữ chỗ qua email.", "Giá tính theo khách, bằng tiền tệ gốc của tour. Giá hiển thị bằng tiền tệ khác được quy đổi theo tỷ giá hằng ngày để tham khảo; số tiền và loại tiền thực trừ được hiển thị trước khi thanh toán.", "Chúng tôi có thể đổi thứ tự lịch trình vì an toàn hoặc thời tiết. Nếu tour không thể khởi hành, bạn được đổi ngày hoặc hoàn tiền 100%."] },
    { id: "cancellation", title: "Chính sách hủy và hoàn tiền", body: ["Trước 15 ngày: hoàn 100%.", "Trước 7–14 ngày: phí 30%.", "Trước 3–6 ngày: phí 50%.", "Trong vòng 48 giờ hoặc không đến: không hoàn tiền.", "Tiền hoàn về phương thức thanh toán ban đầu trong 7–14 ngày làm việc, bằng loại tiền đã trừ; chênh lệch tỷ giá do ngân hàng phát hành thẻ quy định."] },
    { id: "payment", title: "Chính sách thanh toán", body: ["Thanh toán thẻ được xử lý bởi OnePay (onepay.vn) trên trang thanh toán bảo mật. AmGo không xem hay lưu thông tin thẻ của bạn.", "Thẻ quốc tế (Visa, Mastercard, JCB, Amex) được trừ bằng [USD/VND theo hợp đồng]. Thẻ ATM nội địa và QR được trừ bằng VND.", "Tiền cọc không chuyển sang booking khác. Phần còn lại cần thanh toán trước ngày khởi hành như ghi trong xác nhận."] },
    { id: "privacy", title: "Chính sách bảo mật", body: ["Chúng tôi chỉ thu thập thông tin cần thiết cho chuyến đi: họ tên, liên hệ, quốc tịch và tên hành khách, để thực hiện booking, gửi thông tin chuyến đi và (nếu bạn đồng ý) thông tin khuyến mãi.", "Dữ liệu cá nhân được xử lý theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân và GDPR đối với khách tại EU/EEA và Vương quốc Anh.", "Chúng tôi chỉ chia sẻ dữ liệu với đối tác cung cấp dịch vụ (khách sạn, vận chuyển, hướng dẫn viên), cổng thanh toán OnePay và nhà cung cấp tin nhắn (email, WhatsApp, Zalo, SMS).", "Bạn có thể yêu cầu xem, sửa, xuất hoặc xóa dữ liệu, hoặc rút lại sự đồng ý, qua email [privacy@amgotravel.com].", "Cookie: cookie cần thiết ghi nhớ ngôn ngữ, tiền tệ và giỏ đặt tour. Cookie đo lường, quảng cáo chỉ tải khi bạn bấm \"Đồng ý tất cả\"."] },
  ],
};
