import type { Node as ProseMirrorNode, ResolvedPos } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";
import type { Editor } from "@tiptap/react";

const CELL_NODE_NAMES = new Set(["tableCell", "tableHeader"]);

function isVisuallyEmpty(node: ProseMirrorNode) {
  let empty = true;

  node.descendants((child) => {
    if (!empty) return false;

    if (child.isText) {
      if (child.text?.replace(/\u00a0/g, " ").trim()) empty = false;
      return false;
    }

    if (child.isAtom && child.type.name !== "hardBreak") {
      empty = false;
      return false;
    }
  });

  return empty;
}

function findParent(
  $pos: ResolvedPos,
  predicate: (node: ProseMirrorNode) => boolean,
) {
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);
    if (predicate(node)) return { node, depth };
  }
  return null;
}

function entireTableSelected(selection: CellSelection) {
  const table = findParent(
    selection.$anchorCell,
    (node) => node.type.name === "table",
  );
  if (!table) return false;

  let cellCount = 0;
  table.node.descendants((node) => {
    if (node.type.name === "table") return false;
    if (CELL_NODE_NAMES.has(node.type.name)) cellCount += 1;
  });

  return cellCount > 0 && cellCount === selection.ranges.length;
}

export function textPosInCell(editor: Editor, pos: number) {
  const $pos = editor.state.doc.resolve(pos);
  return TextSelection.near($pos, 1).from;
}

export function deleteEditorTable(editor: Editor) {
  const { state, view } = editor;
  const $pos = state.selection.$from;

  for (let depth = $pos.depth; depth > 0; depth--) {
    if ($pos.node(depth).type.spec.tableRole !== "table") continue;

    const from = $pos.before(depth);
    const to = $pos.after(depth);
    const parent = $pos.node(depth - 1);
    const paragraph = state.schema.nodes.paragraph;

    if (parent.childCount === 1 && paragraph) {
      const tr = state.tr.replaceWith(from, to, paragraph.create());
      tr.setSelection(TextSelection.near(tr.doc.resolve(from + 1)));
      view.dispatch(tr.scrollIntoView());
      return true;
    }

    return editor.commands.deleteTable();
  }

  return false;
}

export function deleteEditorRow(editor: Editor) {
  if (editor.commands.deleteRow()) return true;
  return deleteEditorTable(editor);
}

export function deleteEditorColumn(editor: Editor) {
  if (editor.commands.deleteColumn()) return true;
  return deleteEditorTable(editor);
}

export function deleteTableStructureOnKey(
  editor: Editor,
  event: KeyboardEvent,
) {
  if (event.isComposing) return false;
  if (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) {
    return false;
  }
  if (event.key !== "Backspace" && event.key !== "Delete") return false;

  const { selection } = editor.state;

  if (selection instanceof CellSelection) {
    if (entireTableSelected(selection)) return false;
    if (selection.isRowSelection()) return deleteEditorRow(editor);
    if (selection.isColSelection()) return deleteEditorColumn(editor);
    return false;
  }

  if (!selection.empty || !editor.isActive("table")) return false;

  const row = findParent(
    selection.$from,
    (node) => node.type.name === "tableRow",
  );
  if (!row || !isVisuallyEmpty(row.node)) return false;

  return deleteEditorRow(editor);
}
