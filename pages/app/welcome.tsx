import { useRouter } from "next/router";
import Background from "@/components/shared/background";
import Intro from "@/components/app/welcome/intro";
import Interim from "@/components/app/welcome/interim";
import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useAddProjectModal } from "@/components/app/modals/add-project-modal";
import { useAddEditLinkModal } from "@/components/app/modals/add-edit-link-modal";
import Meta from "@/components/layout/meta";
import va from "@vercel/analytics";

export default function Welcome() {
  const { setShowAddProjectModal, AddProjectModal } = useAddProjectModal({
    closeWithX: true,
  });
  const { setShowAddEditLinkModal, AddEditLinkModal } = useAddEditLinkModal({
    hideXButton: true,
  });

  const router = useRouter();

  useEffect(() => {
    va.track("Sign Up");
  }, []);

  useEffect(() => {
    if (router.query.type === "project") {
      setTimeout(() => {
        setShowAddProjectModal(true);
      }, 200);
    } else {
      setShowAddProjectModal(false);
    }
    if (router.query.type === "link") {
      setTimeout(() => {
        setShowAddEditLinkModal(true);
      }, 200);
    } else {
      setShowAddEditLinkModal(false);
    }
  }, [router.query.type]);

  return (
    <div className="flex h-screen flex-col items-center">
      <Meta title="Welcome to Dub" />
      <Background />
      <AddProjectModal />
      <AddEditLinkModal />
      <AnimatePresence mode="wait">
        {!router.query.type && <Intro key="intro" />}
        {router.query.type === "interim" && <Interim key="interim" />}
      </AnimatePresence>
    </div>
  );
}
