"use client";

import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useEffect,
} from "react";
import { useSession } from "next-auth/react";
import ErrorPage from "next/error";
import useProject from "#/lib/swr/use-project";
import Cookies from "js-cookie";
import { useAddProjectModal } from "@/components/app/modals/add-project-modal";
import { useAcceptInviteModal } from "@/components/app/modals/accept-invite-modal";
import { useAddEditDomainModal } from "@/components/app/modals/add-edit-domain-modal";
import { useGoogleOauthModal } from "@/components/app/modals/google-oauth-modal";

export const ModalContext = createContext<{
  setShowAddProjectModal: Dispatch<SetStateAction<boolean>>;
  setShowAddEditDomainModal: Dispatch<SetStateAction<boolean>>;
}>({
  setShowAddProjectModal: () => {},
  setShowAddEditDomainModal: () => {},
});

export default function ModalProvider({ children }: { children: ReactNode }) {
  const { GoogleOauthModal, setShowGoogleOauthModal } = useGoogleOauthModal();
  const { AddProjectModal, setShowAddProjectModal } = useAddProjectModal();
  const { AcceptInviteModal, setShowAcceptInviteModal } =
    useAcceptInviteModal();
  const { setShowAddEditDomainModal, AddEditDomainModal } =
    useAddEditDomainModal({});

  const { error, loading } = useProject();
  const { data: session } = useSession();

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
      }}
    >
      <GoogleOauthModal />
      <AddProjectModal />
      {error && (error.status === 409 || error.status === 410) && (
        <AcceptInviteModal />
      )}
      <AddEditDomainModal />
      {children}
    </ModalContext.Provider>
  );
}
