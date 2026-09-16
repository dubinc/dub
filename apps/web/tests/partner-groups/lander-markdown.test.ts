import {
  LANDER_MARKDOWN_ALLOWED_ELEMENTS,
  LANDER_RICH_TEXT_FEATURES,
} from "@/ui/partners/lander/lander-markdown";
import { describe, expect, test } from "vitest";

type LanderRichTextFeature = (typeof LANDER_RICH_TEXT_FEATURES)[number];

const FEATURE_FOR_ELEMENT: Record<string, LanderRichTextFeature | null> = {
  h1: "headings",
  h2: "headings",
  h3: "headings",
  h4: "headings",
  h5: "headings",
  h6: "headings",
  strong: "bold",
  em: "italic",
  del: "strike",
  a: "links",
  ul: "lists",
  ol: "lists",
  li: "lists",
  blockquote: "quote",
  code: null,
  table: "tables",
  thead: "tables",
  tbody: "tables",
  tr: "tables",
  th: "tables",
  td: "tables",
  p: null,
  br: null,
  hr: null,
  pre: null,
  input: null,
  img: null,
};

describe("lander markdown", () => {
  test("every renderable element has a matching editor feature", () => {
    const missing = LANDER_MARKDOWN_ALLOWED_ELEMENTS.filter((element) => {
      const feature = FEATURE_FOR_ELEMENT[element];
      return (
        feature !== null &&
        !LANDER_RICH_TEXT_FEATURES.includes(feature as LanderRichTextFeature)
      );
    });

    expect(missing).toEqual([]);
  });

  test("every renderable element is accounted for in the mapping", () => {
    const unmapped = LANDER_MARKDOWN_ALLOWED_ELEMENTS.filter(
      (element) => !(element in FEATURE_FOR_ELEMENT),
    );

    expect(unmapped).toEqual([]);
  });

  test.each(["img", "del", "hr", "pre", "code", "input"])(
    "keeps rendering %s",
    (element) => {
      expect(LANDER_MARKDOWN_ALLOWED_ELEMENTS).toContain(element);
    },
  );
});
