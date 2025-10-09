"use client";

import { TokenProps } from "@/lib/types";
import { useAddEditTokenModal } from "@/ui/modals/add-edit-token-modal";
import { useTokenCreatedModal } from "@/ui/modals/token-created-modal";
import { useState } from "react";

export function CreateTokenButton() {
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [_selectedToken, setSelectedToken] = useState<TokenProps | null>(null);

  const { TokenCreatedModal, setShowTokenCreatedModal } = useTokenCreatedModal({
    token: createdToken || "",
  });

  const onTokenCreated = (token: string) => {
    setCreatedToken(token);
    setShowTokenCreatedModal(true);
  };

  const { AddTokenButton, AddEditTokenModal } = useAddEditTokenModal({
    onTokenCreated,
    setSelectedToken,
  });

  return (
    <>
      <TokenCreatedModal />
      <AddEditTokenModal />
      <AddTokenButton />
    </>
  );
}
