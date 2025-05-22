import useWorkspace from "@/lib/swr/use-workspace";
import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import {
  ArrowTurnRight2,
  Button,
  CursorRays,
  Globe,
  Grid,
  InvoiceDollar,
  Modal,
  UserCheck,
  useScrollProgress,
} from "@dub/ui";
import { cn } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { RegisterDomainForm } from "../domains/register-domain-form";

function DotLinkOfferModal({
  showDotLinkOfferModal,
  setShowDotLinkOfferModal,
}: {
  showDotLinkOfferModal: boolean;
  setShowDotLinkOfferModal: Dispatch<SetStateAction<boolean>>;
}) {
  const [_, setDotLinkOfferDismissed, { mutateWorkspace }] =
    useWorkspaceStore<string>("dotLinkOfferDismissed");

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  const onClose = async () => {
    setShowDotLinkOfferModal(false);
    await setDotLinkOfferDismissed(new Date().toISOString());
    mutateWorkspace();
  };

  return (
    <Modal
      showModal={showDotLinkOfferModal}
      setShowModal={setShowDotLinkOfferModal}
      onClose={onClose}
    >
      <div className="flex flex-col">
        <Hero />
        <div className="px-6 py-8 sm:px-8">
          <div className="relative">
            <div
              ref={scrollRef}
              onScroll={updateScrollProgress}
              className="scrollbar-hide max-h-[calc(100vh-350px)] overflow-y-auto pb-6 text-left"
            >
              <h1 className="text-lg font-semibold text-neutral-900">
                Get more from your short links
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                Increase the click-through rates for your short links by
                claiming a{" "}
                <a
                  href="https://dub.link/claim"
                  target="_blank"
                  className="cursor-help font-semibold text-neutral-800 underline decoration-dotted underline-offset-2"
                >
                  1-year free .link domain
                </a>{" "}
                on Dub.
              </p>
              <div className="mt-6 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
                <RegisterDomainForm
                  showTerms={false}
                  onSuccess={() => {
                    setShowDotLinkOfferModal(false);
                  }}
                  onCancel={() => setShowDotLinkOfferModal(false)}
                />
              </div>
            </div>
            {/* Bottom scroll fade */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 hidden h-16 w-full bg-gradient-to-t from-white sm:block"
              style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
            ></div>
          </div>
          <Button
            type="button"
            variant="secondary"
            text="No thanks, maybe later"
            onClick={() => {
              onClose();
              setShowDotLinkOfferModal(false);
            }}
          />
          <p className="mt-6 text-pretty text-center text-xs text-neutral-500">
            By claiming your .link domain, you agree to our{" "}
            <a
              href="https://dub.co/help/article/free-dot-link-domain#terms-and-conditions"
              target="_blank"
              className="underline transition-colors hover:text-neutral-700"
            >
              terms
            </a>
            .<br />
            After the first year, your renewal is $12/year.
          </p>
        </div>
      </div>
    </Modal>
  );
}

export function useDotLinkOfferModal() {
  const [showDotLinkOfferModal, setShowDotLinkOfferModal] = useState(false);

  const DotLinkOfferModalCallback = useCallback(() => {
    return (
      <DotLinkOfferModal
        showDotLinkOfferModal={showDotLinkOfferModal}
        setShowDotLinkOfferModal={setShowDotLinkOfferModal}
      />
    );
  }, [showDotLinkOfferModal, setShowDotLinkOfferModal]);

  return useMemo(
    () => ({
      setShowDotLinkOfferModal,
      DotLinkOfferModal: DotLinkOfferModalCallback,
    }),
    [setShowDotLinkOfferModal, DotLinkOfferModalCallback],
  );
}

export function Hero() {
  const { slug } = useWorkspace();

  return (
    <div className="relative h-[140px] w-full overflow-hidden bg-white">
      <BackgroundGradient className="opacity-5" />
      <Grid
        className="text-neutral-300"
        cellSize={20}
        patternOffset={[-15, -9]}
      />
      <BackgroundGradient className="opacity-80 mix-blend-overlay" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-6 top-1/2 flex h-[81px] w-full -translate-y-1/2 items-center gap-12 rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="hidden rounded-full border border-neutral-200 sm:block">
              <div className="rounded-full border border-white bg-gradient-to-t from-neutral-100 p-1 md:p-2">
                <Globe className="size-5" />
              </div>
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                <span className="truncate text-sm font-medium">
                  {slugify(slug || "acme")}.link
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs">
                <ArrowTurnRight2 className="h-3 w-3 text-neutral-400" />
                <span className="truncate text-neutral-400">
                  yourwebsite.com
                </span>
              </div>
            </div>
          </div>

          <div className="flex grow items-center gap-2 rounded-lg border border-neutral-200 p-1 text-xs text-neutral-900">
            {[
              {
                id: "clicks",
                icon: CursorRays,
                value: 830,
                iconClassName: "text-blue-500",
              },
              {
                id: "leads",
                icon: UserCheck,
                value: 415,
                className: "hidden sm:flex",
                iconClassName: "text-purple-500",
              },
              {
                id: "sales",
                icon: InvoiceDollar,
                value: 200,
                className: "hidden sm:flex",
                iconClassName: "text-teal-500",
              },
            ].map(({ id, icon: Icon, value, iconClassName }) => (
              <div
                key={id}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-1 py-px"
              >
                <Icon
                  data-active={value > 0}
                  className={cn("size-4 shrink-0", iconClassName)}
                />
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BackgroundGradient({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 w-full overflow-hidden", className)}>
      <div
        className="absolute inset-0 saturate-150"
        style={{
          backgroundImage: `conic-gradient(from -66deg, #855AFC -32deg, #FF0000 63deg, #EAB308 158deg, #5CFF80 240deg, #855AFC 328deg, #FF0000 423deg)`,
        }}
      />
      <div className="absolute inset-0 backdrop-blur-[20px]" />
    </div>
  );
}
