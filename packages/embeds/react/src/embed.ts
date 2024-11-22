import { closeWidget, destroy, init, openWidget } from "./embed-core";
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
  window.Dub.openWidget = openWidget;
  window.Dub.closeWidget = closeWidget;
}
