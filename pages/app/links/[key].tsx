import ErrorPage from "next/error";
import AppLayout from "@/components/layout/app";
import Stats from "@/components/stats";
import useLink from "#/lib/swr/use-link";

export default function StatsPage() {
  const { loading, error } = useLink();

  // if not owner, show 404 page
  if (error && error.status === 404) {
    return <ErrorPage statusCode={404} />;
  }

  return <AppLayout>{!loading && !error && <Stats />}</AppLayout>;
}
