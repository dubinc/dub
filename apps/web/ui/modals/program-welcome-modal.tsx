import useProgram from "@/lib/swr/use-program";
import { Button, Modal, useRouterStuff, useScrollProgress } from "@dub/ui";
import { cn } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { ModalHero } from "../shared/modal-hero";

function ProgramWelcomeModal({
  showProgramWelcomeModal,
  setShowProgramWelcomeModal,
}: {
  showProgramWelcomeModal: boolean;
  setShowProgramWelcomeModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { program, loading } = useProgram();
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
              className="scrollbar-hide max-h-[calc(100vh-350px)] overflow-y-auto pb-6"
            >
              <h1 className={cn("text-lg font-medium text-neutral-950")}>
                {loading ? (
                  <div className="h-6 w-32 animate-pulse rounded-md bg-gray-200" />
                ) : (
                  `${program?.name} created!`
                )}
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                Congratulations on creating your first partner program with Dub!
                Share your program application link with your customers and
                fans, and track all their activity in you dashboard.
              </p>
            </div>

            <div
              className="pointer-events-none absolute bottom-0 left-0 hidden h-16 w-full bg-gradient-to-t from-white sm:block"
              style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
            />
          </div>

          <Button
            type="button"
            variant="primary"
            text="Check it out"
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
