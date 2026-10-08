"use client";

import { X } from "@/ui/shared/icons";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

const normalizeSitemapUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  try {
    return new URL(withProtocol).toString();
  } catch {
    return null;
  }
};

const AddSitemapForm = ({
  existingUrls,
  onAdd,
  onCancel,
}: {
  existingUrls: string[];
  onAdd: (url: string) => void;
  onCancel?: () => void;
}) => {
  const [url, setUrl] = useState("");
  const { isMobile } = useMediaQuery();
  const normalizedUrl = normalizeSitemapUrl(url);

  return (
    <form
      className="bg-neutral-50"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!normalizedUrl) {
          toast.error("Enter a valid sitemap URL.");
          return;
        }

        if (existingUrls.includes(normalizedUrl)) {
          toast.error("Sitemap already exists.");
          return;
        }

        onAdd(normalizedUrl);
        setUrl("");
      }}
    >
      <div className="relative flex-1 rounded-md px-6 py-5">
        <input
          type="text"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoComplete="off"
          autoFocus={!isMobile}
          placeholder="https://acme.com/sitemap.xml"
          className={cn(
            "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
          )}
        />
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-6 py-5">
        <Button
          onClick={() => onCancel?.()}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
        />
        <Button
          type="submit"
          variant="primary"
          text="Add sitemap"
          className="h-8 w-fit px-3"
          disabled={!normalizedUrl}
        />
      </div>
    </form>
  );
};

export function useAddSitemapModal({
  existingUrls,
  onAdd,
}: {
  existingUrls: string[];
  onAdd: (url: string) => void;
}) {
  const [showAddSitemapModal, setShowAddSitemapModal] = useState(false);

  const AddSitemapModalCallback = useCallback(() => {
    return (
      <Modal
        showModal={showAddSitemapModal}
        setShowModal={setShowAddSitemapModal}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 p-4">
          <h3 className="text-lg font-medium">Add sitemap</h3>
          <button
            type="button"
            onClick={() => setShowAddSitemapModal(false)}
            className="group rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-neutral-50">
          <AddSitemapForm
            existingUrls={existingUrls}
            onCancel={() => setShowAddSitemapModal(false)}
            onAdd={(sitemapUrl) => {
              onAdd(sitemapUrl);
              setShowAddSitemapModal(false);
            }}
          />
        </div>
      </Modal>
    );
  }, [showAddSitemapModal, existingUrls, onAdd]);

  return useMemo(
    () => ({
      setShowAddSitemapModal,
      AddSitemapModal: AddSitemapModalCallback,
    }),
    [AddSitemapModalCallback],
  );
}
