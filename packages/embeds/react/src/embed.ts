// TODO:
// - Add a loading state
// - Add a close button
// - Inline embed (dashboard)
// - Floating button + widget
// - Open on a button click
// - Reuse addEventListener logic 

import { DubOptions } from "./types";

declare global {
  interface Window {
    Dub: DubOptions;
  }
}

window.Dub = window.Dub || {};

const buttonStyles: Partial<CSSStyleDeclaration> = {
  position: "fixed",
  bottom: "20px",
  right: "20px",
  zIndex: "9999",
};

const containerStyles: Partial<CSSStyleDeclaration> = {
  width: "450px",
  height: "600px",
  boxShadow: "0 0 20px rgba(0,0,0,0.1)",
  borderRadius: "10px",
  overflow: "hidden",
  position: "fixed",
  bottom: "80px",
  right: "20px",
  zIndex: "9998",
};

const defaultOptions = {
  url: "http://localhost:8888/embed/widget",
};

const getOptions = (): DubOptions & { url: string } => {
  return {
    ...defaultOptions,
    ...window.Dub,
  };
};

const createIframe = (iframeUrl: string, token: string): HTMLIFrameElement => {
  const iframe = document.createElement("iframe");

  iframe.src = `${iframeUrl}?token=${token}`;
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.setAttribute("credentialssupport", "");

  return iframe;
};

// Initialize when an external button is clicked
const initializeButton = (): void => {
  const button = document.querySelector(
    "[data-dub-token]",
  ) as HTMLElement | null;

  if (!button) {
    console.error("[Dub] No button found with data-dub-token.");
    return;
  }

  button.addEventListener("click", () => {
    const existingContainer = document.getElementById("dub-widget-container");

    if (existingContainer) {
      // If the container exists, remove it (close the widget)
      document.body.removeChild(existingContainer);
      return;
    }

    const token = button.getAttribute("data-dub-token");

    if (!token) {
      console.error("[Dub] A link token is required to embed the widget.");
      return;
    }

    const { url } = getOptions();

    const container = document.createElement("div");
    container.id = "dub-widget-container";
    Object.assign(container.style, containerStyles);

    const iframe = createIframe(url, token);

    container.appendChild(iframe);
    document.body.appendChild(container);
  });
};

// Initialize when Dub floating button is clicked
const createFloatingButton = (): void => {
  const button = document.createElement("div");
  Object.assign(button.style, buttonStyles);

  button.innerHTML = `
      <button>
        <span>Click Me</span>
      </button>
    `;

  button.addEventListener("click", () => {
    const existingContainer = document.getElementById("dub-widget-container");

    if (existingContainer) {
      // If the container exists, remove it (close the widget)
      document.body.removeChild(existingContainer);
      return;
    }

    const { token, url } = getOptions();

    if (!token) {
      console.error("[Dub] A link token is required to embed the widget.");
      return;
    }

    const container = document.createElement("div");
    container.id = "dub-widget-container";
    Object.assign(container.style, containerStyles);

    const iframe = createIframe(url, token);

    container.appendChild(iframe);
    document.body.appendChild(container);
  });

  document.body.appendChild(button);
};

// Initialize when DOM is ready
const init = () => {
  console.debug("[Dub] Initializing");
  //setTimeout(createFloatingButton, 100);
  setTimeout(initializeButton, 100);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
