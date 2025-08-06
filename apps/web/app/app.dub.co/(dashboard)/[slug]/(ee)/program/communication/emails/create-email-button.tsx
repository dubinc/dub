"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import {
  Button,
  Megaphone,
  Modal,
  PaperPlane,
  useKeyboardShortcut,
  Workflow,
} from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { Dispatch, SetStateAction, useState } from "react";

export function CreateEmailButton() {
  const [isOpen, setIsOpen] = useState(false);

  useKeyboardShortcut("c", () => setIsOpen(true));

  return (
    <>
      <CreateEmailModal isOpen={isOpen} setIsOpen={setIsOpen} />
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        text="Create email"
        shortcut="C"
      />
    </>
  );
}

const emailTypes = [
  {
    type: "campaign",
    icon: Megaphone,
    name: "Campaign",
    description: "Sent once manually",
    colorClassName: "text-blue-700 bg-blue-100",
  },
  {
    type: "automation",
    icon: Workflow,
    name: "Automation",
    description: "Triggered by an event",
    colorClassName: "text-green-700 bg-green-100",
  },
];

function CreateEmailModal({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const { slug: workspaceSlug } = useWorkspace();

  return (
    <Modal showModal={isOpen} setShowModal={setIsOpen} className="sm:max-w-lg">
      <div className="p-4 sm:p-8">
        <div className="flex flex-col gap-6">
          <div className="border-border-subtle flex size-12 items-center justify-center rounded-full border">
            <PaperPlane className="text-content-default size-4" />
          </div>

          <div>
            <h2 className="text-content-emphasis text-lg font-semibold">
              Create email
            </h2>
            <p className="text-content-subtle text-base">
              Select the type of email to create
            </p>
          </div>

          <div className="xs:grid-cols-2 grid grid-cols-1 gap-4">
            {emailTypes.map(
              ({ type, icon: Icon, name, description, colorClassName }) => (
                <Link
                  key={type}
                  href={`/${workspaceSlug}/program/communication/emails/new?type=${type}`}
                  className="border-border-subtle flex flex-col items-center gap-5 rounded-xl border px-2 py-6 transition-[background-color,transform] hover:bg-neutral-50 active:scale-[0.98]"
                >
                  <div
                    className={cn(
                      "flex size-12 items-center justify-center rounded-lg",
                      colorClassName,
                    )}
                  >
                    <Icon className="size-5" />
                  </div>

                  <div className="text-content-default text-center">
                    <span className="text-sm font-semibold">{name}</span>
                    <p className="text-xs">{description}</p>
                  </div>
                </Link>
              ),
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
