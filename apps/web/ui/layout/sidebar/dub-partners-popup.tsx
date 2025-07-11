"use client";

import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useWorkspace from "@/lib/swr/use-workspace";
import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { X } from "@/ui/shared/icons";
import { BlurImage, useMediaQuery } from "@dub/ui";
import {
  arrow,
  autoUpdate,
  FloatingArrow,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { Play } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

export function DubPartnersPopup({
  referenceElement,
}: {
  referenceElement: HTMLElement | null;
}) {
  const { isMobile } = useMediaQuery();

  const {
    plan,
    defaultProgramId,
    partnersEnabled,
    loading: loadingWorkspace,
  } = useWorkspace({
    swrOpts: { keepPreviousData: true },
  });

  const { canManageProgram } = getPlanCapabilities(plan);

  const [dismissed, setDismissed, { loading: loadingDismissed }] =
    useWorkspaceStore<undefined | boolean>("dubPartnersPopupDismissed");

  if (
    // Loading
    loadingWorkspace ||
    loadingDismissed ||
    // hide if partners is not enabled
    !partnersEnabled ||
    // hide if workspace can't create a program
    !canManageProgram ||
    // hide if there's already a default program
    defaultProgramId ||
    // don't show on mobile
    isMobile ||
    // hide if already dismissed
    dismissed
  )
    return null;

  return (
    <DubPartnersPopupInner
      referenceElement={referenceElement}
      onDismiss={() => setDismissed(true)}
    />
  );
}

function DubPartnersPopupInner({
  referenceElement,
  onDismiss,
}: {
  referenceElement: HTMLElement | null;
  onDismiss: () => void;
}) {
  const arrowRef = useRef<SVGSVGElement>(null);

  const { refs, floatingStyles, context } = useFloating({
    placement: "right",
    strategy: "fixed",
    whileElementsMounted(referenceEl, floatingEl, update) {
      return autoUpdate(referenceEl, floatingEl, update, {
        // Not good for performance but keeps the arrow and floating element in the right spot
        animationFrame: true,
      });
    },
    elements: {
      reference: referenceElement,
    },
    middleware: [
      offset({
        mainAxis: 12,
      }),
      shift({
        padding: 32,
      }),
      arrow({
        element: arrowRef,
      }),
    ],
  });

  const { slug } = useWorkspace();

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        style={floatingStyles}
        className="drop-shadow-sm"
      >
        <div className="animate-slide-up-fade relative flex w-[260px] flex-col rounded-lg border border-neutral-900 bg-neutral-800 p-3 text-left">
          <div className="relative">
            <Link
              href="https://dub.co/partners"
              target="_blank"
              className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border border-neutral-900 bg-neutral-800"
            >
              <BlurImage
                src="https://assets.dub.co/misc/dub-partners-thumbnail.jpg"
                alt="thumbnail"
                fill
                className="object-cover opacity-60"
              />
              <div className="relative flex size-10 items-center justify-center rounded-full bg-neutral-900 ring-[6px] ring-black/5 transition-all duration-75 group-hover:ring-[8px] group-active:ring-[7px]">
                <Play className="size-4 fill-current text-white" />
              </div>
            </Link>
            <button
              type="button"
              onClick={onDismiss}
              className="absolute right-2 top-2 rounded-md bg-black/30 p-1.5 shadow-sm transition-colors duration-75 hover:bg-black/40"
            >
              <X className="size-4 text-white" strokeWidth={2} />
            </button>
          </div>
          <h2 className="text-content-inverted mt-4 text-sm font-semibold">
            Dub Partners unlocked
          </h2>
          <p className="mt-1.5 text-xs text-neutral-300">
            Kickstart viral product-led growth with powerful, branded partner
            programs.
          </p>
          <div className="mt-4 grid w-full grid-cols-2 gap-2">
            <Link
              href={`/${slug}/guides`}
              target="_blank"
              className="flex h-7 items-center justify-center whitespace-nowrap rounded-md bg-white/10 px-2.5 text-xs text-white transition-colors duration-150 hover:bg-white/15"
            >
              Quickstart guide
            </Link>
            <Link
              href={`/${slug}/program/new`}
              className="flex h-7 items-center justify-center whitespace-nowrap rounded-md bg-white px-2.5 text-xs text-black transition-colors duration-150 hover:bg-white/90"
              onClick={onDismiss}
            >
              Create program
            </Link>
          </div>
          <FloatingArrow
            ref={arrowRef}
            context={context}
            className="stroke-neutral-900 text-neutral-800"
            fill="currentColor"
            strokeWidth={1}
            height={10}
          />
        </div>
      </div>
    </FloatingPortal>
  );
}
