import { useRouter } from "next/router";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import BlurImage from "#/ui/blur-image";
import Modal from "@/components/shared/modal";
import Tooltip, { TooltipContent } from "#/ui/tooltip";
import useProject from "#/lib/swr/use-project";
import Switch from "#/ui/switch";
import Button from "#/ui/button";
import { toast } from "sonner";

function ImportLinksModal({
  showImportLinksModal,
  setShowImportLinksModal,
}: {
  showImportLinksModal: boolean;
  setShowImportLinksModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { slug } = router.query;
  const { logo, exceededUsage } = useProject();

  const [data, setData] = useState({
    bitlyGroup: "",
    bitlyApiKey: "",
    preserveTags: false,
  });

  const { bitlyGroup, bitlyApiKey, preserveTags } = data;

  const [importing, setImporting] = useState(false);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const existingModalBackdrop = document.getElementById("modal-backdrop");
      // only open modal with keyboard shortcut if:
      // - project has not exceeded usage limit
      // - c is pressed
      // - user is not pressing cmd/ctrl + c
      // - user is not typing in an input or textarea
      // - there is no existing modal backdrop (i.e. no other modal is open)
      if (
        !exceededUsage &&
        e.key === "i" &&
        !e.metaKey &&
        !e.ctrlKey &&
        target.tagName !== "INPUT" &&
        target.tagName !== "TEXTAREA" &&
        !existingModalBackdrop
      ) {
        setShowImportLinksModal(true);
      }
    },
    [exceededUsage],
  );

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return (
    <Modal
      showModal={showImportLinksModal}
      setShowModal={setShowImportLinksModal}
    >
      <div className="inline-block w-full transform overflow-hidden bg-white align-middle shadow-xl transition-all sm:max-w-md sm:rounded-2xl sm:border sm:border-gray-200">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
          <BlurImage
            src={logo || "/_static/logo.png"}
            alt={`Logo for ${slug}`}
            className="h-10 w-10 rounded-full border border-gray-200"
            width={20}
            height={20}
          />
          <h3 className="text-lg font-medium">Import Links</h3>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setImporting(true);
            fetch(`/api/projects/${slug}/import/bitly`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(data),
            }).then(async (res) => {
              setImporting(false);

              if (res.status === 200) {
                toast.success("Links imported successfully");
              } else {
                const error = await res.text();
                toast.error(error);
              }
            });
          }}
          className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16"
        >
          <div>
            <label
              htmlFor="bitlyGroup"
              className="block text-sm font-medium text-gray-700"
            >
              Bitly Group
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <input
                type="text"
                name="bitlyGroup"
                id="bitlyGroup"
                className="block w-full rounded-md border-gray-300 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
                placeholder="o_1c2v1q2j1"
                autoComplete="off"
                required
                value={bitlyGroup}
                onChange={(e) =>
                  setData({ ...data, bitlyGroup: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="bitlyApiKey"
              className="block text-sm font-medium text-gray-700"
            >
              Bitly API Key
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <input
                type="text"
                name="bitlyApiKey"
                id="bitlyApiKey"
                className="block w-full rounded-md border-gray-300 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
                placeholder="c4b6405fb15b0ad693a7a869025524cf"
                autoComplete="off"
                required
                value={bitlyApiKey}
                onChange={(e) =>
                  setData({ ...data, bitlyApiKey: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-50">
            <p className="text-sm font-medium text-gray-900">Preserve Tags</p>
            <Switch
              fn={() =>
                setData((prev) => ({ ...prev, preserveTags: !preserveTags }))
              }
              checked={preserveTags}
            />
          </div>

          <div className="grid gap-2">
            <Button text="Confirm import" loading={importing} />
          </div>
        </form>
      </div>
    </Modal>
  );
}

function ImportLinksButton({
  setShowImportLinksModal,
}: {
  setShowImportLinksModal: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <button
      onClick={() => setShowImportLinksModal(true)}
      className="rounded-md border border-black bg-black px-5 py-2 text-sm font-medium text-white transition-all duration-75 hover:bg-white hover:text-black active:scale-95"
    >
      Add Domain
    </button>
  );
}

export function useImportLinksModal() {
  const [showImportLinksModal, setShowImportLinksModal] = useState(false);

  const ImportLinksModalCallback = useCallback(() => {
    return (
      <ImportLinksModal
        showImportLinksModal={showImportLinksModal}
        setShowImportLinksModal={setShowImportLinksModal}
      />
    );
  }, [showImportLinksModal, setShowImportLinksModal]);

  const ImportLinksButtonCallback = useCallback(() => {
    return (
      <ImportLinksButton setShowImportLinksModal={setShowImportLinksModal} />
    );
  }, [setShowImportLinksModal]);

  return useMemo(
    () => ({
      setShowImportLinksModal,
      ImportLinksModal: ImportLinksModalCallback,
      ImportLinksButton: ImportLinksButtonCallback,
    }),
    [
      setShowImportLinksModal,
      ImportLinksModalCallback,
      ImportLinksButtonCallback,
    ],
  );
}
