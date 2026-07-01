import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function useCurrentProduct() {
  const pathname = usePathname();
  const [product, setProduct] = useState<"links" | "program" | null>(null);

  useEffect(() => {
    const productParam = pathname.split("/")[2];
    if (productParam === "links") {
      setProduct("links");
    } else if (productParam === "program") {
      setProduct("program");
    }
  }, [pathname]);

  return { product };
}
