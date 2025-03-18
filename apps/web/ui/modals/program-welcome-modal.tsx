import { Button, Modal, useRouterStuff, useScrollProgress } from "@dub/ui";
import { STAGGER_CHILD_VARIANTS } from "@dub/utils";
import { motion } from "framer-motion";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircleFill } from "../shared/icons";
import { ModalHero } from "../shared/modal-hero";

const NEXT_STEPS = [
  {
    text: "Set up a bank account for payouts",
    href: "https://dub.co/help/article/how-to-set-up-bank-account",
  },
  {
    text: "Create custom rewards for your partners",
    href: "https://dub.co/help/article/partner-rewards",
  },
  {
    text: "Create dual-sided incentives",
    href: "https://dub.co/help/article/dual-sided-incentives",
  },
  {
    text: "Invite more partners to your program",
    href: "https://dub.co/help/article/inviting-partners",
  },
  {
    text: "Set up a program application form",
    href: "https://dub.co/help/article/inviting-partners#via-a-branded-application-form",
  },
];

function ProgramWelcomeModal({
  showProgramWelcomeModal,
  setShowProgramWelcomeModal,
}: {
  showProgramWelcomeModal: boolean;
  setShowProgramWelcomeModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { queryParams } = useRouterStuff();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  return (
    <Modal
      showModal={showProgramWelcomeModal}
      setShowModal={setShowProgramWelcomeModal}
      onClose={() =>
        queryParams({
          del: ["program-onboarded"],
        })
      }
    >
      <div className="flex flex-col">
        <ModalHero />
        <div className="px-6 py-8 sm:px-12">
          <div className="relative">
            <div
              ref={scrollRef}
              onScroll={updateScrollProgress}
              className="scrollbar-hide grid max-h-[calc(100vh-350px)] gap-4 overflow-y-auto pb-4"
            >
              <h1 className="text-lg font-medium text-neutral-950">
                Welcome to your partner program
              </h1>
              <p className="text-sm text-neutral-500">
                You're now ready to start growing your revenue on autopilot with
                your partners.
              </p>
              <p className="text-sm text-neutral-500">
                To get started, here are some next steps:
              </p>
              <motion.div
                variants={{
                  show: {
                    transition: {
                      staggerChildren: 0.08,
                    },
                  },
                }}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-2 pb-2"
              >
                {NEXT_STEPS.map((step, idx) => (
                  <motion.a
                    key={idx}
                    variants={STAGGER_CHILD_VARIANTS}
                    href={step.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-neutral-500 underline decoration-dotted"
                  >
                    <CheckCircleFill className="h-5 w-5 text-green-500" />
                    <p>{step.text}</p>
                  </motion.a>
                ))}
              </motion.div>
            </div>

            <div
              className="pointer-events-none absolute bottom-0 left-0 hidden h-16 w-full bg-gradient-to-t from-white sm:block"
              style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
            />
          </div>

          <Button
            type="button"
            variant="primary"
            text="Get started"
            className="mt-2"
            onClick={() =>
              queryParams({
                del: ["onboarded-program"],
              })
            }
          />
        </div>
      </div>
    </Modal>
  );
}

export function useProgramWelcomeModal() {
  const [showProgramWelcomeModal, setShowProgramWelcomeModal] = useState(false);

  const ProgramWelcomeModalCallback = useCallback(() => {
    return (
      <ProgramWelcomeModal
        showProgramWelcomeModal={showProgramWelcomeModal}
        setShowProgramWelcomeModal={setShowProgramWelcomeModal}
      />
    );
  }, [showProgramWelcomeModal, setShowProgramWelcomeModal]);

  return useMemo(
    () => ({
      setShowProgramWelcomeModal,
      ProgramWelcomeModal: ProgramWelcomeModalCallback,
    }),
    [setShowProgramWelcomeModal, ProgramWelcomeModalCallback],
  );
}
