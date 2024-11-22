import { createFloatingButton } from "./floating-button";
import { DubEmbed, Options } from "./types";

declare global {
  interface Window {
    Dub: DubEmbed;
  }
}

const CONTAINER_STYLES: Partial<CSSStyleDeclaration> = {
  position: "fixed",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  bottom: "0",
  right: "0",
  width: "400px",
  zIndex: "9998",
  pointerEvents: "none",
};

const POPUP_STYLES: Partial<CSSStyleDeclaration> = {
  width: "100%",
  height: "100dvh",
  maxHeight: "500px",
  backgroundColor: "white",
  borderRadius: "12px",
  border: "1px solid #E5E5E5",
  margin: "16px",
  overflow: "hidden",
  transformOrigin: "bottom right",
  pointerEvents: "auto",
};

const WIDGET_URL = "http://localhost:8888/embed/widget";

const createIframe = (iframeUrl: string, token: string): HTMLIFrameElement => {
  const iframe = document.createElement("iframe");

  iframe.src = `${iframeUrl}?token=${token}`;
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.setAttribute("credentialssupport", "");

  return iframe;
};

const DUB_CONTAINER_ID = "dub-embed-container";
const DUB_POPUP_ID = "dub-embed-popup";

const renderWidget = (options: Options): HTMLElement | null => {
  const { token, onOpen, onClose, containerStyles, popupStyles, buttonStyles } =
    options;

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
  Object.assign(container.style, { ...CONTAINER_STYLES, containerStyles });

  const popup: HTMLElement =
    container.querySelector(`#${DUB_POPUP_ID}`) ??
    document.createElement("div");
  popup.id = DUB_POPUP_ID;
  Object.assign(popup.style, {
    ...POPUP_STYLES,
    ...popupStyles,
    display: "none",
  });

  const iframe = createIframe(WIDGET_URL, token);

  popup.appendChild(iframe);
  container.appendChild(popup);

  document.body.appendChild(container);

  onOpen?.();

  return container;
};

// Initialize when an external button is clicked
// const addButtonListener = (): void => {
//   const button = document.querySelector(
//     "[data-dub-token]",
//   ) as HTMLElement | null;

//   if (!button) {
//     console.error("[Dub] No button found with data-dub-token.");
//     return;
//   }

//   button.addEventListener("click", () => {
//     const token = button.getAttribute("data-dub-token");

//     if (!token) {
//       console.error("[Dub] A link token is required to embed the widget.");
//       return;
//     }

//     renderWidget({ token });
//   });
// };

let isWidgetOpen = false;

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

// Initialize when DOM is ready
const init = (options: Options) => {
  console.debug("[Dub] Initializing");

  const container = renderWidget(options);
  if (!container) return;

  createFloatingButton({
    container,
    onClick: () => {
      isWidgetOpen ? closeWidget() : openWidget();
    },
  });
};

const destroy = (): void => {
  document.querySelectorAll(`#${DUB_CONTAINER_ID}`).forEach((c) => c.remove());
};

// TODO:
// - Add a loading state
// - Add a close button
// - Inline embed (dashboard)
// - Reuse addEventListener logic

export { destroy, init };
