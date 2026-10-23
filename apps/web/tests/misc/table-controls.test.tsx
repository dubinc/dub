/** @vitest-environment happy-dom */
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import {
  RichTextArea,
  RichTextProvider,
  RichTextToolbar,
} from "../../../../packages/ui/src/rich-text-area";

const TWO_ROW_TABLE = `
  <table>
    <tbody>
      <tr><th><p></p></th><th><p></p></th></tr>
      <tr><td><p>Keep</p></td><td><p>Me</p></td></tr>
    </tbody>
  </table>
`;

let root: Root | null = null;

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  document.body.innerHTML = "";
});

async function renderEditor() {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      <RichTextProvider
        features={[
          "bold",
          "italic",
          "strike",
          "headings",
          "lists",
          "tables",
          "quote",
          "links",
        ]}
        initialValue={TWO_ROW_TABLE}
      >
        <RichTextArea />
        <RichTextToolbar />
      </RichTextProvider>,
    );
  });

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  return container;
}

describe("landing page table controls", () => {
  it("shows toolbar tooltips and a delete button for the active row", async () => {
    const container = await renderEditor();

    for (const label of ["Bold", "Italic", "Table", "Link"]) {
      const button = container.querySelector(`button[aria-label="${label}"]`);
      expect(button, label).toBeTruthy();
      expect(button?.getAttribute("title")).toBeNull();
    }

    const editorDom = container.querySelector(".ProseMirror");
    expect(editorDom).toBeTruthy();

    await act(async () => {
      (editorDom as HTMLElement).focus();
    });

    const deleteRow = document.body.querySelector(
      'button[aria-label="Delete row"]',
    );
    const deleteColumn = document.body.querySelector(
      'button[aria-label="Delete column"]',
    );
    expect(deleteRow).toBeTruthy();
    expect(deleteColumn).toBeTruthy();

    await act(async () => {
      deleteRow?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Keep");
    expect(container.textContent).toContain("Me");
    expect(container.querySelectorAll("tr")).toHaveLength(1);
  });
});
