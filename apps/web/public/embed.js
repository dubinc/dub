

(function () {
  window.Dub = window.Dub || {};

  // Default configurations
  Dub.options = {
    linkToken: null,
    widgetUrl: "http://localhost:8888/embed/widget",
    dashboardUrl: "http://localhost:8888/embed/dashboard",
  };

  const buttonStyles = {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "9999",
  };

  const containerStyles = {
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

  const createIframe = (iframeUrl, linkToken) => {
    const iframe = document.createElement("iframe");

    iframe.src = `${iframeUrl}?token=${linkToken}`;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.setAttribute("credentialssupport", "");
    iframe.setAttribute("allow", "same-origin");
    iframe.crossOrigin = "use-credentials";

    return iframe;
  };

  // Find the button that should trigger the widget open
  const initializeDubButton = () => {
    const button = document.querySelector("[data-dub-token]");

    if (!button) {
      console.log("No button found with data-dub-token");
      return;
    }

    button.addEventListener("click", () => {
      console.log("Button clicked");
    });
  };

  // Add a floating button
  const createFloatingButton = () => {
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

      if (!Dub.options.linkToken) {
        console.error("Link token is required");
        return;
      }

      const container = document.createElement("div");
      container.id = "dub-widget-container";
      Object.assign(container.style, containerStyles);

      const { iframeUrl, linkToken } = Dub.options;

      const iframe = createIframe(iframeUrl, linkToken);

      container.appendChild(iframe);
      document.body.appendChild(container);
    });

    document.body.appendChild(button);
  };

  // Initialize when DOM is ready
  function init() {
    setTimeout(createFloatingButton, 100);
    // setTimeout(initializeDubButton, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
