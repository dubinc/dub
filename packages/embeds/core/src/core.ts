import {
  DASHBOARD_URL,
  DUB_CONTAINER_ID,
  DUB_POPUP_ID,
  WIDGET_URL,
} from "./constants";
import { EmbedError } from "./error";
import { createFloatingButton } from "./floating-button";
import { DubOptions, DubWidgetPlacement, IframeMessage } from "./types";

const CONTAINER_STYLES = (
  placement: DubWidgetPlacement,
): Partial<CSSStyleDeclaration> => ({
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
  width: "400px",
  zIndex: "9998",
  pointerEvents: "none",
});

const POPUP_STYLES = (
  placement: DubWidgetPlacement,
): Partial<CSSStyleDeclaration> => ({
  width: "100%",
  height: "100dvh",
  maxHeight: "500px",
  backgroundColor: "white",
  borderRadius: "12px",
  border: "1px solid #E5E5E5",
  boxShadow: "0px 4px 20px 0px #0000000D",
  margin: "16px",
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

let isWidgetOpen = false;

const createIframe = (iframeUrl: string, token: string): HTMLIFrameElement => {
  const iframe = document.createElement("iframe");

  iframe.src = `${iframeUrl}?token=${token}`;
  iframe.style.width = "100%";
  iframe.style.height = "100vh";
  iframe.style.border = "none";
  iframe.setAttribute("credentialssupport", "");
  iframe.setAttribute("allow", "clipboard-write");

  return iframe;
};

const renderDashboard = (
  options: Pick<
    DubOptions,
    "token" | "containerStyles" | "onError" | "onTokenExpired"
  >,
): HTMLElement | null => {
  console.debug("[Dub] Rendering dashboard.", options);

  const { token, containerStyles, onError, onTokenExpired } = options;

  const existingContainer = document.getElementById(DUB_CONTAINER_ID);

  if (existingContainer) {
    document.body.removeChild(existingContainer);
    return existingContainer;
  }

  if (!token) {
    console.error("[Dub] A link token is required to embed the widget.");
    return null;
  }

  const container = document.createElement("div");
  container.id = DUB_CONTAINER_ID;

  const iframe = createIframe(DASHBOARD_URL, token);
  Object.assign(iframe.style, {
    ...containerStyles,
  });

  container.appendChild(iframe);

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

  return container;
};

const renderWidget = (options: DubOptions): HTMLElement | null => {
  console.debug("[Dub] Rendering widget.", options);

  const {
    token,
    placement,
    containerStyles,
    popupStyles,
    onOpen,
    onClose,
    onError,
    onTokenExpired,
  } = options;

  const existingContainer = document.getElementById(DUB_CONTAINER_ID);

  if (existingContainer) {
    document.body.removeChild(existingContainer);
    onClose?.();
    return existingContainer;
  }

  if (!token) {
    console.error("[Dub] A link token is required to embed the widget.");
    return null;
  }

  const container = document.createElement("div");
  container.id = DUB_CONTAINER_ID;
  Object.assign(container.style, {
    ...CONTAINER_STYLES(placement ?? "bottom-right"),
    ...containerStyles,
  });

  const popup: HTMLElement =
    container.querySelector(`#${DUB_POPUP_ID}`) ??
    document.createElement("div");
  popup.id = DUB_POPUP_ID;
  Object.assign(popup.style, {
    ...POPUP_STYLES(placement ?? "bottom-right"),
    ...popupStyles,
    display: "none",
  });

  const iframe = createIframe(WIDGET_URL, token);

  popup.appendChild(iframe);
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

  onOpen?.();

  return container;
};

export const openWidget = (): void => {
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

  isWidgetOpen = true;
  if (typeof window !== "undefined" && window.Dub)
    window.Dub.isWidgetOpen = true;
};

export const closeWidget = (): void => {
  const popup = document.getElementById(DUB_POPUP_ID);
  if (!popup) return;

  popup.getAnimations().forEach((a) => a.cancel());
  const animation = popup.animate([{ opacity: 0, transform: "scale(0.8)" }], {
    duration: 100,
    easing: "ease-in-out",
    fill: "forwards",
  });

  animation.onfinish = () => {
    if (popup && !isWidgetOpen) popup.style.display = "none";
  };

  isWidgetOpen = false;
  if (typeof window !== "undefined" && window.Dub)
    window.Dub.isWidgetOpen = false;
};

export const toggleWidget = (): void => {
  isWidgetOpen ? closeWidget() : openWidget();
};

export const init = (options: DubOptions) => {
  options.trigger = options.trigger ?? "floating-button";
  options.placement = options.placement ?? "bottom-right";
  options.type = options.type ?? "widget";

  console.debug("[Dub] Initializing.", options);

  const container =
    options.type === "dashboard"
      ? renderDashboard(options)
      : renderWidget(options);

  if (!container) {
    return;
  }

  if (options.trigger === "floating-button")
    createFloatingButton({
      container,
      buttonStyles: options.buttonStyles,
      placement: options.placement,
      onClick: () => {
        toggleWidget();
      },
    });
};

export const destroy = (): void => {
  document.querySelectorAll(`#${DUB_CONTAINER_ID}`).forEach((c) => c.remove());
};
