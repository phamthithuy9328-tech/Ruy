// Destinations, categories, starter guides and message templates. Tours come from prisma/data/amgo-tours.json
// (the amgotravel.com export, see scripts/import-amgo-tours.mjs).
export const destinations = [
  { slug: "hanoi", region: "north", featured: true, name: "Hanoi", description: "A thousand years of history, French boulevards and the best street food in Asia.", vi: { name: "Hà Nội", description: "Nghìn năm văn hiến, phố cổ, đại lộ kiểu Pháp và ẩm thực đường phố hàng đầu châu Á." } },
  { slug: "ha-giang", region: "north", featured: true, name: "Ha Giang", description: "Vietnam's last frontier: limestone peaks, mountain passes and hill-tribe markets.", vi: { name: "Hà Giang", description: "Cao nguyên đá Đồng Văn, đèo Mã Pí Lèng và những phiên chợ vùng cao." } },
  { slug: "sapa", region: "north", featured: true, name: "Sapa", description: "Emerald rice terraces, Hmong villages and Fansipan, the Roof of Indochina.", vi: { name: "Sapa", description: "Ruộng bậc thang, bản làng người H'Mông và đỉnh Fansipan." } },
  { slug: "ninh-binh", region: "north", featured: true, name: "Ninh Binh", description: "Rivers winding through karst mountains, ancient temples and rice paddies.", vi: { name: "Ninh Bình", description: "Sông nước len giữa núi đá vôi, đền chùa cổ và đồng lúa." } },
  { slug: "ha-long-bay", region: "north", featured: true, name: "Ha Long Bay", description: "Two thousand limestone islands rising from emerald water. Best seen from a cruise.", vi: { name: "Vịnh Hạ Long", description: "Hàng nghìn đảo đá vôi giữa làn nước xanh ngọc, đẹp nhất khi ngắm từ du thuyền." } },
  { slug: "pu-luong", region: "north", featured: true, name: "Pu Luong", description: "Terraced valleys, stilt-house villages and bamboo forests, far from the crowds.", vi: { name: "Pù Luông", description: "Thung lũng ruộng bậc thang, bản nhà sàn và rừng tre, xa khỏi đám đông." } },
  { slug: "cao-bang", region: "north", featured: false, name: "Cao Bang", description: "Ban Gioc Waterfall, emerald rivers and quiet border villages.", vi: { name: "Cao Bằng", description: "Thác Bản Giốc, dòng sông xanh ngọc và những bản làng biên giới yên bình." } },
  { slug: "hue", region: "central", featured: false, name: "Hue", description: "Vietnam's imperial capital, with royal tombs along the Perfume River.", vi: { name: "Huế", description: "Cố đô với Đại Nội và lăng tẩm bên dòng sông Hương." } },
  { slug: "hoi-an", region: "central", featured: true, name: "Hoi An", description: "A lantern-lit old town, tailors, beaches and the best cooking classes in Vietnam.", vi: { name: "Hội An", description: "Phố cổ đèn lồng, tiệm may, bãi biển và lớp học nấu ăn nổi tiếng." } },
  { slug: "da-nang", region: "central", featured: true, name: "Da Nang", description: "Beaches, the Marble Mountains and the Han River lit up at night.", vi: { name: "Đà Nẵng", description: "Biển đẹp, Ngũ Hành Sơn và sông Hàn rực rỡ về đêm." } },
  { slug: "phu-quoc", region: "south", featured: true, name: "Phu Quoc", description: "White-sand beaches, coral reefs and some of the best sunsets in Southeast Asia.", vi: { name: "Phú Quốc", description: "Biển cát trắng, rạn san hô và hoàng hôn đẹp bậc nhất Đông Nam Á." } },
  { slug: "mekong-delta", region: "south", featured: true, name: "Mekong Delta", description: "Floating markets, fruit orchards and life on the water in Vietnam's rice bowl.", vi: { name: "Miền Tây", description: "Chợ nổi, vườn trái cây và cuộc sống sông nước miền Tây." } },
  { slug: "ho-chi-minh-city", region: "south", featured: false, name: "Ho Chi Minh City", description: "Saigon's energy: rooftop bars, war history and a legendary food scene.", vi: { name: "TP. Hồ Chí Minh", description: "Sài Gòn sôi động: rooftop bar, di tích lịch sử và ẩm thực huyền thoại." } },
];

export const categories = [
  { slug: "day-trips", group: "type", icon: "sun", name: "Day trips", description: "Big experiences, back by dinner", vi: { name: "Tour trong ngày", description: "Trải nghiệm trọn vẹn, về trước bữa tối" } },
  { slug: "multi-day", group: "type", icon: "calendar", name: "Multi-day tours", description: "Go deeper with 2 days or more", vi: { name: "Tour dài ngày", description: "Khám phá sâu từ 2 ngày trở lên" } },
  { slug: "private-tours", group: "type", icon: "user", name: "Private tours", description: "Your own guide, your own pace", vi: { name: "Tour riêng", description: "Hướng dẫn viên riêng, nhịp độ của bạn" } },
  { slug: "small-group", group: "type", icon: "users", name: "Small-group tours", description: "Maximum 12 travelers per group", vi: { name: "Tour nhóm nhỏ", description: "Tối đa 12 khách mỗi đoàn" } },
  { slug: "mice-team-building", group: "type", icon: "briefcase", name: "MICE & team building", description: "Incentives, conferences and team trips", vi: { name: "MICE & team building", description: "Khen thưởng, hội nghị, du lịch công ty" } },
  { slug: "trekking-adventure", group: "theme", icon: "mountain", name: "Trekking & adventure", description: "Mountain passes, treks and motorbike loops", vi: { name: "Trekking & mạo hiểm", description: "Đèo núi, trekking và phượt xe máy" } },
  { slug: "beach-islands", group: "theme", icon: "waves", name: "Beach & islands", description: "Snorkeling, island hopping and sunsets", vi: { name: "Biển đảo", description: "Lặn ngắm san hô, khám phá đảo, hoàng hôn" } },
  { slug: "food-culture", group: "theme", icon: "utensils", name: "Food & culture", description: "Street food, cooking classes and local life", vi: { name: "Ẩm thực & văn hóa", description: "Ẩm thực đường phố, lớp nấu ăn, đời sống bản địa" } },
  { slug: "cruises", group: "theme", icon: "ship", name: "Cruises", description: "Overnight cruises on Ha Long and Lan Ha Bay", vi: { name: "Du thuyền", description: "Du thuyền ngủ đêm trên vịnh Hạ Long, Lan Hạ" } },
];

export const posts = [
  { slug: "ha-giang-loop-guide", cat: "travel-tips", dest: "ha-giang", dur: "3-days", img: "ha-giang-2", tour: "ha-giang-loop-3-days-2-nights",
    title: "The Ha Giang Loop: a complete guide for first-timers", intro: "The Ha Giang Loop is the road trip travelers rave about long after they leave Vietnam. Here's how to plan it: when to go, how long you need, and whether to ride yourself or hire an easy rider.",
    vi: { title: "Cung đường Hà Giang: cẩm nang cho lần đầu", intro: "Cung đường Hà Giang là chuyến đi mà du khách nhắc mãi sau khi rời Việt Nam. Đây là cách lên kế hoạch: đi mùa nào, mất bao lâu, tự lái hay thuê xế." } },
  { slug: "what-to-eat-in-hoi-an", cat: "food", dest: "hoi-an", dur: "day-trip", img: "hoi-an-1", tour: "hoi-an-food-tour",
    title: "What to eat in Hoi An: 12 dishes and where to find them", intro: "Hoi An punches far above its size when it comes to food. From cao lau to the banh mi Anthony Bourdain called the best in the world, here's what to order and where.",
    vi: { title: "Ăn gì ở Hội An: 12 món và địa chỉ ngon", intro: "Hội An nhỏ nhưng ẩm thực rất đáng nể. Từ cao lầu đến bánh mì được Anthony Bourdain khen ngon nhất thế giới, đây là những món nên thử." } },
  { slug: "vietnam-itinerary-2-weeks", cat: "itineraries", dest: "hanoi", dur: "6-plus-days", img: "hanoi-2", tour: "15-days-tour-of-northern-vietnam",
    title: "The perfect two-week Vietnam itinerary, north to south", intro: "Two weeks is the sweet spot for a first trip to Vietnam: enough time for mountains, a night on Ha Long Bay, Hoi An's old town and the Mekong Delta, without rushing.",
    vi: { title: "Lịch trình Việt Nam 2 tuần lý tưởng từ Bắc vào Nam", intro: "Hai tuần là khoảng thời gian lý tưởng cho lần đầu đến Việt Nam: đủ cho núi rừng, một đêm trên vịnh Hạ Long, phố cổ Hội An và miền Tây." } },
  { slug: "vietnam-e-visa-guide", cat: "visa", dest: null, dur: null, img: "ho-chi-minh-city-1", tour: "15-days-tour-of-northern-vietnam",
    title: "Vietnam e-visa in 2026: who needs one and how to apply", intro: "Most visitors can now get a 90-day, multiple-entry e-visa online in about three working days. Here's who's exempt, what you'll need and how to avoid common mistakes.",
    vi: { title: "E-visa Việt Nam 2026: ai cần và cách xin", intro: "Hầu hết du khách có thể xin e-visa 90 ngày, nhiều lần trực tuyến trong khoảng 3 ngày làm việc. Đây là ai được miễn, cần gì và lỗi thường gặp." } },
  { slug: "best-day-trips-from-hanoi", cat: "travel-tips", dest: "ninh-binh", dur: "day-trip", img: "ninh-binh-2", tour: "a-full-day-tour-to-hoa-lu-mua-cave-trang-an",
    title: "8 of the best day trips from Hanoi", intro: "Hanoi is a brilliant base. Within three hours you can be rowing through karst caves, walking in a pottery village or standing on a mountain pass.",
    vi: { title: "8 tour trong ngày đáng đi nhất từ Hà Nội", intro: "Hà Nội là điểm xuất phát tuyệt vời. Trong vòng 3 giờ, bạn có thể đi thuyền xuyên hang, dạo làng gốm hay đứng trên đỉnh đèo." } },
  { slug: "choosing-a-ha-long-bay-cruise", cat: "travel-tips", dest: "ha-long-bay", dur: "2-days", img: "ha-long-bay-1", tour: "lotus-itinary-2d1n-of-cruise-on-lan-ha-bay",
    title: "How to choose a Ha Long Bay cruise (and avoid the crowds)", intro: "There are hundreds of boats on Ha Long Bay, and they are not all equal. Here's how to pick the right route, cabin and cruise length for your trip.",
    vi: { title: "Chọn du thuyền Hạ Long thế nào (và tránh đông đúc)", intro: "Có hàng trăm du thuyền trên vịnh Hạ Long và không phải tàu nào cũng như nhau. Đây là cách chọn tuyến, cabin và số đêm phù hợp." } },
];

export function postBody(lang, intro, place, tourSlug) {
  if (lang === "vi")
    return `${intro}

## Thời điểm lý tưởng
Mỗi mùa ở ${place} có vẻ đẹp riêng. Mùa khô dễ chịu, ít mưa; mùa lễ hội cho bạn những bức ảnh đẹp nhất.

## Di chuyển
- Limousine hoặc xe giường nằm: tiết kiệm, phù hợp nhóm bạn.
- Máy bay kết hợp xe đưa đón: nhanh, phù hợp gia đình có trẻ nhỏ.
- Tour trọn gói: không lo hậu cần, có hướng dẫn viên địa phương.

## Chi phí tham khảo
| Hạng mục | Tiết kiệm | Thoải mái |
|---|---|---|
| Lưu trú/đêm | 20 USD | 80 USD |
| Ăn uống/ngày | 10 USD | 30 USD |
| Di chuyển | 15 USD | 60 USD |

## Tour gợi ý
[[tour:${tourSlug}]]

## Lưu ý
- Đặt trước 2–3 tuần vào mùa cao điểm.
- Mang theo hộ chiếu bản gốc.
- Mua bảo hiểm du lịch trước chuyến đi.`;
  return `${intro}

## When to go
Every season in ${place} has its own appeal. The dry months bring clear skies and easy travel; festival season brings the best photos (and the biggest crowds).

## Getting there
- Limousine van or sleeper bus: the budget-friendly choice, great for groups of friends.
- Flight plus private transfer: fastest, and easiest with kids.
- A guided tour: no logistics to worry about, and a local guide who knows the shortcuts.

## What it costs
| Item | Budget | Comfortable |
|---|---|---|
| Accommodation per night | $20 | $80 |
| Food per day | $10 | $30 |
| Transport | $15 | $60 |

## Our recommended tour
[[tour:${tourSlug}]]

## Good to know
- Book two to three weeks ahead in peak season.
- Carry your passport; hotels need it at check-in.
- Get travel insurance before you travel.`;
}

export const templates = [
  ["booking_confirmation", "en", "Booking confirmation", "email", "Your AmGo booking {{code}} is confirmed", "Hi {{name}},\n\nThanks for booking with AmGo Travel! Here are your details:\n\nTour: {{tour}}\nDate: {{date}}\nTravelers: {{guests}}\nTotal: {{total}} (paid {{paid}})\n\nManage your booking: {{lookup_url}}\nQuestions? WhatsApp us at {{hotline}}.\n\nSee you soon,\nThe AmGo team"],
  ["booking_confirmation", "vi", "Xác nhận đặt tour", "email", "AmGo xác nhận booking {{code}}", "Chào {{name}},\n\nCảm ơn bạn đã đặt tour cùng AmGo Travel!\n\nTour: {{tour}}\nNgày đi: {{date}}\nSố khách: {{guests}}\nTổng: {{total}} (đã thanh toán {{paid}})\n\nTra cứu booking: {{lookup_url}}\nHotline: {{hotline}}"],
  ["booking_confirmation_chat", "en", "Booking confirmation (WhatsApp/SMS)", "whatsapp", null, "Hi {{name}}, your AmGo booking {{code}} for {{tour}} on {{date}} is confirmed. Manage it here: {{lookup_url}}"],
  ["booking_confirmation_chat", "vi", "Xác nhận đặt tour (Zalo/SMS)", "zalo", null, "AmGo xac nhan booking {{code}} tour {{tour}} ngay {{date}}. Tra cuu: {{lookup_url}}"],
  ["payment_reminder", "en", "Payment reminder", "email", "Your seats on {{tour}} are held until {{expires}}", "Hi {{name}}, we're holding your seats for booking {{code}} until {{expires}}. Complete payment here: {{pay_url}}"],
  ["payment_reminder", "vi", "Nhắc thanh toán", "email", "Booking {{code}} sắp hết hạn giữ chỗ", "Chào {{name}}, booking {{code}} được giữ chỗ đến {{expires}}. Thanh toán tại: {{pay_url}}"],
  ["abandoned_1h", "en", "Abandoned checkout (1 hour)", "email", "Still thinking about {{tour}}?", "Hi {{name}}, you were almost there! Your seats on {{tour}} are still available: {{pay_url}}"],
  ["abandoned_1h", "vi", "Nhắc hoàn tất (sau 1 giờ)", "email", "Bạn còn quan tâm tour {{tour}}?", "Chào {{name}}, bạn chưa hoàn tất đặt tour {{tour}}. Chỗ vẫn còn: {{pay_url}}"],
  ["abandoned_24h", "en", "Abandoned checkout (24 hours)", "whatsapp", null, "Hi {{name}}, seats for {{tour}} on {{date}} are filling up. Finish your booking: {{pay_url}}"],
  ["abandoned_24h", "vi", "Nhắc hoàn tất (sau 24 giờ)", "zalo", null, "AmGo: tour {{tour}} ngay {{date}} chi con it cho. Hoan tat dat tour: {{pay_url}}"],
  ["pre_trip_3d", "en", "Pre-trip reminder (3 days)", "email", "3 days to go: {{tour}}", "Hi {{name}}, your trip starts on {{date}}.\n\nMeeting point: {{meeting_point}}\nYour guide: {{guide}}\nWhat to bring: {{packing}}\n\nLocal tip: carry some small cash (VND) for markets and tips."],
  ["pre_trip_3d", "vi", "Nhắc trước 3 ngày", "email", "Còn 3 ngày nữa: {{tour}}", "Chào {{name}}, chuyến đi bắt đầu {{date}}.\nĐiểm hẹn: {{meeting_point}}\nHướng dẫn viên: {{guide}}\nCần mang: {{packing}}"],
  ["pre_trip_1d", "en", "Pre-trip reminder (1 day)", "whatsapp", null, "See you tomorrow, {{name}}! {{tour}} starts {{date}}. Meeting point: {{meeting_point}}. Guide: {{guide}}"],
  ["pre_trip_1d", "vi", "Nhắc trước 1 ngày", "zalo", null, "AmGo: ngay mai {{date}} khoi hanh {{tour}}. Diem hen: {{meeting_point}}. HDV: {{guide}}"],
  ["post_trip", "en", "Thank you & review request", "email", "Thanks for traveling with AmGo, {{name}}", "Hi {{name}}, we hope you loved {{tour}}! Would you share a quick review? {{review_url}}\n\nAs a thank-you, here's 5% off your next trip: {{coupon}}"],
  ["post_trip", "vi", "Cảm ơn & xin đánh giá", "email", "Cảm ơn bạn đã đồng hành cùng AmGo", "Chào {{name}}, cảm ơn bạn đã đi {{tour}}. Đánh giá tại {{review_url}} và nhận mã giảm 5%: {{coupon}}"],
  ["birthday", "en", "Birthday", "email", "Happy birthday, {{name}}!", "Happy birthday from all of us at AmGo! Here's 10% off any tour in the next 30 days: {{coupon}}"],
  ["birthday", "vi", "Chúc mừng sinh nhật", "email", "Chúc mừng sinh nhật {{name}}!", "AmGo chúc bạn sinh nhật vui vẻ! Tặng mã {{coupon}} giảm 10% trong 30 ngày."],
];
