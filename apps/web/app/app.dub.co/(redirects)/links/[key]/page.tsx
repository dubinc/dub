import { redirect } from "next/navigation";

export default function OldLinksStatsPage({
  params,
}: {
  params: {
    key: string;
  };
}) {
  redirect(`/analytics?domain=dub.sh&key=${params.key}`);
}
