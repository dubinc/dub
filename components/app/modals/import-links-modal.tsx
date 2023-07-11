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
import useProject from "#/lib/swr/use-project";
import Switch from "#/ui/switch";
import Button from "#/ui/button";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

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
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-8 sm:px-16">
          <div className="flex items-center space-x-3 py-4">
            <img
              src="/_static/icons/bitly.svg"
              alt="Bitly logo"
              className="h-10 w-10 rounded-full border border-gray-200"
            />
            <ArrowRight className="h-5 w-5 text-gray-600" />
            <BlurImage
              src="/_static/logo.png"
              alt="Dub logo"
              className="h-10 w-10 rounded-full border border-gray-200"
              width={20}
              height={20}
            />
          </div>
          <h3 className="text-lg font-medium">Import Your Bitly Links</h3>
        </div>

        <div className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16">
          <Link
            href={`https://bitly.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_BITLY_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_BITLY_REDIRECT_URI}`}
            className="flex h-10 w-full items-center justify-center space-x-2 rounded-md border border-gray-200 bg-white transition-all hover:border-black focus:outline-none"
          >
            <img
              src="/_static/icons/bitly.svg"
              alt="Bitly logo"
              className="h-5 w-5 rounded-full border border-gray-200"
            />
            <p className="text-sm text-gray-500 hover:text-black">
              Sign in with Bitly
            </p>
          </Link>
        </div>
        {/* <form
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
        </form> */}
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
