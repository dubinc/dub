"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Button } from "@dub/ui/src/button";
import { useEffect, useState } from "react";

export default function ConnectStripeButton() {
  const { id: workspaceId } = useWorkspace();

  const [redirecting, setRedirecting] = useState(false);

  const redirectToStripe = async () => {
    setRedirecting(true);
    const response = await fetch(
      `/api/campaigns/connect-stripe?workspaceId=${workspaceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const { url } = await response.json();

    window.location.href = url;
  };

  useEffect(() => {
    // when leave page, reset state
    return () => {
      setRedirecting(false);
    };
  }, []);

  return (
    <Button
      text="Connect to Stripe"
      loading={redirecting}
      onClick={redirectToStripe}
      className="max-w-xs"
    />
  );
}
