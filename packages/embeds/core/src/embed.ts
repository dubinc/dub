import { closeWidget, destroy, init, openWidget, toggleWidget } from "./core";
import { DubEmbed } from "./types";

declare global {
  interface Window {
    Dub: DubEmbed;
  }
}

if (typeof window !== "undefined") {
  window.Dub = (window.Dub || {}) as DubEmbed;
  window.Dub.init = init;
  window.Dub.destroy = destroy;
  window.Dub.toggleWidget = toggleWidget;
  window.Dub.openWidget = openWidget;
  window.Dub.closeWidget = closeWidget;
}
