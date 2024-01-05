"use client";

import { ModalContext } from "@/ui/modals/provider";
import { useContext } from "react";

export default function CreateProjectButton() {
  const { setShowAddProjectModal } = useContext(ModalContext);
  return (
    <button
      onClick={() => setShowAddProjectModal(true)}
      className="rounded-md border border-black bg-black px-5 py-2 text-sm font-medium text-white transition-all duration-75 hover:bg-white hover:text-black active:scale-95"
    >
      Create project
    </button>
  );
}
