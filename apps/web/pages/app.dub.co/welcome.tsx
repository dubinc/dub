import { useAddEditLinkModal } from "@/components/app/modals/add-edit-link-modal";
import { useAddProjectModal } from "@/components/app/modals/add-project-modal";
import { useUpgradePlanModal } from "@/components/app/modals/upgrade-plan-modal";
import Interim from "@/components/app/welcome/interim";
import Intro from "@/components/app/welcome/intro";
import Meta from "@/components/layout/meta";
import { Background } from "@dub/ui";
import va from "@vercel/analytics";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Welcome() {
  const { setShowAddProjectModal, AddProjectModal } = useAddProjectModal();
  const { setShowAddEditLinkModal, AddEditLinkModal } = useAddEditLinkModal();
  const { setShowUpgradePlanModal, UpgradePlanModal } = useUpgradePlanModal();

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
    if (router.query.type === "upgrade") {
      setTimeout(() => {
        setShowUpgradePlanModal(true);
      }, 200);
    } else {
      setShowUpgradePlanModal(false);
    }
  }, [router.query.type]);

  return (
    <div className="flex h-screen flex-col items-center">
      <Meta title="Welcome to Dub" />
      <Background />
      <AddProjectModal />
      <AddEditLinkModal />
      <UpgradePlanModal />
      <AnimatePresence mode="wait">
        {!router.query.type && <Intro key="intro" />}
        {router.query.type === "interim" && (
          <>
            <button
              className="group fixed left-10 top-10 z-[99] rounded-full p-2 transition-all hover:bg-gray-100"
              onClick={() => router.back()}
            >
              <ArrowLeft
                size={20}
                className="text-gray-500 group-hover:text-gray-700 group-active:scale-90"
              />
            </button>
            <Interim key="interim" />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
