import { notFound } from "next/navigation";
// Any unknown URL renders the localized 404 (with search and popular tours)
export default function Missing() {
  notFound();
}
