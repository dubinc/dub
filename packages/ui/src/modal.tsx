"use client";

import { cn } from "@dub/utils";
import * as Dialog from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useRouter } from "next/navigation";
import {
  ComponentProps,
  Dispatch,
  SetStateAction,
  useCallback,
  useState,
} from "react";
import { Drawer } from "vaul";
import { useMediaQuery } from "./hooks";

export function Modal({
  children,
  className,
  showModal,
  setShowModal,
  onClose,
  desktopOnly,
  preventDefaultClose,
  drawerRootProps,
  expandable,
}: {
  children: React.ReactNode;
  className?: string;
  showModal?: boolean;
  setShowModal?: Dispatch<SetStateAction<boolean>>;
  onClose?: () => void;
  desktopOnly?: boolean;
  preventDefaultClose?: boolean;
  drawerRootProps?: ComponentProps<typeof Drawer.Root>;
  /**
   * Mobile only: opens the drawer sized to its content (like the default) but, when the
   * content is taller than the initial height, lets the user drag it up to full height.
   * The drawer then scrolls its content, so children should not cap their own height.
   */
  expandable?: boolean;
}) {
  const router = useRouter();
  const expandableDrawer = useExpandableDrawer(Boolean(expandable));

  const closeModal = ({ dragged }: { dragged?: boolean } = {}) => {
    if (preventDefaultClose && !dragged) {
      return;
    }
    // fire onClose event if provided
    onClose && onClose();

    // if setShowModal is defined, use it to close modal
    if (setShowModal) {
      setShowModal(false);
      // else, this is intercepting route @modal
    } else {
      router.back();
    }
  };
  const { isMobile } = useMediaQuery();

  if (isMobile && !desktopOnly) {
    return (
      <Drawer.Root
        open={setShowModal ? showModal : true}
        onOpenChange={(open) => {
          if (!open) {
            expandableDrawer.reset();
            closeModal({ dragged: true });
          }
        }}
        {...expandableDrawer.rootProps}
        {...drawerRootProps}
      >
        <Drawer.Portal>
          <Drawer.Overlay
            className={cn(
              "fixed inset-0 z-50 bg-neutral-100 bg-opacity-10 backdrop-blur",
              // vaul only shows the overlay at one snap point (fadeFromIndex), so pin it open at every snap point
              expandable && "data-[state=open]:!opacity-100",
            )}
          />
          <Drawer.Content
            onPointerDownOutside={(e) => {
              // Prevent dismissal when clicking inside a toast
              if (
                e.target instanceof Element &&
                e.target.closest("[data-sonner-toast]")
              ) {
                e.preventDefault();
              }
            }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 flex flex-col",
              "rounded-t-[10px] border-t border-neutral-200 bg-white",
              // snap points position the drawer with a transform, so it needs an explicit height
              expandable && "h-full max-h-[97%]",
              className,
            )}
          >
            <div className="scrollbar-hide flex-1 overflow-y-auto rounded-t-[10px] bg-inherit">
              <VisuallyHidden.Root>
                <Drawer.Title>Modal</Drawer.Title>
                <Drawer.Description>This is a modal</Drawer.Description>
              </VisuallyHidden.Root>
              {/* Wrapper so the natural content height can be measured for `expandable` */}
              <div ref={expandableDrawer.contentRef}>
                <DrawerIsland />
                {children}
              </div>
            </div>
          </Drawer.Content>
          <Drawer.Overlay />
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <Dialog.Root
      open={setShowModal ? showModal : true}
      onOpenChange={(open) => {
        if (!open) {
          closeModal();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          // for detecting when there's an active opened modal
          id="modal-backdrop"
          className="animate-fade-in fixed inset-0 z-40 bg-neutral-100 bg-opacity-50 backdrop-blur-md"
        />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => {
            // Prevent dismissal when clicking inside a toast
            if (
              e.target instanceof Element &&
              e.target.closest("[data-sonner-toast]")
            ) {
              e.preventDefault();
            }
          }}
          className={cn(
            "fixed inset-0 z-40 m-auto h-fit w-full max-w-md",
            "border border-neutral-200 bg-white p-0 shadow-xl sm:rounded-2xl",
            "scrollbar-hide animate-scale-in overflow-y-auto",
            className,
          )}
        >
          <VisuallyHidden.Root>
            <Dialog.Title>Modal</Dialog.Title>
            <Dialog.Description>This is a modal</Dialog.Description>
          </VisuallyHidden.Root>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Tallest the drawer opens at before the user drags it up, as a fraction of the viewport
const EXPANDABLE_INITIAL_MAX = 0.75;
// Matches the `max-h-[97%]` on the drawer content
const EXPANDABLE_FULL = 0.97;

/**
 * Drives vaul snap points from the drawer's measured content height:
 * the first snap point is the content height (capped), and a full-height
 * snap point is added only when the content is taller than that.
 */
function useExpandableDrawer(enabled: boolean) {
  const [measured, setMeasured] = useState<{
    content: number;
    viewport: number;
  } | null>(null);
  const [expanded, setExpanded] = useState(false);

  const contentRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!enabled || !node) return;

      const measure = () =>
        setMeasured({
          // +1 for the drawer's top border
          content: node.offsetHeight + 1,
          viewport: window.innerHeight,
        });

      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(node);

      return () => observer.disconnect();
    },
    [enabled],
  );

  const reset = useCallback(() => setExpanded(false), []);

  if (!enabled) {
    return { contentRef, reset, rootProps: {} };
  }

  const initialMax = measured ? measured.viewport * EXPANDABLE_INITIAL_MAX : 0;
  const initial = measured ? Math.min(measured.content, initialMax) : 0;
  const canExpand = measured ? measured.content > initialMax : false;
  // vaul measures px snap points from the bottom of the window, but the drawer is only
  // EXPANDABLE_FULL tall (anchored to the bottom), so add the top gap to keep the content visible
  const topGap = measured ? measured.viewport * (1 - EXPANDABLE_FULL) : 0;

  // Until measured, a 0px snap point keeps the drawer offscreen; it animates up once measured
  const snapPoints: (number | string)[] = [
    `${Math.round(measured ? initial + topGap : 0)}px`,
    ...(canExpand ? [1] : []),
  ];

  const rootProps: ComponentProps<typeof Drawer.Root> = {
    snapPoints,
    activeSnapPoint: expanded && canExpand ? snapPoints[1] : snapPoints[0],
    setActiveSnapPoint: (snapPoint) => setExpanded(snapPoint === 1),
  };

  return { contentRef, reset, rootProps };
}

function DrawerIsland() {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-center rounded-t-[10px] bg-inherit">
      <div className="my-3 h-1 w-12 rounded-full bg-neutral-300" />
    </div>
  );
}
