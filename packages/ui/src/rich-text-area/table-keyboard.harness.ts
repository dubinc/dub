// Test-only helpers. The UI package does not export this file.
import { TableKit } from "@tiptap/extension-table";
import { CellSelection } from "@tiptap/pm/tables";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export function createTableEditor(html: string) {
  const element = document.createElement("div");
  document.body.append(element);

  return new Editor({
    element,
    extensions: [StarterKit, TableKit],
    content: html,
  });
}

export function rowCount(editor: Editor) {
  let count = 0;
  editor.state.doc.descendants((node) => {
    if (node.type.name === "tableRow") count += 1;
  });
  return count;
}

export function columnCount(editor: Editor) {
  let count = 0;
  editor.state.doc.descendants((node) => {
    if (node.type.name !== "tableRow" || count > 0) return;
    count = node.childCount;
  });
  return count;
}

export function setCaretAtText(editor: Editor, text: string, offset = 0) {
  let found = -1;
  editor.state.doc.descendants((node, pos) => {
    if (found !== -1) return false;
    if (!node.isText || !node.text?.includes(text)) return;
    found = pos + node.text.indexOf(text) + offset;
    return false;
  });
  if (found < 0) throw new Error(`Couldn't find "${text}"`);
  editor.commands.setTextSelection(found);
}

export function setCaretInParagraph(editor: Editor, index: number) {
  let seen = 0;
  let found = -1;
  editor.state.doc.descendants((node, pos) => {
    if (found !== -1) return false;
    if (node.type.name !== "paragraph") return;
    if (seen === index) {
      found = pos + 1;
      return false;
    }
    seen += 1;
  });
  if (found < 0) throw new Error(`Couldn't find paragraph ${index}`);
  editor.commands.setTextSelection(found);
}

export function selectCellRange(editor: Editor, start: number, end: number) {
  const positions: number[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
      positions.push(pos);
    }
  });

  const selection = CellSelection.create(
    editor.state.doc,
    positions[start],
    positions[end],
  );
  editor.view.dispatch(editor.state.tr.setSelection(selection));
}
