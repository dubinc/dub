"use client";

import { isSafeLinkHref } from "@dub/utils";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "../button";
import { useMediaQuery } from "../hooks";
import { Modal } from "../modal";
import {
  RichTextLinkModalState,
  useRichTextContext,
} from "./rich-text-provider";

/**
 * Prefixes `https://` when the value doesn't already have a usable scheme,
 * so users can enter e.g. "dub.co" or "https://dub.co" interchangeably.
 */
export function normalizeLinkHref(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (isSafeLinkHref(trimmed)) return trimmed;
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function RichTextLinkModal() {
  const { linkModalState } = useRichTextContext();

  return linkModalState ? (
    <RichTextLinkModalInner state={linkModalState} />
  ) : null;
}

function RichTextLinkModalInner({ state }: { state: RichTextLinkModalState }) {
  const { editor, setLinkModalState } = useRichTextContext();
  const { isMobile } = useMediaQuery();

  const [text, setText] = useState(state.text);
  const [href, setHref] = useState(state.href);

  const isEditing = Boolean(state.href);

  const close = () => {
    setLinkModalState(null);
    setTimeout(() => editor?.commands.focus(), 0);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!editor) return;

    const finalHref = normalizeLinkHref(href);

    if (!isSafeLinkHref(finalHref)) {
      toast.error(
        "Enter a full URL starting with http://, https://, or mailto: (e.g. https://dub.co).",
      );
      return;
    }

    editor
      .chain()
      .focus()
      .insertContentAt({ from: state.from, to: state.to }, [
        {
          type: "text",
          text: text.trim() || finalHref,
          marks: [{ type: "link", attrs: { href: finalHref } }],
        },
      ])
      .run();

    setLinkModalState(null);
  };

  const handleDelete = () => {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .setTextSelection({ from: state.from, to: state.to })
      .unsetLink()
      .run();

    setLinkModalState(null);
  };

  return (
    <Modal showModal setShowModal={() => close()}>
      <div className="border-b border-neutral-200 px-6 py-4">
        <h3 className="text-lg font-medium">
          {isEditing ? "Edit link" : "Add link"}
        </h3>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-neutral-50 sm:rounded-b-2xl"
        autoComplete="off"
      >
        <div className="flex flex-col gap-6 px-6 py-6">
          <label>
            <span className="block text-sm font-medium text-neutral-700">
              Text
            </span>
            <input
              type="text"
              value={text}
              autoFocus={!isMobile}
              onChange={(e) => setText(e.target.value)}
              className="mt-2 block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
            />
          </label>

          <label>
            <span className="block text-sm font-medium text-neutral-700">
              Link
            </span>
            <input
              type="text"
              value={href}
              placeholder="https://dub.co"
              onChange={(e) => setHref(e.target.value)}
              onBlur={() => setHref((href) => normalizeLinkHref(href))}
              className="mt-2 block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-neutral-200 px-6 py-4">
          {isEditing ? (
            <Button
              variant="outline"
              text="Delete link"
              onClick={handleDelete}
              className="h-9 w-fit px-4"
            />
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              text="Cancel"
              onClick={close}
              className="h-9 w-fit px-4"
            />
            <Button
              variant="primary"
              text="Save"
              disabled={!href.trim()}
              className="h-9 w-fit px-4"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
