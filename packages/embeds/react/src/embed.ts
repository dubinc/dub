import { DubEmbed, Options } from "./types";

declare global {
  interface Window {
    Dub: DubEmbed;
  }
}

window.Dub = (window.Dub || {}) as DubEmbed;

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

const widgetUrl = "http://localhost:8888/embed/widget";

const createIframe = (iframeUrl: string, token: string): HTMLIFrameElement => {
  const iframe = document.createElement("iframe");

  iframe.src = `${iframeUrl}?token=${token}`;
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.setAttribute("credentialssupport", "");

  return iframe;
};

const renderWidget = (
  options: Pick<Options, "token" | "onOpen" | "onClose">,
): void => {
  const containerId = "dub-widget-container";
  const { token, onOpen, onClose } = options;

  const existingContainer = document.getElementById(containerId);

  if (existingContainer) {
    document.body.removeChild(existingContainer);
    onClose?.();
    return;
  }

  if (!token) {
    console.error("[Dub] A link token is required to embed the widget.");
    return;
  }

  const container = document.createElement("div");
  container.id = containerId;
  Object.assign(container.style, containerStyles);

  const iframe = createIframe(widgetUrl, token);

  container.appendChild(iframe);
  document.body.appendChild(container);

  onOpen?.();
};

// Open the widget via JavaScript API
window.Dub.open = (options: Options) => {
  renderWidget(options);
};

// Initialize when an external button is clicked
const addButtonListener = (): void => {
  const button = document.querySelector(
    "[data-dub-token]",
  ) as HTMLElement | null;

  if (!button) {
    console.error("[Dub] No button found with data-dub-token.");
    return;
  }

  button.addEventListener("click", () => {
    const token = button.getAttribute("data-dub-token");

    if (!token) {
      console.error("[Dub] A link token is required to embed the widget.");
      return;
    }

    renderWidget({ token });
  });
};

// Initialize when DOM is ready
const init = () => {
  console.debug("[Dub] Initializing");
  setTimeout(addButtonListener, 100);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Initialize when Dub floating button is clicked
// const createFloatingButton = (): void => {
//   const button = document.createElement("div");
//   Object.assign(button.style, buttonStyles);

//   button.innerHTML = `
//       <button>
//         <span>Click Me</span>
//       </button>
//     `;

//   button.addEventListener("click", () => {
//     const token = button.getAttribute("data-dub-token");

//     if (!token) {
//       console.error("[Dub] A link token is required to embed the widget.");
//       return;
//     }

//     renderWidget({ token });
//   });

//   document.body.appendChild(button);
// };

// TODO:
// - Add a loading state
// - Add a close button
// - Inline embed (dashboard)
// - Floating button + widget
// - Open on a button click
// - Reuse addEventListener logic

// export {};
