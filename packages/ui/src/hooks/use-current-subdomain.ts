import { ADMIN_HOSTNAMES, APP_HOSTNAMES, PARTNERS_HOSTNAMES } from "@dub/utils";
import { useEffect, useState } from "react";

export function useCurrentSubdomain() {
  const [subdomain, setSubdomain] = useState<
    "app" | "partners" | "admin" | null
  >(null);
  useEffect(() => {
    const hostname = window.location.hostname;
    if (APP_HOSTNAMES.has(hostname)) {
      setSubdomain("app");
    } else if (PARTNERS_HOSTNAMES.has(hostname)) {
      setSubdomain("partners");
    } else if (ADMIN_HOSTNAMES.has(hostname)) {
      setSubdomain("admin");
    }
  }, []);

  return { subdomain };
}
