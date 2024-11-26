import {
  CLOSE_ICON,
  DUB_CLOSE_BUTTON_ID,
  DUB_CONTAINER_ID,
  DUB_POPUP_BACKDROP_ID,
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
}: {
  placement: DubWidgetPlacement;
}): Partial<CSSStyleDeclaration> => ({
  width: "calc(100% - 32px)",
  height: "100dvh",
  maxHeight: "532px",
  backgroundColor: "white",
  borderRadius: "12px",
  boxShadow: "0px 8px 30px rgba(0, 0, 0, 0.12), 0px 2px 4px rgba(0, 0, 0, 0.1)",
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

const CLOSE_BUTTON_STYLES = {
  position: "absolute",
  top: "20px",
  right: "20px",
  padding: "4px",
  color: "white",
};

const BACKDROP_STYLES: Partial<CSSStyleDeclaration> = {
  position: "fixed",
  inset: "0",
  zIndex: "9997",
  backgroundColor: "rgba(115, 115, 115, 0.3)",
  pointerEvents: "none",
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
    placement,
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
    ...CONTAINER_STYLES({
      placement: placement ?? "bottom-right",
    }),
    ...containerStyles,
  });

  const backdrop = document.createElement("div");
  backdrop.id = `${prefix}${DUB_POPUP_BACKDROP_ID}`;
  Object.assign(backdrop.style, {
    ...BACKDROP_STYLES,
    display: "none",
  });

  document.body.appendChild(backdrop);

  const popup: HTMLElement =
    container.querySelector("#" + CSS.escape(`${prefix}${DUB_POPUP_ID}`)) ??
    document.createElement("div");
  popup.id = `${prefix}${DUB_POPUP_ID}`;
  Object.assign(popup.style, {
    ...POPUP_STYLES({
      placement: placement ?? "bottom-right",
    }),
    ...popupStyles,
    display: "none",
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
  const popup = document.getElementById(`${prefix}${DUB_POPUP_ID}`);
  return popup?.style.display === "block";
};

/**
 * Opens the widget.
 */
const openWidget =
  (prefix?: string, updatePosition?: () => void) => (): void => {
    const popup = document.getElementById(`${prefix}${DUB_POPUP_ID}`);
    const backdrop = document.getElementById(
      `${prefix}${DUB_POPUP_BACKDROP_ID}`,
    );
    if (!popup) {
      console.error("[Dub] No popup found.");
      return;
    }

    popup.getAnimations().forEach((a) => a.cancel());
    popup.style.display = "block";

    if (backdrop) {
      backdrop.style.display = "block";
      backdrop.animate(
        [
          {
            opacity: 0,
            backgroundColor: "rgba(115, 115, 115, 0)",
          },
          {
            opacity: 1,
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

    updatePosition?.();

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
  const backdrop = document.getElementById(`${prefix}${DUB_POPUP_BACKDROP_ID}`);
  if (!popup) return;

  popup.getAnimations().forEach((a) => a.cancel());
  const animation = popup.animate(
    [{ transform: "translateY(10px)", opacity: 0 }],
    {
      duration: 100,
      easing: "ease-in-out",
      fill: "forwards",
    },
  );

  if (backdrop) {
    backdrop.animate(
      [
        {
          opacity: 1,
          backgroundColor: "rgba(115, 115, 115, 0.3)",
        },
        {
          opacity: 0,
          backgroundColor: "rgba(115, 115, 115, 0)",
        },
      ],
      {
        duration: 250,
        easing: "ease-in",
        fill: "forwards",
      },
    ).onfinish = () => {
      backdrop.style.display = "none";
    };
  }

  animation.onfinish = () => {
    if (popup?.isConnected) popup.style.display = "none";
  };
};

/**
 * Toggles the widget open state.
 */
const toggleWidget =
  (prefix?: string, updatePosition?: () => void) => (): void => {
    isWidgetOpen(prefix)()
      ? closeWidget(prefix)()
      : openWidget(prefix, updatePosition)();
  };

/**
 * Initializes the Dub embed widget.
 */
export const init = (options: DubOptions): DubInitResult => {
  options.trigger = options.trigger ?? "floating-button";
  options.placement = options.placement ?? "bottom-right";

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
      container: container,
      buttonStyles: options.buttonStyles,
      placement: options.placement,
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
      document
        .querySelectorAll("#" + CSS.escape(`${prefix}${DUB_CONTAINER_ID}`))
        .forEach((c) => c.remove());
    },
  };
};
