"use client";

import { createDotsFlow } from "@/lib/dots/create-dots-flow";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button } from "@dub/ui";
import { useState } from "react";

export const PayoutSettings = () => {
  const { id: workspaceId } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateFlow = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/affiliates/flows?workspaceId=${workspaceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ affiliateId: "xxx" }),
      });

      if (!response.ok) {
        throw new Error("Failed to create flow");
      }

      const data = await response.json();
      window.location.href = data.link;
    } catch (error) {
      console.error("Error creating flow:", error);
      // Handle error (e.g., show an error message to the user)
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h3>Payout settings</h3>
      <Button
        text="Manage payout settings"
        className="w-fit"
        onClick={handleCreateFlow}
        loading={isLoading}
      />
    </div>
  );
};
