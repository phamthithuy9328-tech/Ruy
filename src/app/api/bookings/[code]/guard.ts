import { cookies } from "next/headers";
import { checkoutCookie, checkoutToken, safeEqual } from "@/lib/tokens";

/** Only the browser that created the booking (or a manage-booking lookup) may price/pay it */
export async function canCheckout(code: string) {
  const c = (await cookies()).get(checkoutCookie(code))?.value;
  return !!c && safeEqual(c, checkoutToken(code));
}
