import { init } from "./core";
import { DubEmbed } from "./types";

declare global {
  interface Window {
    Dub: DubEmbed;
  }
}

if (typeof window !== "undefined") {
  window.Dub = (window.Dub || {}) as DubEmbed;
  window.Dub.init = init;
}
