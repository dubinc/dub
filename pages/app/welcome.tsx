import Background from "@/components/shared/background";
import Intro from "@/components/app/welcome/intro";
import Interim from "@/components/app/welcome/interim";
import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useAddProjectModal } from "@/components/app/modals/add-project-modal";
import { useAddEditLinkModal } from "@/components/app/modals/add-edit-link-modal";

const staggerChildVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, type: "spring" } },
};

export default function Welcome() {
  const [state, setState] = useState("interim");

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
      <Background />
      <AddProjectModal />
      <AddEditLinkModal />
      <AnimatePresence mode="wait">
        {state === "intro" && (
          <Intro
            key="intro"
            setState={setState}
            staggerChildVariants={staggerChildVariants}
          />
        )}
        {state === "interim" && (
          <Interim
            key="interim"
            setState={setState}
            staggerChildVariants={staggerChildVariants}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
