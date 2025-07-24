"use client";

import { setPartnerStackTokenAction } from "@/lib/actions/partners/set-partnerstack-token";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Input } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export const ImportPartnerStackForm = ({
  onSuccess,
}: {
  onSuccess: () => void;
}) => {
  const { id: workspaceId } = useWorkspace();
  const [publicKey, setPublicKey] = useState("");
  const [secretKey, setSecretKey] = useState("");

  const { executeAsync, isPending } = useAction(setPartnerStackTokenAction, {
    onSuccess: () => {
      onSuccess();
      toast.success("PartnerStack credentials saved successfully!");
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async () => {
    if (!workspaceId || !publicKey || !secretKey) {
      toast.error("Please fill in all required fields.");
      return;
    }

    await executeAsync({
      workspaceId,
      publicKey,
      secretKey,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-neutral-800">
          PartnerStack Public Key
        </label>
        <Input
          type="password"
          placeholder="Public key"
          className="mt-2 max-w-full"
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
        />
        <div className="mt-2 text-xs font-normal leading-[1.1] text-neutral-600">
          Find your PartnerStack API keys in your{" "}
          <Link
            href="https://app.partnerstack.com/settings/integrations"
            className="underline decoration-solid decoration-auto underline-offset-auto"
            target="_blank"
            rel="noopener noreferrer"
          >
            Settings
          </Link>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-800">
          PartnerStack Secret Key
        </label>
        <Input
          type="password"
          placeholder="Secret key"
          className="mt-2 max-w-full"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
        />
      </div>

      <Button
        text="Continue"
        className="w-full"
        disabled={!publicKey || !secretKey}
        loading={isPending}
        onClick={onSubmit}
      />
    </div>
  );
};
