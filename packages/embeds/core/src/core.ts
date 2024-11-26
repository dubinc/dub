import {
  CLOSE_ICON,
  DUB_CLOSE_BUTTON_ID,
  DUB_CONTAINER_ID,
  DUB_FLOATING_BUTTON_ID,
  DUB_POPUP_ID,
  WIDGET_URL,
} from "./constants";
import { EmbedError } from "./error";
import { createFloatingButton } from "./floating-button";
import { DubInitResult, DubOptions, IframeMessage } from "./types";

const CONTAINER_STYLES: Partial<CSSStyleDeclaration> = {
  position: "fixed",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  inset: "0",
  padding: "16px",
  zIndex: "9998",
  backgroundColor: "rgba(115, 115, 115, 0.3)",
};

const POPUP_STYLES: Partial<CSSStyleDeclaration> = {
  width: "100%",
  height: "100%",
  maxWidth: "400px",
  maxHeight: "500px",
  backgroundColor: "white",
  borderRadius: "12px",
  boxShadow: "0px 8px 30px rgba(0, 0, 0, 0.12), 0px 2px 4px rgba(0, 0, 0, 0.1)",
  overflow: "hidden",
};

const CLOSE_BUTTON_STYLES = {
  position: "absolute",
  top: "20px",
  right: "20px",
  padding: "4px",
  color: "white",
};

const createIframe = (iframeUrl: string, token: string): HTMLIFrameElement => {
  const iframe = document.createElement("iframe");

  iframe.src = `${iframeUrl}?token=${token}`;
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
  { prefix, closeWidget }: { prefix?: string; closeWidget: () => void },
) => {
  console.debug("[Dub] Rendering widget.", options);

  const {
    token,
    containerStyles,
    popupStyles,
    onClose,
    onError,
    onTokenExpired,
  } = options;

  const existingContainer = document.getElementById(
    `${prefix}${DUB_CONTAINER_ID}`,
  );

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
  container.id = `${prefix}${DUB_CONTAINER_ID}`;
  Object.assign(container.style, {
    ...CONTAINER_STYLES,
    ...containerStyles,
    display: "none",
  });

  container.addEventListener("click", (e) => {
    if (e.target === container) closeWidget();
  });

  const popup: HTMLElement =
    container.querySelector("#" + CSS.escape(`${prefix}${DUB_POPUP_ID}`)) ??
    document.createElement("div");
  popup.id = `${prefix}${DUB_POPUP_ID}`;
  Object.assign(popup.style, {
    ...POPUP_STYLES,
    ...popupStyles,
  });

  const iframe = createIframe(WIDGET_URL, token);

  // Close button
  const closeButton = document.createElement("button");
  closeButton.id = `${prefix}${DUB_CLOSE_BUTTON_ID}`;
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

  return { container };
};

/**
 * Checks if the widget is open.
 */
const isWidgetOpen = (prefix?: string) => (): boolean => {
  const container = document.getElementById(`${prefix}${DUB_CONTAINER_ID}`);
  return container?.style.display !== "none";
};

/**
 * Opens the widget.
 */
const openWidget = (prefix?: string) => (): void => {
  const popup = document.getElementById(`${prefix}${DUB_POPUP_ID}`);
  const container = document.getElementById(`${prefix}${DUB_CONTAINER_ID}`);
  if (!popup) {
    console.error("[Dub] No popup found.");
    return;
  }

  if (container) {
    container.style.display = "flex";
    container.animate(
      [
        {
          backgroundColor: "rgba(115, 115, 115, 0)",
        },
        {
          backgroundColor: "rgba(115, 115, 115, 0.3)",
        },
      ],
      {
        duration: 250,
        easing: "ease-out",
        fill: "forwards",
      },
    );
  }

  popup.getAnimations().forEach((a) => a.cancel());
  popup.animate(
    [
      { transform: "translateY(10px)", opacity: 0 },
      { transform: "translateY(0)", opacity: 1 },
    ],
    {
      duration: 250,
      easing: "ease-in-out",
      fill: "forwards",
    },
  );
};

/**
 * Closes the widget.
 */
const closeWidget = (prefix?: string) => (): void => {
  const popup = document.getElementById(`${prefix}${DUB_POPUP_ID}`);
  const container = document.getElementById(`${prefix}${DUB_CONTAINER_ID}`);
  if (!popup) return;

  popup.getAnimations().forEach((a) => a.cancel());
  popup.animate([{ transform: "translateY(10px)", opacity: 0 }], {
    duration: 100,
    easing: "ease-in-out",
    fill: "forwards",
  });

  if (container) {
    container.animate(
      [
        {
          backgroundColor: "rgba(115, 115, 115, 0.3)",
        },
        {
          backgroundColor: "rgba(115, 115, 115, 0)",
        },
      ],
      {
        duration: 250,
        easing: "ease-in",
        fill: "forwards",
      },
    ).onfinish = () => {
      container.style.display = "none";
    };
  }
};

/**
 * Toggles the widget open state.
 */
const toggleWidget = (prefix?: string) => (): void => {
  isWidgetOpen(prefix)() ? closeWidget(prefix)() : openWidget(prefix)();
};

/**
 * Initializes the Dub embed widget.
 */
export const init = (options: DubOptions): DubInitResult => {
  options.trigger = options.trigger ?? "floating-button";
  options.buttonPlacement = options.buttonPlacement ?? "bottom-right";

  console.debug("[Dub] Initializing.", options);

  const prefix = options.id ? `${options.id}-` : "";

  const { container } = renderWidget(options, {
    prefix,
    closeWidget: closeWidget(prefix),
  });

  if (!container) {
    return null;
  }

  if (options.trigger === "floating-button") {
    createFloatingButton({
      prefix,
      buttonStyles: options.buttonStyles,
      buttonPlacement: options.buttonPlacement,
      onClick: () => {
        toggleWidget(prefix)();
      },
    });
  }

  return {
    openWidget: openWidget(prefix),
    closeWidget: closeWidget(prefix),
    toggleWidget: toggleWidget(prefix),
    isWidgetOpen: isWidgetOpen(prefix),
    destroy: () => {
      document.getElementById(`${prefix}${DUB_CONTAINER_ID}`)?.remove();
      document.getElementById(`${prefix}${DUB_FLOATING_BUTTON_ID}`)?.remove();
    },
  };
};
