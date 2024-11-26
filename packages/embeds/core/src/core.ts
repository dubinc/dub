import { setAnchoredPosition } from "./anchor";
import {
  CLOSE_ICON,
  DUB_CLOSE_BUTTON_ID,
  DUB_CONTAINER_ID,
  DUB_POPUP_ID,
  WIDGET_URL,
} from "./constants";
import { EmbedError } from "./error";
import { createFloatingButton } from "./floating-button";
import {
  DubInitResult,
  DubOptions,
  DubWidgetPlacement,
  IframeMessage,
} from "./types";

const CONTAINER_STYLES = ({
  placement,
}: {
  placement: DubWidgetPlacement;
}): Partial<CSSStyleDeclaration> => ({
  position: "fixed",
  display: "flex",
  ...{
    "bottom-right": {
      bottom: "0",
      right: "0",
      alignItems: "flex-end",
      flexDirection: "column",
    },
    "bottom-left": {
      bottom: "0",
      left: "0",
      alignItems: "flex-start",
      flexDirection: "column",
    },
    "top-right": {
      top: "0",
      right: "0",
      alignItems: "flex-end",
      flexDirection: "column-reverse",
    },
    "top-left": {
      top: "0",
      left: "0",
      alignItems: "flex-start",
      flexDirection: "column-reverse",
    },
    center: {
      top: "50%",
      left: "50%",
      alignItems: "flex-start",
      flexDirection: "column",
      transform: "translate(-50%, -50%)",
    },
  }[placement],
  width: "100%",
  maxWidth: "400px",
  zIndex: "9998",
  pointerEvents: "none",
});

const POPUP_STYLES = ({
  placement,
  anchor,
}: {
  placement: DubWidgetPlacement;
  anchor: boolean;
}): Partial<CSSStyleDeclaration> => ({
  width: anchor ? "100%" : "calc(100% - 32px)",
  height: "100dvh",
  maxHeight: anchor ? "500px" : "532px",
  backgroundColor: "white",
  borderRadius: "12px",
  border: "1px solid #E5E5E5",
  boxShadow: "0px 4px 20px 0px #0000000D",
  margin: anchor ? undefined : "16px",
  overflow: "hidden",
  ...{
    "bottom-right": { transformOrigin: "bottom right" },
    "bottom-left": { transformOrigin: "bottom left" },
    "top-right": { transformOrigin: "top right" },
    "top-left": { transformOrigin: "top left" },
    center: { transformOrigin: "center" },
  }[placement],
  pointerEvents: "auto",
});

const CLOSE_BUTTON_STYLES = {
  position: "absolute",
  top: "20px",
  right: "20px",
  padding: "4px",
  color: "white",
};

const createIframe = (
  iframeUrl: string,
  token: string,
  accentColor?: string,
): HTMLIFrameElement => {
  const iframe = document.createElement("iframe");

  iframe.src = `${iframeUrl}?token=${token}&accentColor=${encodeURIComponent(accentColor ?? "#000")}`;
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.setAttribute("credentialssupport", "");
  iframe.setAttribute("allow", "clipboard-write");

  return iframe;
};

/**
 * Generates and renders all of the widget's DOM elements.
 */
const renderWidget = (
  options: DubOptions,
  { closeWidget }: { closeWidget: () => void },
) => {
  console.debug("[Dub] Rendering widget.", options);

  const {
    token,
    placement,
    accentColor,
    containerStyles,
    popupStyles,
    anchorId,
    onOpen,
    onClose,
    onError,
    onTokenExpired,
  } = options;

  const existingContainer = document.getElementById(DUB_CONTAINER_ID);

  if (existingContainer) {
    document.body.removeChild(existingContainer);
    onClose?.();
    return { container: existingContainer };
  }

  if (!token) {
    console.error("[Dub] A link token is required to embed the widget.");
    return { container: null };
  }

  const container = document.createElement("div");
  container.id = DUB_CONTAINER_ID;
  Object.assign(container.style, {
    ...CONTAINER_STYLES({
      placement: placement ?? "bottom-right",
    }),
    ...containerStyles,
  });

  const popup: HTMLElement =
    container.querySelector(`#${DUB_POPUP_ID}`) ??
    document.createElement("div");
  popup.id = DUB_POPUP_ID;
  Object.assign(popup.style, {
    ...POPUP_STYLES({
      placement: placement ?? "bottom-right",
      anchor: !!anchorId,
    }),
    ...popupStyles,
    display: "none",
  });

  const iframe = createIframe(WIDGET_URL, token, accentColor);

  // Close button
  const closeButton = document.createElement("button");
  closeButton.id = DUB_CLOSE_BUTTON_ID;
  closeButton.innerHTML = CLOSE_ICON;
  Object.assign(closeButton.style, CLOSE_BUTTON_STYLES);
  closeButton.addEventListener("click", () => closeWidget());

  popup.appendChild(iframe);
  popup.appendChild(closeButton);
  container.appendChild(popup);

  // Listen the message from the iframe
  window.addEventListener("message", (e) => {
    const { data, event } = e.data as IframeMessage;

    console.debug("[Dub] Iframe message", data);

    if (event === "ERROR") {
      onError?.(
        new EmbedError({
          code: data?.code ?? "",
          message: data?.message ?? "",
        }),
      );
    }

    if (data?.code === "unauthorized") {
      onTokenExpired?.();
    }
  });

  document.body.appendChild(container);

  let updatePosition: (() => void) | undefined;

  if (anchorId) {
    updatePosition = () => setAnchoredPosition({ anchorId, placement });
    updatePosition();
    window.addEventListener("resize", updatePosition);
  }

  onOpen?.();

  return { container, updatePosition };
};

/**
 * Checks if the widget is open.
 */
const isWidgetOpen = (): boolean => {
  const popup = document.getElementById(DUB_POPUP_ID);
  return popup?.style.display === "block";
};

/**
 * Opens the widget.
 */
const openWidget = (): void => {
  const popup = document.getElementById(DUB_POPUP_ID);
  if (!popup) {
    console.error("[Dub] No popup found.");
    return;
  }

  popup.getAnimations().forEach((a) => a.cancel());
  popup.style.display = "block";
  popup.animate(
    [
      { transform: "scale(0.8)", opacity: 0 },
      { transform: "scale(1)", opacity: 1 },
    ],
    {
      duration: 100,
      easing: "ease-in-out",
      fill: "forwards",
    },
  );
};

/**
 * Closes the widget.
 */
const closeWidget = (): void => {
  const popup = document.getElementById(DUB_POPUP_ID);
  if (!popup) return;

  popup.getAnimations().forEach((a) => a.cancel());
  const animation = popup.animate([{ opacity: 0, transform: "scale(0.8)" }], {
    duration: 100,
    easing: "ease-in-out",
    fill: "forwards",
  });

  animation.onfinish = () => {
    if (popup?.isConnected) popup.style.display = "none";
  };
};

/**
 * Toggles the widget open state.
 */
const toggleWidget = (): void => {
  isWidgetOpen() ? closeWidget() : openWidget();
};

/**
 * Initializes the Dub embed widget.
 */
export const init = (options: DubOptions): DubInitResult => {
  options.trigger = options.trigger ?? "floating-button";
  options.placement = options.placement ?? "bottom-right";

  console.debug("[Dub] Initializing.", options);

  const { container, updatePosition } = renderWidget(options, { closeWidget });

  if (!container) return null;

  if (options.trigger === "floating-button")
    createFloatingButton({
      container: container,
      buttonStyles: options.buttonStyles,
      placement: options.placement,
      onClick: () => {
        toggleWidget();
      },
    });

  return {
    openWidget,
    closeWidget,
    toggleWidget,
    isWidgetOpen,
    destroy: () => {
      document
        .querySelectorAll(`#${DUB_CONTAINER_ID}`)
        .forEach((c) => c.remove());

      if (updatePosition) window.removeEventListener("resize", updatePosition);
    },
  };
};
