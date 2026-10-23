/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from "vitest";
import {
  deleteEditorColumn,
  deleteEditorRow,
  deleteTableStructureOnKey,
  textPosInCell,
} from "../../../../packages/ui/src/rich-text-area/table-keyboard";
import {
  columnCount,
  createTableEditor,
  rowCount,
  selectCellRange,
  setCaretAtText,
  setCaretInParagraph,
} from "../../../../packages/ui/src/rich-text-area/table-keyboard.harness";

const editors: ReturnType<typeof createTableEditor>[] = [];

function createEditor(html: string) {
  const editor = createTableEditor(html);
  editors.push(editor);
  return editor;
}

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
  document.body.innerHTML = "";
});

function key(name: string, modifiers: Partial<KeyboardEventInit> = {}) {
  return new KeyboardEvent("keydown", { key: name, ...modifiers });
}

const TWO_ROW_TABLE = `
  <table>
    <tbody>
      <tr><th><p></p></th><th><p></p></th></tr>
      <tr><td><p>Keep</p></td><td><p>Me</p></td></tr>
    </tbody>
  </table>
`;

describe("table keyboard deletion", () => {
  it("removes an empty row with Backspace or Delete and leaves the other row", () => {
    const editor = createEditor(TWO_ROW_TABLE);
    setCaretInParagraph(editor, 0);

    expect(deleteTableStructureOnKey(editor, key("Backspace"))).toBe(true);
    expect(rowCount(editor)).toBe(1);
    expect(editor.getText()).toContain("Keep");
    expect(editor.getText()).toContain("Me");

    const remaining = createEditor(TWO_ROW_TABLE);
    setCaretInParagraph(remaining, 0);
    expect(deleteTableStructureOnKey(remaining, key("Delete"))).toBe(true);
    expect(rowCount(remaining)).toBe(1);
  });

  it("does not remove a row that still has text", () => {
    const editor = createEditor(TWO_ROW_TABLE);
    setCaretAtText(editor, "Keep", 0);

    expect(deleteTableStructureOnKey(editor, key("Backspace"))).toBe(false);
    expect(rowCount(editor)).toBe(2);
    expect(editor.getText()).toContain("Keep");

    setCaretAtText(editor, "Keep", 2);
    expect(deleteTableStructureOnKey(editor, key("Backspace"))).toBe(false);
    expect(editor.getText()).toContain("Keep");
  });

  it("ignores Backspace outside a table and modified Backspace inside one", () => {
    const editor = createEditor("<p>Hello</p>");
    editor.commands.focus("start");
    expect(deleteTableStructureOnKey(editor, key("Backspace"))).toBe(false);
    expect(editor.getText()).toBe("Hello");

    const table = createEditor(TWO_ROW_TABLE);
    setCaretInParagraph(table, 0);
    expect(
      deleteTableStructureOnKey(table, key("Backspace", { metaKey: true })),
    ).toBe(false);
    expect(rowCount(table)).toBe(2);
  });

  it("treats a whitespace-only row as empty", () => {
    const editor = createEditor(`
      <table>
        <tbody>
          <tr><td><p> &nbsp; </p></td></tr>
          <tr><td><p>Stay</p></td></tr>
        </tbody>
      </table>
    `);
    setCaretInParagraph(editor, 0);

    expect(deleteTableStructureOnKey(editor, key("Backspace"))).toBe(true);
    expect(editor.getText()).toContain("Stay");
    expect(rowCount(editor)).toBe(1);
  });

  it("replaces a table with a paragraph when its last row is removed", () => {
    const editor = createEditor(`
      <table>
        <tbody>
          <tr><td><p></p></td><td><p></p></td></tr>
        </tbody>
      </table>
    `);
    setCaretInParagraph(editor, 0);

    expect(deleteTableStructureOnKey(editor, key("Backspace"))).toBe(true);
    expect(rowCount(editor)).toBe(0);
    expect(editor.getHTML()).toContain("<p>");
    expect(editor.getText()).toBe("");
  });

  it("deletes the hovered cell's row after resolving that cell in the editor", () => {
    const editor = createEditor(TWO_ROW_TABLE);
    const cell = editor.view.dom.querySelector("td");
    if (!(cell instanceof HTMLTableCellElement)) {
      throw new Error("Missing table cell");
    }

    const pos = textPosInCell(editor, editor.view.posAtDOM(cell, 0));
    editor.chain().focus().setTextSelection(pos).run();
    expect(editor.state.selection.$from.parent.textContent).toBe("Keep");
    expect(deleteEditorRow(editor)).toBe(true);
    expect(editor.getText()).not.toContain("Keep");
    expect(editor.getText()).not.toContain("Me");
    expect(rowCount(editor)).toBe(1);
  });

  it("deletes a row or column that still has text from the row and column actions", () => {
    const editor = createEditor(TWO_ROW_TABLE);
    setCaretAtText(editor, "Me", 1);

    expect(deleteEditorColumn(editor)).toBe(true);
    expect(columnCount(editor)).toBe(1);
    expect(editor.getText()).toContain("Keep");
    expect(editor.getText()).not.toContain("Me");

    setCaretAtText(editor, "Keep", 1);
    expect(deleteEditorRow(editor)).toBe(true);
    expect(rowCount(editor)).toBe(1);
    expect(editor.getText()).not.toContain("Keep");
  });

  it("removes a fully selected row and leaves the table alone when every cell is selected", () => {
    const editor = createEditor(TWO_ROW_TABLE);
    selectCellRange(editor, 0, 1);

    expect(deleteTableStructureOnKey(editor, key("Backspace"))).toBe(true);
    expect(rowCount(editor)).toBe(1);
    expect(editor.getText()).toContain("Keep");

    selectCellRange(editor, 0, 1);
    expect(deleteTableStructureOnKey(editor, key("Delete"))).toBe(false);
    expect(rowCount(editor)).toBe(1);
  });
});
