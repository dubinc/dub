import useWorkspace from "@/lib/swr/use-workspace";
import { Button, FileUpload, Logo, Modal, useRouterStuff } from "@dub/ui";
import { Table } from "@dub/ui/src/icons";
import { truncate } from "@dub/utils";
import { ArrowRight } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

type FormData = {
  file: File | null;
};

function ImportCsvModal({
  showImportCsvModal,
  setShowImportCsvModal,
}: {
  showImportCsvModal: boolean;
  setShowImportCsvModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { slug } = useParams() as { slug?: string };
  const searchParams = useSearchParams();
  const { id: workspaceId } = useWorkspace();

  useEffect(
    () => setShowImportCsvModal(searchParams?.get("import") === "csv"),
    [searchParams],
  );

  const {
    control,
    handleSubmit,
    formState: { isLoading },
  } = useForm<FormData>({
    defaultValues: {},
  });

  const { queryParams } = useRouterStuff();

  return (
    <Modal
      showModal={showImportCsvModal}
      setShowModal={setShowImportCsvModal}
      onClose={() =>
        queryParams({
          del: "import",
        })
      }
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-8 sm:px-16">
        <div className="flex items-center space-x-3 py-4">
          <div className="flex size-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
            <Table className="size-5" />
          </div>
          <ArrowRight className="size-5 text-gray-600" />
          <Logo className="size-10" />
        </div>
        <h3 className="text-lg font-medium">Import Your Csv Links</h3>
        <p className="text-center text-sm text-gray-500">
          Easily import all your links into {process.env.NEXT_PUBLIC_APP_NAME}{" "}
          with just a few clicks.
        </p>
      </div>

      <div className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16">
        <form
          onSubmit={handleSubmit(async (data) => {
            toast.promise(
              fetch(`/api/workspaces/${workspaceId}/import/csv`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({}),
              }).then(async (res) => {
                if (res.ok) {
                  router.push(`/${slug}`);
                } else {
                  throw new Error();
                }
              }),
              {
                loading: "Adding links to import queue...",
                success:
                  "Successfully added links to import queue! You can now safely navigate from this tab – we will send you an email when your links have been fully imported.",
                error: "Error adding links to import queue",
              },
            );
          })}
          className="flex flex-col space-y-4"
        >
          <Controller
            name="file"
            control={control}
            render={({ field: { value, onChange } }) => (
              <FileUpload
                accept="csv"
                maxFileSizeMB={10}
                onChange={({ file }) => onChange(file)}
                content={
                  value
                    ? truncate(value.name, 20)
                    : "Click or drag and drop a CSV file."
                }
                className="aspect-auto h-20"
                iconClassName="size-6"
              />
            )}
          />
          <Button text="Confirm import" loading={isLoading} disabled={true} />
        </form>
      </div>
    </Modal>
  );
}

export function useImportCsvModal() {
  const [showImportCsvModal, setShowImportCsvModal] = useState(false);

  const ImportCsvModalCallback = useCallback(() => {
    return (
      <ImportCsvModal
        showImportCsvModal={showImportCsvModal}
        setShowImportCsvModal={setShowImportCsvModal}
      />
    );
  }, [showImportCsvModal, setShowImportCsvModal]);

  return useMemo(
    () => ({
      setShowImportCsvModal,
      ImportCsvModal: ImportCsvModalCallback,
    }),
    [setShowImportCsvModal, ImportCsvModalCallback],
  );
}
