(function () {
  // Add a floating button to the page
  function createFloatingButton() {
    const button = document.createElement("div");
    button.id = "floating-widget-button";
    button.innerHTML = `
      <button>
        <span>💬</span>
      </button>
    `;

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