import { redirect } from "next/navigation";
import { ALLOWED_REGIONS } from "../../../../../constants/links.ts";

export default function Page({ params }: { params: { region: string } }) {
  if (!ALLOWED_REGIONS.includes(params.region.toLowerCase())) {
    redirect("/");
  }

  redirect("/bill");
}
