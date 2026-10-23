import { usePathname } from "next/navigation";
import { useMemo } from "react";

export function useCurrentProduct() {
  const pathname = usePathname();

  const product = useMemo<"links" | "program" | null>(() => {
    const productParam = pathname.split("/")[2];
    if (productParam === "links") return "links";
    if (productParam === "program") return "program";
    return "program"; // default to program
  }, [pathname]);

  return { product };
}
