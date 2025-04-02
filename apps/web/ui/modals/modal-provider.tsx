"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import useWorkspaces from "@/lib/swr/use-workspaces";
import { SimpleLinkProps } from "@/lib/types";
import { useAcceptInviteModal } from "@/ui/modals/accept-invite-modal";
import { useAddEditDomainModal } from "@/ui/modals/add-edit-domain-modal";
import { useAddWorkspaceModal } from "@/ui/modals/add-workspace-modal";
import { useImportBitlyModal } from "@/ui/modals/import-bitly-modal";
import { useImportCsvModal } from "@/ui/modals/import-csv-modal";
import { useImportShortModal } from "@/ui/modals/import-short-modal";
import { useCookies } from "@dub/ui";
import { DEFAULT_LINK_PROPS, getUrlFromString } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  Suspense,
  createContext,
  useEffect,
  useMemo,
} from "react";
import { toast } from "sonner";
import { useAddEditTagModal } from "./add-edit-tag-modal";
import { useImportRebrandlyModal } from "./import-rebrandly-modal";
import { useImportRewardfulModal } from "./import-rewardful-modal";
import { useLinkBuilder } from "./link-builder";
import { useProgramWelcomeModal } from "./program-welcome-modal";
import { useWelcomeModal } from "./welcome-modal";

export const ModalContext = createContext<{
  setShowAddWorkspaceModal: Dispatch<SetStateAction<boolean>>;
  setShowAddEditDomainModal: Dispatch<SetStateAction<boolean>>;
  setShowLinkBuilder: Dispatch<SetStateAction<boolean>>;
  setShowAddEditTagModal: Dispatch<SetStateAction<boolean>>;
  setShowImportBitlyModal: Dispatch<SetStateAction<boolean>>;
  setShowImportShortModal: Dispatch<SetStateAction<boolean>>;
  setShowImportRebrandlyModal: Dispatch<SetStateAction<boolean>>;
  setShowImportCsvModal: Dispatch<SetStateAction<boolean>>;
  setShowImportRewardfulModal: Dispatch<SetStateAction<boolean>>;
}>({
  setShowAddWorkspaceModal: () => {},
  setShowAddEditDomainModal: () => {},
  setShowLinkBuilder: () => {},
  setShowAddEditTagModal: () => {},
  setShowImportBitlyModal: () => {},
  setShowImportShortModal: () => {},
  setShowImportRebrandlyModal: () => {},
  setShowImportCsvModal: () => {},
  setShowImportRewardfulModal: () => {},
});

export function ModalProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <ModalProviderClient>{children}</ModalProviderClient>
    </Suspense>
  );
}

function ModalProviderClient({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const newLinkValues = useMemo(() => {
    const newLink = searchParams.get("newLink");
    if (newLink && getUrlFromString(newLink)) {
      return {
        url: getUrlFromString(newLink),
        domain: searchParams.get("newLinkDomain"),
      };
    } else {
      return null;
    }
  }, [searchParams]);

  const { AddWorkspaceModal, setShowAddWorkspaceModal } =
    useAddWorkspaceModal();
  const { AcceptInviteModal, setShowAcceptInviteModal } =
    useAcceptInviteModal();
  const { setShowAddEditDomainModal, AddEditDomainModal } =
    useAddEditDomainModal();
  const { setShowLinkBuilder, LinkBuilder } = useLinkBuilder(
    newLinkValues?.url
      ? {
          duplicateProps: {
            ...DEFAULT_LINK_PROPS,
            ...(newLinkValues.domain && { domain: newLinkValues.domain }),
            url: newLinkValues.url === "true" ? "" : newLinkValues.url,
          },
        }
      : {},
  );
  const { setShowAddEditTagModal, AddEditTagModal } = useAddEditTagModal();
  const { setShowImportBitlyModal, ImportBitlyModal } = useImportBitlyModal();
  const { setShowImportShortModal, ImportShortModal } = useImportShortModal();
  const { setShowImportRebrandlyModal, ImportRebrandlyModal } =
    useImportRebrandlyModal();
  const { setShowImportCsvModal, ImportCsvModal } = useImportCsvModal();
  const { setShowWelcomeModal, WelcomeModal } = useWelcomeModal();
  const { setShowProgramWelcomeModal, ProgramWelcomeModal } =
    useProgramWelcomeModal();
  const { setShowImportRewardfulModal, ImportRewardfulModal } =
    useImportRewardfulModal();

  useEffect(() => {
    setShowProgramWelcomeModal(searchParams.has("onboarded-program"));
    setShowWelcomeModal(
      searchParams.has("onboarded") || searchParams.has("upgraded"),
    );
  }, [searchParams]);

  const [hashes, setHashes] = useCookies<SimpleLinkProps[]>("hashes__dub", [], {
    domain: !!process.env.NEXT_PUBLIC_VERCEL_URL ? ".dub.co" : undefined,
  });

  const { id: workspaceId, error } = useWorkspace();

  useEffect(() => {
    if (hashes.length > 0 && workspaceId) {
      toast.promise(
        fetch(`/api/links/sync?workspaceId=${workspaceId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(hashes),
        }).then(async (res) => {
          if (res.status === 200) {
            await mutatePrefix("/api/links");
            setHashes([]);
          }
        }),
        {
          loading: "Importing links...",
          success: "Links imported successfully!",
          error: "Something went wrong while importing links.",
        },
      );
    }
  }, [hashes, workspaceId]);

  // handle invite and oauth modals
  useEffect(() => {
    if (error && (error.status === 409 || error.status === 410)) {
      setShowAcceptInviteModal(true);
    }
  }, [error]);

  // handle ?newWorkspace and ?newLink query params
  useEffect(() => {
    if (searchParams.has("newWorkspace")) {
      setShowAddWorkspaceModal(true);
    }
    if (searchParams.has("newLink")) {
      setShowLinkBuilder(true);
    }
  }, []);

  const { data: session, update } = useSession();
  const { workspaces } = useWorkspaces();

  // if user has workspaces but no defaultWorkspace, refresh to get defaultWorkspace
  useEffect(() => {
    if (
      workspaces &&
      workspaces.length > 0 &&
      session?.user &&
      !session.user["defaultWorkspace"]
    ) {
      fetch("/api/user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          defaultWorkspace: workspaces[0].slug,
        }),
      }).then(() => update());
    }
  }, [session]);

  return (
    <ModalContext.Provider
      value={{
        setShowAddWorkspaceModal,
        setShowAddEditDomainModal,
        setShowLinkBuilder,
        setShowAddEditTagModal,
        setShowImportBitlyModal,
        setShowImportShortModal,
        setShowImportRebrandlyModal,
        setShowImportCsvModal,
        setShowImportRewardfulModal,
      }}
    >
      <AddWorkspaceModal />
      <AcceptInviteModal />
      <AddEditDomainModal />
      <LinkBuilder />
      <AddEditTagModal />
      <ImportBitlyModal />
      <ImportShortModal />
      <ImportRebrandlyModal />
      <ImportCsvModal />
      <ImportRewardfulModal />
      <WelcomeModal />
      <ProgramWelcomeModal />
      {children}
    </ModalContext.Provider>
  );
}
