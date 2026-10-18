// Business details: set via environment variables (see .env.example).
export const site = {
  name: "AmGo Travel",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  hotline: process.env.NEXT_PUBLIC_HOTLINE ?? "+84 900 000 000",
  hotlineTel: (process.env.NEXT_PUBLIC_HOTLINE ?? "+84900000000").replace(/\s/g, ""),
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_URL ?? "https://wa.me/84900000000",
  zalo: process.env.NEXT_PUBLIC_ZALO_URL ?? "https://zalo.me/0900000000",
  messenger: process.env.NEXT_PUBLIC_MESSENGER_URL ?? "https://m.me/amgotravel",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "booking@amgotravel.com",
  address: process.env.NEXT_PUBLIC_ADDRESS ?? "[Office address], Hanoi, Vietnam",
  company: process.env.NEXT_PUBLIC_COMPANY_NAME ?? "[Registered company name]",
  businessLicense: process.env.NEXT_PUBLIC_BUSINESS_LICENSE ?? "[Business registration no.]",
  travelLicense: process.env.NEXT_PUBLIC_TRAVEL_LICENSE ?? "[International tour operator license no.]",
  social: {
    facebook: "https://facebook.com/amgotravel",
    youtube: "https://youtube.com/@amgotravel",
    tiktok: "https://tiktok.com/@amgotravel",
  },
};
