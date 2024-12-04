import {
  CLOSE_ICON,
  DUB_CLOSE_BUTTON_ID,
  DUB_CONTAINER_ID,
  DUB_FLOATING_BUTTON_ID,
  DUB_POPUP_ID,
  INLINE_URL,
  WIDGET_URL,
} from "./constants";
import { EmbedError } from "./error";
import { createFloatingButton } from "./floating-button";
import { DubInitResult, DubOptions, IframeMessage } from "./types";

const INLINE_CONTAINER_STYLES = {
  position: "relative",
  maxWidth: "1024px",
  height: "730px",
  margin: "0 auto",
};

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
  maxHeight: "525px",
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
  backgroundColor: "transparent",
  border: "none",
  cursor: "pointer",
};

class DubWidget {
  options: DubOptions;
  prefix: string;
  container: HTMLElement | null;

  constructor(options: DubOptions) {
    options.variant = options.variant ?? "popup";
    options.trigger = options.trigger ?? "floating-button";
    options.buttonPlacement = options.buttonPlacement ?? "bottom-right";

    this.options = options;
    this.prefix = options.id ? `${options.id}-` : "";

    console.debug("[Dub] Initializing.", options);

    const prefix = options.id ? `${options.id}-` : "";

    this.container = this.renderWidget();

    if (options.variant === "popup" && options.trigger === "floating-button") {
      createFloatingButton({
        prefix,
        buttonStyles: options.buttonStyles,
        buttonPlacement: options.buttonPlacement,
        onClick: () => this.toggleWidget(),
      });
    }
  }

  /**
   * Generates and renders all of the widget's DOM elements.
   */
  renderWidget() {
    console.debug("[Dub] Rendering widget.");

    const {
      token,
      variant,
      root,
      containerStyles,
      popupStyles,
      onError,
      onTokenExpired,
    } = this.options;

    const existingContainer = document.getElementById(
      `${this.prefix}${DUB_CONTAINER_ID}`,
    );

    if (existingContainer) return existingContainer;

    if (!token) {
      console.error("[Dub] A link token is required to embed the widget.");
      return null;
    }

    const container = document.createElement("div");
    container.id = `${this.prefix}${DUB_CONTAINER_ID}`;
    Object.assign(container.style, {
      ...(variant === "inline"
        ? INLINE_CONTAINER_STYLES
        : { ...CONTAINER_STYLES, visibility: "hidden" }),
      ...containerStyles,
    });

    if (variant === "inline") {
      const iframe = createIframe(INLINE_URL, token);
      container.appendChild(iframe);
    } else {
      container.addEventListener("click", (e) => {
        if (e.target === container) this.closeWidget();
      });

      const popup: HTMLElement =
        container.querySelector(
          "#" + CSS.escape(`${this.prefix}${DUB_POPUP_ID}`),
        ) ?? document.createElement("div");
      popup.id = `${this.prefix}${DUB_POPUP_ID}`;
      Object.assign(popup.style, {
        ...POPUP_STYLES,
        ...popupStyles,
      });

      const iframe = createIframe(WIDGET_URL, token);

      // Close button
      const closeButton = document.createElement("button");
      closeButton.id = `${this.prefix}${DUB_CLOSE_BUTTON_ID}`;
      closeButton.innerHTML = CLOSE_ICON;
      Object.assign(closeButton.style, CLOSE_BUTTON_STYLES);
      closeButton.addEventListener("click", () => this.closeWidget());

      popup.appendChild(iframe);
      popup.appendChild(closeButton);
      container.appendChild(popup);
    }

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

    (root ?? document.body).appendChild(container);

    return container;
  }

  /**
   * Checks if the widget is open.
   */
  isWidgetOpen() {
    const container = document.getElementById(
      `${this.prefix}${DUB_CONTAINER_ID}`,
    );
    return container?.style.visibility !== "hidden";
  }

  /**
   * Opens the widget.
   */
  openWidget() {
    const popup = document.getElementById(`${this.prefix}${DUB_POPUP_ID}`);
    const container = document.getElementById(
      `${this.prefix}${DUB_CONTAINER_ID}`,
    );
    if (!popup) {
      console.error("[Dub] No popup found.");
      return;
    }

    if (container) {
      container.style.visibility = "visible";
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
  }

  /**
   * Closes the widget.
   */
  closeWidget() {
    const popup = document.getElementById(`${this.prefix}${DUB_POPUP_ID}`);
    const container = document.getElementById(
      `${this.prefix}${DUB_CONTAINER_ID}`,
    );
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
        container.style.visibility = "hidden";
      };
    }
  }

  /**
   * Toggles the widget open state.
   */
  toggleWidget() {
    this.isWidgetOpen() ? this.closeWidget() : this.openWidget();
  }

  /**
   * Destroys the widget, removing any remaining DOM elements.
   */
  destroy() {
    document.getElementById(`${this.prefix}${DUB_CONTAINER_ID}`)?.remove();
    document
      .getElementById(`${this.prefix}${DUB_FLOATING_BUTTON_ID}`)
      ?.remove();
  }
}

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
 * Initializes the Dub embed widget.
 */
export const init = (options: DubOptions): DubInitResult => {
  const widget = new DubWidget(options);

  return {
    openWidget: widget.openWidget.bind(widget),
    closeWidget: widget.closeWidget.bind(widget),
    toggleWidget: widget.toggleWidget.bind(widget),
    isWidgetOpen: widget.isWidgetOpen.bind(widget),
    destroy: widget.destroy.bind(widget),
  };
};
