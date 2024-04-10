"use client";

import { AddWorkspaceModalHelper } from "@/ui/modals/add-workspace-modal";
import { Responsive } from "@dub/ui";
import { createPushModal } from "pushmodal";
import { AddEditLinkModal } from "./add-edit-link-modal";
import { CompleteSetup } from "./complete-setup-modal";

export const {
  pushModal,
  replaceWithModal,
  popModal,
  popAllModals,
  ModalProvider,
  onPushModal,
  useOnPushModal,
} = createPushModal({
  modals: {
    AddWorkspace: {
      Component: AddWorkspaceModalHelper,
      Wrapper: Responsive.Wrapper,
    },
    CompleteSetup: {
      Component: CompleteSetup,
      Wrapper: Responsive.Wrapper,
    },
    AddEditLink: {
      Component: AddEditLinkModal,
      Wrapper: Responsive.Wrapper,
    },
  },
});
