import useLink from "#/lib/swr/use-link";
import Stats from "@/components/stats";
import ErrorPage from "next/error";

export default function StatsPage() {
  const { loading, error } = useLink();

  // if not owner, show 404 page
  if (error && error.status === 404) {
    return <ErrorPage statusCode={404} />;
  }

  return !loading && !error && <Stats />;
}
