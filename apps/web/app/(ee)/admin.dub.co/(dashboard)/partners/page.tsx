import { redirect } from "next/navigation";

export default function AdminPartnersPage() {
  redirect("/partners/network?networkStatus=submitted");
}
