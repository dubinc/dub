"use client";

import { cn } from "@dub/utils";
import { CellSelection } from "@tiptap/pm/tables";
import type { Editor } from "@tiptap/react";
import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GripDotsVertical, Plus, Trash } from "../icons";
import { IconTooltip, IconTooltipProvider } from "./icon-tooltip";
import { useRichTextContext } from "./rich-text-provider";
import {
  deleteEditorColumn,
  deleteEditorRow,
  deleteEditorTable,
  textPosInCell,
} from "./table-keyboard";

const CONTROL_ATTR = "data-table-controls";
const EDGE_PX = 10;

type CellTarget = {
  table: HTMLTableElement;
  row: HTMLTableRowElement;
  cell: HTMLTableCellElement;
};

type PointerTarget = {
  table: HTMLTableElement;
  cell: HTMLTableCellElement | null;
  addRow: boolean;
  addCol: boolean;
};

type MenuState = {
  kind: "row" | "col";
  cellPos: number;
  target: CellTarget;
};

export function TableHoverControls() {
  const { editor, editable } = useRichTextContext();
  const [pointer, setPointer] = useState<PointerTarget | null>(null);
  const [selectionTarget, setSelectionTarget] = useState<CellTarget | null>(
    null,
  );
  const [editorFocused, setEditorFocused] = useState(false);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!editor || editable === false || editor.isDestroyed) return;

    let editorDom: HTMLElement;
    try {
      editorDom = editor.view.dom as HTMLElement;
    } catch {
      return;
    }

    const remeasure = () => setTick((value) => value + 1);

    const syncSelection = () => {
      setSelectionTarget(cellTargetFromSelection(editor));
      setMenu((current) => (current?.target.cell.isConnected ? current : null));
      setPointer((current) => (current?.table.isConnected ? current : null));
    };

    const syncFocus = () => {
      const active = document.activeElement;
      setEditorFocused(active === editorDom || editorDom.contains(active));
    };

    const onMouseMove = (event: MouseEvent) => {
      const el = document.elementFromPoint(event.clientX, event.clientY);
      if (el instanceof Element && el.closest(`[${CONTROL_ATTR}]`)) return;
      if (menu) return;

      setPointer((current) => {
        const next = getPointerTarget(event.clientX, event.clientY, editorDom);
        return samePointer(current, next) ? current : next;
      });
    };

    syncSelection();
    syncFocus();
    document.addEventListener("mousemove", onMouseMove);
    editorDom.addEventListener("focusin", syncFocus);
    editorDom.addEventListener("focusout", syncFocus);
    window.addEventListener("scroll", remeasure, true);
    window.addEventListener("resize", remeasure);
    editor.on("selectionUpdate", syncSelection);
    editor.on("update", syncSelection);
    editor.on("update", remeasure);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      editorDom.removeEventListener("focusin", syncFocus);
      editorDom.removeEventListener("focusout", syncFocus);
      window.removeEventListener("scroll", remeasure, true);
      window.removeEventListener("resize", remeasure);
      editor.off("selectionUpdate", syncSelection);
      editor.off("update", syncSelection);
      editor.off("update", remeasure);
    };
  }, [editor, editable, menu]);

  useEffect(() => {
    if (!menu || !editor) return;

    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest(`[${CONTROL_ATTR}]`)
      ) {
        return;
      }
      setMenu(null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menu, editor]);

  if (!editor || editable === false || editor.isDestroyed) return null;

  let editorDom: HTMLElement;
  try {
    editorDom = editor.view.dom as HTMLElement;
  } catch {
    return null;
  }
  const pointerCell = pointer?.cell ? targetFromCell(pointer.cell) : null;
  const active =
    (menu?.target.cell.isConnected ? menu.target : null) ??
    (pointerCell?.cell.isConnected ? pointerCell : null) ??
    (editorFocused && selectionTarget?.cell.isConnected
      ? selectionTarget
      : null);

  const edgeTable = pointer?.table.isConnected ? pointer.table : null;

  if (!active && !edgeTable) return null;

  const runOnCell = (cellPos: number, command: () => void) => {
    editor.chain().focus().setTextSelection(cellPos).run();
    command();
    setMenu(null);
    setPointer(null);
  };

  const tableForEdge = edgeTable ?? active?.table ?? null;
  const lastRowCell =
    tableForEdge?.rows[tableForEdge.rows.length - 1]?.cells[0] ?? null;
  const lastColCell = tableForEdge?.rows[0]
    ? tableForEdge.rows[0].cells[tableForEdge.rows[0].cells.length - 1]
    : null;

  const tableRect = tableForEdge?.getBoundingClientRect();
  const visible =
    tableRect && intersectRect(tableRect, editorDom.getBoundingClientRect());

  const addRowPos =
    pointer?.addRow && visible && tableRect
      ? { x: visible.left + visible.width / 2, y: tableRect.bottom }
      : null;
  const addColPos =
    pointer?.addCol && visible && tableRect
      ? { x: tableRect.right, y: visible.top + visible.height / 2 }
      : null;

  let menuPos: { top: number; left: number } | null = null;
  if (menu && active) {
    const anchorRect = active.table.getBoundingClientRect();
    if (menu.kind === "row") {
      const rowRect = active.row.getBoundingClientRect();
      menuPos = {
        top: rowRect.top + rowRect.height / 2,
        left: anchorRect.left - 16,
      };
    } else {
      const colRect = getColumnRect(active.table, active.cell.cellIndex);
      if (colRect) {
        menuPos = {
          top: anchorRect.top - 16,
          left: colRect.left + colRect.width / 2,
        };
      }
    }
  }

  return createPortal(
    <IconTooltipProvider>
      <div className="pointer-events-none fixed inset-0 z-[99]">
        {addRowPos && lastRowCell && (
          <ControlButton
            label="Add row"
            className="absolute"
            style={{
              top: addRowPos.y,
              left: addRowPos.x,
              transform: "translate(-50%, -50%)",
            }}
            onClick={() =>
              runOnCell(posAtCell(editor, lastRowCell), () =>
                editor.chain().focus().addRowAfter().run(),
              )
            }
          >
            <Plus className="size-3.5" />
          </ControlButton>
        )}

        {addColPos && lastColCell && (
          <ControlButton
            label="Add column"
            className="absolute"
            style={{
              top: addColPos.y,
              left: addColPos.x,
              transform: "translate(-50%, -50%)",
            }}
            onClick={() =>
              runOnCell(posAtCell(editor, lastColCell), () =>
                editor.chain().focus().addColumnAfter().run(),
              )
            }
          >
            <Plus className="size-3.5" />
          </ControlButton>
        )}

        {active && (
          <RowControls
            editor={editor}
            editorDom={editorDom}
            target={active}
            menu={menu}
            onDelete={(cellPos) =>
              runOnCell(cellPos, () => deleteEditorRow(editor))
            }
            onToggleMenu={(next) => setMenu(next)}
          />
        )}

        {active && (
          <ColumnControls
            editor={editor}
            editorDom={editorDom}
            target={active}
            menu={menu}
            onDelete={(cellPos) =>
              runOnCell(cellPos, () => deleteEditorColumn(editor))
            }
            onToggleMenu={(next) => setMenu(next)}
          />
        )}

        {menu && menuPos && (
          <div
            data-table-controls=""
            className="pointer-events-auto absolute min-w-36 rounded-lg border border-neutral-200 bg-white p-1 shadow-md"
            style={{
              top: menuPos.top,
              left: menuPos.left,
              transform:
                menu.kind === "row"
                  ? "translate(-100%, -50%)"
                  : "translate(-50%, -100%)",
            }}
          >
            {menu.kind === "row" ? (
              <>
                <MenuButton
                  onClick={() =>
                    runOnCell(menu.cellPos, () =>
                      editor.chain().focus().addRowBefore().run(),
                    )
                  }
                >
                  Insert row above
                </MenuButton>
                <MenuButton
                  onClick={() =>
                    runOnCell(menu.cellPos, () =>
                      editor.chain().focus().addRowAfter().run(),
                    )
                  }
                >
                  Insert row below
                </MenuButton>
                <MenuButton
                  danger
                  onClick={() =>
                    runOnCell(menu.cellPos, () => deleteEditorRow(editor))
                  }
                >
                  Delete row
                </MenuButton>
                <div className="my-1 h-px bg-neutral-200" />
                <MenuButton
                  danger
                  onClick={() =>
                    runOnCell(menu.cellPos, () => deleteEditorTable(editor))
                  }
                >
                  Delete table
                </MenuButton>
              </>
            ) : (
              <>
                <MenuButton
                  onClick={() =>
                    runOnCell(menu.cellPos, () =>
                      editor.chain().focus().addColumnBefore().run(),
                    )
                  }
                >
                  Insert column left
                </MenuButton>
                <MenuButton
                  onClick={() =>
                    runOnCell(menu.cellPos, () =>
                      editor.chain().focus().addColumnAfter().run(),
                    )
                  }
                >
                  Insert column right
                </MenuButton>
                <MenuButton
                  danger
                  onClick={() =>
                    runOnCell(menu.cellPos, () => deleteEditorColumn(editor))
                  }
                >
                  Delete column
                </MenuButton>
                <div className="my-1 h-px bg-neutral-200" />
                <MenuButton
                  danger
                  onClick={() =>
                    runOnCell(menu.cellPos, () => deleteEditorTable(editor))
                  }
                >
                  Delete table
                </MenuButton>
              </>
            )}
          </div>
        )}
      </div>
    </IconTooltipProvider>,
    document.body,
  );
}

function RowControls({
  editor,
  editorDom,
  target,
  menu,
  onDelete,
  onToggleMenu,
}: {
  editor: Editor;
  editorDom: HTMLElement;
  target: CellTarget;
  menu: MenuState | null;
  onDelete: (cellPos: number) => void;
  onToggleMenu: (menu: MenuState | null) => void;
}) {
  const editorRect = editorDom.getBoundingClientRect();
  const tableRect = target.table.getBoundingClientRect();
  const rowRect = target.row.getBoundingClientRect();

  if (rowRect.bottom < editorRect.top || rowRect.top > editorRect.bottom) {
    return null;
  }
  if (tableRect.right < editorRect.left || tableRect.left > editorRect.right) {
    return null;
  }

  const top = Math.min(
    Math.max(rowRect.top + rowRect.height / 2, editorRect.top + 14),
    editorRect.bottom - 14,
  );
  const cellPos = posAtCell(editor, target.cell);

  return (
    <div
      data-table-controls=""
      className="pointer-events-auto absolute flex flex-col gap-0.5"
      style={{
        top,
        left: tableRect.left,
        transform: "translate(-50%, -50%)",
      }}
    >
      <ControlButton
        label="Delete row"
        danger
        onClick={() => onDelete(cellPos)}
      >
        <Trash className="size-3" />
      </ControlButton>
      <ControlButton
        label="Row options"
        active={menu?.kind === "row"}
        onClick={() =>
          onToggleMenu(
            menu?.kind === "row" ? null : { kind: "row", cellPos, target },
          )
        }
      >
        <GripDotsVertical className="size-3.5" />
      </ControlButton>
    </div>
  );
}

function ColumnControls({
  editor,
  editorDom,
  target,
  menu,
  onDelete,
  onToggleMenu,
}: {
  editor: Editor;
  editorDom: HTMLElement;
  target: CellTarget;
  menu: MenuState | null;
  onDelete: (cellPos: number) => void;
  onToggleMenu: (menu: MenuState | null) => void;
}) {
  const editorRect = editorDom.getBoundingClientRect();
  const tableRect = target.table.getBoundingClientRect();
  const colRect = getColumnRect(target.table, target.cell.cellIndex);
  if (!colRect) return null;

  if (tableRect.bottom < editorRect.top || tableRect.top > editorRect.bottom) {
    return null;
  }
  if (colRect.right < editorRect.left || colRect.left > editorRect.right) {
    return null;
  }

  const cellPos = posAtCell(editor, target.cell);
  const top = Math.max(tableRect.top, editorRect.top + 10);

  return (
    <div
      data-table-controls=""
      className="pointer-events-auto absolute flex gap-0.5"
      style={{
        top,
        left: colRect.left + colRect.width / 2,
        transform: "translate(-50%, -50%)",
      }}
    >
      <ControlButton
        label="Delete column"
        danger
        onClick={() => onDelete(cellPos)}
      >
        <Trash className="size-3" />
      </ControlButton>
      <ControlButton
        label="Column options"
        active={menu?.kind === "col"}
        onClick={() =>
          onToggleMenu(
            menu?.kind === "col" ? null : { kind: "col", cellPos, target },
          )
        }
      >
        <GripDotsVertical className="size-3.5 rotate-90" />
      </ControlButton>
    </div>
  );
}

function ControlButton({
  label,
  style,
  className,
  active,
  danger,
  onClick,
  children,
}: {
  label: string;
  style?: CSSProperties;
  className?: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <IconTooltip label={label}>
      <button
        type="button"
        style={style}
        aria-label={label}
        data-table-controls=""
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={onClick}
        className={cn(
          "pointer-events-auto flex size-5 items-center justify-center rounded-md border bg-white text-neutral-500 shadow-sm",
          "hover:bg-neutral-50 hover:text-neutral-800",
          danger && "hover:border-red-200 hover:bg-red-50 hover:text-red-600",
          active
            ? "border-neutral-300 bg-neutral-50 text-neutral-800"
            : "border-neutral-200",
          className,
        )}
      >
        {children}
        <span className="sr-only">{label}</span>
      </button>
    </IconTooltip>
  );
}

function MenuButton({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={onClick}
      className={cn(
        "flex h-8 w-full items-center rounded-md px-2 text-left text-xs font-medium",
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-neutral-700 hover:bg-neutral-50",
      )}
    >
      {children}
    </button>
  );
}

function getPointerTarget(
  x: number,
  y: number,
  editorDom: HTMLElement,
): PointerTarget | null {
  const direct = document.elementFromPoint(x, y);
  const directCell =
    direct instanceof Element ? direct.closest("td, th") : null;

  if (
    directCell instanceof HTMLTableCellElement &&
    editorDom.contains(directCell)
  ) {
    const table = directCell.closest("table");
    if (table instanceof HTMLTableElement) {
      return {
        table,
        cell: directCell,
        ...edgeFlags(table, x, y, editorDom),
      };
    }
  }

  const clip = editorDom.getBoundingClientRect();
  const tables = editorDom.querySelectorAll("table");

  for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
    const table = tables[tableIndex];
    if (!(table instanceof HTMLTableElement)) continue;

    const rect = table.getBoundingClientRect();
    if (!intersectRect(rect, clip)) continue;

    const near =
      x >= rect.left - EDGE_PX &&
      x <= rect.right + EDGE_PX &&
      y >= rect.top - EDGE_PX &&
      y <= rect.bottom + EDGE_PX;

    if (!near) continue;

    const { addRow, addCol } = edgeFlags(table, x, y, editorDom);
    if (!addRow && !addCol) continue;

    return { table, cell: cellNearPoint(table, x, y), addRow, addCol };
  }

  return null;
}

function edgeFlags(
  table: HTMLTableElement,
  x: number,
  y: number,
  editorDom: HTMLElement,
) {
  const rect = table.getBoundingClientRect();
  const clip = editorDom.getBoundingClientRect();
  const visible = intersectRect(rect, clip);
  const alongX = !!visible && x >= visible.left && x <= visible.right;
  const alongY = !!visible && y >= visible.top && y <= visible.bottom;
  const bottomVisible = rect.bottom >= clip.top && rect.bottom <= clip.bottom;
  const rightVisible = rect.right >= clip.left && rect.right <= clip.right;

  return {
    addRow: bottomVisible && alongX && Math.abs(y - rect.bottom) <= EDGE_PX,
    addCol: rightVisible && alongY && Math.abs(x - rect.right) <= EDGE_PX,
  };
}

function cellNearPoint(table: HTMLTableElement, x: number, y: number) {
  let closest: HTMLTableCellElement | null = null;
  let best = Infinity;

  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex++) {
    const row = table.rows[rowIndex];
    const rowRect = row.getBoundingClientRect();
    if (y < rowRect.top - EDGE_PX || y > rowRect.bottom + EDGE_PX) continue;

    for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex++) {
      const cell = row.cells[cellIndex];
      const cellRect = cell.getBoundingClientRect();
      const dx =
        x < cellRect.left
          ? cellRect.left - x
          : x > cellRect.right
            ? x - cellRect.right
            : 0;
      const dy =
        y < cellRect.top
          ? cellRect.top - y
          : y > cellRect.bottom
            ? y - cellRect.bottom
            : 0;
      const distance = dx + dy;
      if (distance < best) {
        best = distance;
        closest = cell;
      }
    }
  }

  return closest;
}

function samePointer(
  current: PointerTarget | null,
  next: PointerTarget | null,
) {
  if (current === next) return true;
  if (!current || !next) return false;
  return (
    current.table === next.table &&
    current.cell === next.cell &&
    current.addRow === next.addRow &&
    current.addCol === next.addCol
  );
}

function targetFromCell(cell: HTMLTableCellElement): CellTarget | null {
  const row = cell.parentElement;
  const table = cell.closest("table");
  if (
    !(row instanceof HTMLTableRowElement) ||
    !(table instanceof HTMLTableElement)
  ) {
    return null;
  }
  return { table, row, cell };
}

function cellTargetFromSelection(editor: Editor): CellTarget | null {
  if (editor.isDestroyed) return null;

  const { selection } = editor.state;
  const $pos =
    selection instanceof CellSelection
      ? selection.$anchorCell
      : selection.$from;

  for (let depth = $pos.depth; depth > 0; depth--) {
    const name = $pos.node(depth).type.name;
    if (name !== "tableCell" && name !== "tableHeader") continue;

    const dom = editor.view.nodeDOM($pos.before(depth));
    if (!(dom instanceof HTMLTableCellElement)) return null;
    return targetFromCell(dom);
  }

  return null;
}

function posAtCell(editor: Editor, cell: HTMLTableCellElement) {
  try {
    return textPosInCell(editor, editor.view.posAtDOM(cell, 0));
  } catch {
    return editor.state.selection.from;
  }
}

function intersectRect(a: DOMRect, b: DOMRect) {
  const left = Math.max(a.left, b.left);
  const right = Math.min(a.right, b.right);
  const top = Math.max(a.top, b.top);
  const bottom = Math.min(a.bottom, b.bottom);

  if (left >= right || top >= bottom) return null;

  return new DOMRect(left, top, right - left, bottom - top);
}

function getColumnRect(table: HTMLTableElement, columnIndex: number) {
  const cells: HTMLTableCellElement[] = [];
  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex++) {
    const cell = table.rows[rowIndex]?.cells[columnIndex];
    if (cell) cells.push(cell);
  }

  if (!cells.length) return null;

  const first = cells[0].getBoundingClientRect();
  const last = cells[cells.length - 1].getBoundingClientRect();

  return new DOMRect(
    first.left,
    first.top,
    first.width,
    last.bottom - first.top,
  );
}
