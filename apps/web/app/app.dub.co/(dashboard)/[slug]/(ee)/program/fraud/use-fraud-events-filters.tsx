import { useRouterStuff } from "@dub/ui";
import { CircleDotted, ShieldKeyhole } from "@dub/ui/icons";
import { useMemo } from "react";

export function useFraudEventsFilters() {
  const { searchParamsObj, queryParams } = useRouterStuff();

  const filters = useMemo(
    () => [
      {
        key: "status",
        icon: CircleDotted,
        label: "Status",
        options: [
          { label: "Pending", value: "pending" },
          { label: "Safe", value: "safe" },
          { label: "Banned", value: "banned" },
        ],
      },
      {
        key: "riskLevel",
        icon: ShieldKeyhole,
        label: "Risk Level",
        options: [
          { label: "High", value: "high" },
          { label: "Medium", value: "medium" },
          { label: "Low", value: "low" },
        ],
      },
    ],
    [],
  );

  const activeFilters = useMemo(() => {
    const { status, riskLevel } = searchParamsObj;

    return [
      ...(status ? [{ key: "status", value: status }] : []),
      ...(riskLevel ? [{ key: "riskLevel", value: riskLevel }] : []),
    ];
  }, [searchParamsObj]);

  const onSelect = (key: string, value: any) =>
    queryParams({
      set: {
        [key]: value,
      },
      del: "page",
      scroll: false,
    });

  const onRemove = (key: string, _value?: any) =>
    queryParams({
      del: [key, "page"],
      scroll: false,
    });

  const onRemoveAll = () =>
    queryParams({
      del: ["status", "riskLevel", "page"],
      scroll: false,
    });

  const isFiltered = activeFilters.length > 0;

  return {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveAll,
    isFiltered,
  };
}
