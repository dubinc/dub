"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import {
  AnimatedSizeContainer,
  Button,
  Logo,
  Modal,
  useRouterStuff,
} from "@dub/ui";
import { TableIcon } from "@dub/ui/src/icons";
import { ArrowRight } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Control,
  UseFormSetValue,
  UseFormWatch,
  useForm,
} from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { FieldMapping } from "./field-mapping";
import { SelectFile } from "./select-file";

export const mappableFields = {
  link: {
    label: "Short Link",
    required: true,
  },
  url: {
    label: "Destination URL",
    required: true,
  },
  createdAt: {
    label: "Created",
    required: false,
  },
  tags: {
    label: "Tags",
    required: false,
  },
  title: {
    label: "Title",
    required: false,
  },
  description: {
    label: "Description",
    required: false,
  },
} as const;

export type ImportCsvFormData = {
  file: File | null;
} & Record<keyof typeof mappableFields, string>;

const ImportCsvContext = createContext<{
  fileColumns: string[] | null;
  setFileColumns: (columns: string[] | null) => void;
  firstRows: Record<string, string>[] | null;
  setFirstRows: (rows: Record<string, string>[] | null) => void;
  control: Control<ImportCsvFormData>;
  watch: UseFormWatch<ImportCsvFormData>;
  setValue: UseFormSetValue<ImportCsvFormData>;
} | null>(null);

export function useCsvContext() {
  const context = useContext(ImportCsvContext);
  if (!context)
    throw new Error(
      "useCsvContext must be used within an ImportCsvContext.Provider",
    );

  return context;
}

const pages = ["select-file", "confirm-import"] as const;

function ImportCsvModal({
  showImportCsvModal,
  setShowImportCsvModal,
}: {
  showImportCsvModal: boolean;
  setShowImportCsvModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { slug } = useParams() as { slug?: string };
  const { queryParams } = useRouterStuff();
  const searchParams = useSearchParams();
  const { id: workspaceId } = useWorkspace();

  useEffect(
    () => setShowImportCsvModal(searchParams?.get("import") === "csv"),
    [searchParams],
  );

  const {
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting, isValid },
  } = useForm<ImportCsvFormData>({
    defaultValues: {},
  });

  const [pageNumber, setPageNumber] = useState<number>(0);
  const page = pages[pageNumber];

  const [fileColumns, setFileColumns] = useState<string[] | null>(null);
  const [firstRows, setFirstRows] = useState<Record<string, string>[] | null>(
    null,
  );

  return (
    <Modal
      showModal={showImportCsvModal}
      setShowModal={setShowImportCsvModal}
      onClose={() =>
        queryParams({
          del: "import",
        })
      }
      className="h-fit max-h-[95dvh] overflow-y-auto"
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-8 sm:px-16">
        <div className="flex items-center space-x-3 py-4">
          <div className="flex size-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
            <TableIcon className="size-5" />
          </div>
          <ArrowRight className="size-5 text-gray-600" />
          <Logo className="size-10" />
        </div>
        <h3 className="text-lg font-medium">Import Links From a CSV File</h3>
        <p className="text-center text-sm text-gray-500">
          Easily import all your links into {process.env.NEXT_PUBLIC_APP_NAME}{" "}
          with just a few clicks.
        </p>
      </div>

      <AnimatedSizeContainer height>
        <ImportCsvContext.Provider
          value={{
            fileColumns,
            setFileColumns,
            firstRows,
            setFirstRows,
            control,
            watch,
            setValue,
          }}
        >
          <div className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16">
            <form
              onSubmit={handleSubmit(async (data) => {
                const loadingId = toast.loading(
                  "Adding links to import queue...",
                );
                try {
                  // Get signed upload URL
                  const uploadRes = await fetch(
                    `/api/workspaces/${workspaceId}/import/csv/upload-url`,
                    {
                      method: "POST",
                    },
                  );

                  if (!uploadRes.ok || !data.file) {
                    toast.error("Error getting signed upload URL");
                    return;
                  }

                  const { id, signedUrl } = await uploadRes.json();

                  // Upload the file
                  await fetch(signedUrl, {
                    method: "PUT",
                    body: data.file,
                    headers: {
                      "Content-Type": "multipart/form-data",
                    },
                  });

                  const formData = new FormData();
                  for (const key in data) {
                    if (key !== "file" && data[key] !== null) {
                      formData.append(key, data[key]);
                    }
                  }
                  formData.append("id", id);

                  const res = await fetch(
                    `/api/workspaces/${workspaceId}/import/csv`,
                    {
                      method: "POST",
                      body: formData,
                    },
                  );

                  if (!res.ok) throw new Error();

                  router.push(`/${slug}`);
                  mutate(
                    (key) =>
                      typeof key === "string" &&
                      (key.startsWith("/api/links") ||
                        key.startsWith("/api/domains")),
                  );

                  toast.success(
                    "Successfully added links to import queue! You can now safely navigate from this tab – we will send you an email when your links have been fully imported.",
                  );
                } catch (error) {
                  toast.error("Error adding links to import queue");
                } finally {
                  toast.dismiss(loadingId);
                }
              })}
              className="flex flex-col space-y-4"
            >
              {page === "select-file" && (
                <>
                  <SelectFile />
                  <Button
                    type="button"
                    text="Continue"
                    disabled={!fileColumns}
                    onClick={() => setPageNumber((n) => n + 1)}
                  />
                </>
              )}

              {page === "confirm-import" && (
                <>
                  <FieldMapping />
                  <Button
                    text="Confirm import"
                    loading={isSubmitting}
                    disabled={!isValid}
                  />
                </>
              )}
            </form>
          </div>
        </ImportCsvContext.Provider>
      </AnimatedSizeContainer>
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
