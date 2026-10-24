import {
  messageSidePanelClassName,
  nextMessageSidePanelOpen,
} from "@/ui/messages/message-side-panel";
import { describe, expect, it } from "vitest";

describe("message side panel", () => {
  describe("default width", () => {
    it("stays closed below sm and open from sm up", () => {
      const program = messageSidePanelClassName(null, "program");
      const partner = messageSidePanelClassName(null, "partner");

      expect(program).toContain("w-0");
      expect(program).toContain("sm:w-[340px]");
      expect(program).not.toContain("w-full");
      expect(program).toContain(
        "@[960px]/page:shadow-none @[960px]/page:relative",
      );

      expect(partner).toContain("w-0");
      expect(partner).toContain("sm:w-[400px]");
      expect(partner).not.toContain("w-full");
      expect(partner).toContain(
        "@[1082px]/page:shadow-none @[1082px]/page:relative",
      );
    });

    it("covers the thread when opened explicitly", () => {
      const className = messageSidePanelClassName(true, "program");

      expect(className).toContain("w-full");
      expect(className).toContain("sm:w-[340px]");
      expect(className).not.toMatch(/(?:^|\s)w-0(?:\s|$)/);
    });

    it("collapses at every breakpoint when closed explicitly", () => {
      const className = messageSidePanelClassName(false, "partner");

      expect(className).toContain("w-0");
      expect(className).not.toContain("w-full");
      expect(className).not.toContain("sm:w-[400px]");
    });
  });

  describe("toggle", () => {
    it("opens the full-width panel from the mobile default", () => {
      expect(nextMessageSidePanelOpen(null, false)).toBe(true);
    });

    it("closes the panel from the desktop default", () => {
      expect(nextMessageSidePanelOpen(null, true)).toBe(false);
    });

    it("flips an explicit open or closed state", () => {
      expect(nextMessageSidePanelOpen(true, false)).toBe(false);
      expect(nextMessageSidePanelOpen(false, true)).toBe(true);
    });
  });
});
