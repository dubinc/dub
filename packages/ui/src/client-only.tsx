import { ReactNode, useEffect, useState } from "react";

export const ClientOnly = ({ children }: { children: ReactNode }) => {
  const [clientReady, setClientReady] = useState<boolean>(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  return clientReady ? <>{children}</> : null;
};
