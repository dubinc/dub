import AppLayout from "@/components/layout/app";
import useProject from "#/lib/swr/use-project";
import Analytics from "@/components/analytics";

export default function StatsPage() {
  const { exceededUsage } = useProject();

  return (
    <AppLayout>
      <Analytics exceededUsage={exceededUsage} />
    </AppLayout>
  );
}
