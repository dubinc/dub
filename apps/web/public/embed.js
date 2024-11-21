(function () {
  window.Dub = window.Dub || {};

  // Default configurations
  Dub.options = {
    linkToken: null,
  };

  // Add a floating button to the page
  function createFloatingButton() {
    const button = document.createElement("div");
    button.id = "floating-widget-button";

    // Add styles for positioning and appearance
    button.style.position = "fixed";
    button.style.bottom = "20px";
    button.style.right = "20px";
    button.style.zIndex = "9999";

    button.innerHTML = `
      <button>
        <span>Click Me</span>
      </button>
    `;

    // Load widget on click
    button.addEventListener("click", () => {
      if (!Dub.options.linkToken) {
        console.error("Link token is required");
        return;
      }

      // Create iframe container
      const container = document.createElement("div");
      container.id = "dub-widget-container";
      container.style.position = "fixed";
      container.style.bottom = "80px";
      container.style.right = "20px";
      container.style.width = "400px";
      container.style.height = "600px";
      container.style.zIndex = "9998";
      container.style.boxShadow = "0 0 20px rgba(0,0,0,0.1)";
      container.style.borderRadius = "10px";
      container.style.overflow = "hidden";
      container.style.padding = "10px";

      // Create iframe
      const iframe = document.createElement("iframe");
      iframe.src = `http://localhost:8888/embed?token=${Dub.options.linkToken}`;
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.setAttribute("credentialssupport", "");
      iframe.setAttribute("allow", "same-origin");
      iframe.crossOrigin = "use-credentials";

      container.appendChild(iframe);
      document.body.appendChild(container);
    });

    document.body.appendChild(button);
  }

  // Initialize when DOM is ready
  function init() {
    setTimeout(createFloatingButton, 100);
    console.log("Initialized");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
