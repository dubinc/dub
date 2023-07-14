"use client";

import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useEffect,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import ErrorPage from "next/error";
import useProject from "#/lib/swr/use-project";
import Cookies from "js-cookie";
import { useAddProjectModal } from "@/components/app/modals/add-project-modal";
import { useAcceptInviteModal } from "@/components/app/modals/accept-invite-modal";
import { useAddEditLinkModal } from "@/components/app/modals/add-edit-link-modal";
import { useImportLinksModal } from "@/components/app/modals/import-links-modal";
import { useAddEditDomainModal } from "@/components/app/modals/add-edit-domain-modal";
import { useGoogleOauthModal } from "@/components/app/modals/google-oauth-modal";
import { mutate } from "swr";
import { useRouter } from "next/router";
import { getQueryString } from "#/lib/utils";
import { useUpgradePlanModal } from "@/components/app/modals/upgrade-plan-modal";

export const ModalContext = createContext<{
  setShowAddProjectModal: Dispatch<SetStateAction<boolean>>;
  setShowAddEditDomainModal: Dispatch<SetStateAction<boolean>>;
  setShowAddEditLinkModal: Dispatch<SetStateAction<boolean>>;
  setShowUpgradePlanModal: Dispatch<SetStateAction<boolean>>;
  setShowImportLinksModal: Dispatch<SetStateAction<boolean>>;
  setPollLinks: Dispatch<SetStateAction<boolean>>;
}>({
  setShowAddProjectModal: () => {},
  setShowAddEditDomainModal: () => {},
  setShowAddEditLinkModal: () => {},
  setShowUpgradePlanModal: () => {},
  setShowImportLinksModal: () => {},
  setPollLinks: () => {},
});

export default function ModalProvider({ children }: { children: ReactNode }) {
  const { GoogleOauthModal, setShowGoogleOauthModal } = useGoogleOauthModal();
  const { AddProjectModal, setShowAddProjectModal } = useAddProjectModal();
  const { AcceptInviteModal, setShowAcceptInviteModal } =
    useAcceptInviteModal();
  const { setShowAddEditDomainModal, AddEditDomainModal } =
    useAddEditDomainModal({});

  const { setShowAddEditLinkModal, AddEditLinkModal } = useAddEditLinkModal();
  const { setShowUpgradePlanModal, UpgradePlanModal } = useUpgradePlanModal();
  const { setShowImportLinksModal, ImportLinksModal } = useImportLinksModal();

  const { error, loading } = useProject();
  const { data: session } = useSession();

  const router = useRouter();
  const { slug } = router.query;

  // special link polling setup to poll links as they're being created (for bitly import)
  const [pollLinks, setPollLinks] = useState(false);
  useEffect(() => {
    if (pollLinks) {
      // if pollLinks is true, start polling links endpoint every 500 ms (stop after 20 seconds)
      const pollingInterval = setInterval(() => {
        mutate(`/api/links${getQueryString(router)}`);
        mutate(`/api/projects/${slug}/tags`);
        mutate(
          (key) =>
            typeof key === "string" && key.startsWith(`/api/links/_count`),
          undefined,
          { revalidate: true },
        );
      }, 500);
      setTimeout(() => {
        setPollLinks(false);
        clearInterval(pollingInterval);
      }, 20000);
    }
  }, [pollLinks]);

  // handle invite and oauth modals
  useEffect(() => {
    if (error && (error.status === 409 || error.status === 410)) {
      setShowAcceptInviteModal(true);
    } else if (
      !loading &&
      session?.user?.email &&
      !session.user?.name &&
      !Cookies.get("hideGoogleOauthModal")
    ) {
      setShowGoogleOauthModal(true);
    }
  }, [error, session]);

  if (error && error.status === 404) {
    return <ErrorPage statusCode={404} />;
  }
  return (
    <ModalContext.Provider
      value={{
        setShowAddProjectModal,
        setShowAddEditDomainModal,
        setShowAddEditLinkModal,
        setShowUpgradePlanModal,
        setShowImportLinksModal,
        setPollLinks,
      }}
    >
      <GoogleOauthModal />
      <AddProjectModal />
      {error && (error.status === 409 || error.status === 410) && (
        <AcceptInviteModal />
      )}
      <AddEditDomainModal />
      <AddEditLinkModal />
      <UpgradePlanModal />
      <ImportLinksModal />
      {children}
    </ModalContext.Provider>
  );
}
