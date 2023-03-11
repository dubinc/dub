import ErrorPage from "next/error";
import AppLayout from "@/components/layout/app";
import Stats from "@/components/stats";
import useLink from "@/lib/swr/use-link";

export default function StatsPage() {
  const { isOwner } = useLink();

  // if not owner, show 404 page
  if (!isOwner) {
    return <ErrorPage statusCode={404} />;
  }

  return (
    <AppLayout>
      <Stats />
    </AppLayout>
  );
}
