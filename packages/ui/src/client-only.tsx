import { ReactNode, useEffect, useState } from "react";

export const ClientOnly = ({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) => {
  const [clientReady, setClientReady] = useState<boolean>(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  return clientReady ? children : fallback || null;
};
