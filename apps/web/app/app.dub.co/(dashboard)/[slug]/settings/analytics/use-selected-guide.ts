import { IntegrationGuide } from "@/ui/guides/integrations";
import { useRouterStuff } from "@dub/ui";
import { useEffect, useState } from "react";

export function useSelectedGuide({ guides }: { guides: IntegrationGuide[] }) {
  const { searchParams, queryParams } = useRouterStuff();
  const paramGuide = searchParams.get("guide");

  if (guides.length === 0)
    throw new Error("useSelectedGuide requires a non-empty guides array");

  const [selectedGuide, setSelectedGuide] = useState<IntegrationGuide>(
    guides[0],
  );

  useEffect(() => {
    if (!paramGuide) return;

    const guide = guides.find((g) => g.key === paramGuide);
    if (!guide) return;

    setSelectedGuide(guide);
  }, [paramGuide, guides]);

  return {
    selectedGuide,
    setSelectedGuide: (guide: IntegrationGuide) =>
      queryParams({ set: { guide: guide.key }, scroll: false }),
  };
}
