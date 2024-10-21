"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Button, ButtonProps } from "@dub/ui";
import { cn } from "@dub/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function ManageSubscriptionButton(props: ButtonProps) {
  const { id: workspaceId } = useWorkspace();
  const [clicked, setClicked] = useState(false);
  const router = useRouter();

  return (
    <Button
      {...props}
      text={props.text || "Manage Subscription"}
      variant={props.variant || "secondary"}
      className={cn(props.className, "h-9")}
      onClick={() => {
        setClicked(true);
        fetch(`/api/workspaces/${workspaceId}/billing/manage`, {
          method: "POST",
        }).then(async (res) => {
          if (res.ok) {
            const url = await res.json();
            console.log({ url });
            router.push(url);
          } else {
            const { error } = await res.json();
            toast.error(error.message);
            setClicked(false);
          }
        });
      }}
      loading={clicked}
    />
  );
}
