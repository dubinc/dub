import Background from "@/components/shared/background";
import Intro from "@/components/app/welcome/intro";
import Interim from "@/components/app/welcome/interim";
import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useAddProjectModal } from "@/components/app/modals/add-project-modal";
import { useAddEditLinkModal } from "@/components/app/modals/add-edit-link-modal";
import Meta from "@/components/layout/meta";

export default function Welcome() {
  const [state, setState] = useState("intro");

  const { setShowAddProjectModal, AddProjectModal } = useAddProjectModal({
    closeWithX: true,
  });
  const { setShowAddEditLinkModal, AddEditLinkModal } = useAddEditLinkModal({
    hideXButton: true,
  });

  useEffect(() => {
    if (state === "project") {
      setTimeout(() => {
        setShowAddProjectModal(true);
      }, 200);
    }
    if (state === "link") {
      setTimeout(() => {
        setShowAddEditLinkModal(true);
      }, 200);
    }
  }, [state]);

  return (
    <div className="flex h-screen flex-col items-center">
      <Meta title="Welcome to Dub" />
      <Background />
      <AddProjectModal />
      <AddEditLinkModal />
      <AnimatePresence mode="wait">
        {state === "intro" && <Intro key="intro" setState={setState} />}
        {state === "interim" && <Interim key="interim" setState={setState} />}
      </AnimatePresence>
    </div>
  );
}
