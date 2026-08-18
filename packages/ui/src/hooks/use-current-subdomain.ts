import { ADMIN_HOSTNAMES, PARTNERS_HOSTNAMES } from "@dub/utils";
import { useEffect, useState } from "react";

export function useCurrentSubdomain() {
  const [subdomain, setSubdomain] = useState<
    "app" | "partners" | "admin" | null
  >(null);
  useEffect(() => {
    const hostname = window.location.hostname;
    if (PARTNERS_HOSTNAMES.has(hostname)) {
      setSubdomain("partners");
    } else if (ADMIN_HOSTNAMES.has(hostname)) {
      setSubdomain("admin");
    } else {
      setSubdomain("app");
    }
  }, []);

  return { subdomain };
}
