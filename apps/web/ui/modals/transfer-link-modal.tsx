import useProjects from "@/lib/swr/use-projects";
import {
  BlurImage,
  Button,
  InputSelect,
  InputSelectItemProps,
  Modal,
  useMediaQuery,
} from "@dub/ui";
import {
  APP_NAME,
  DUB_LOGO,
  GOOGLE_FAVICON_URL,
  getApexDomain,
  isDubDomain,
  linkConstructor,
} from "@dub/utils";
import { type Link as LinkProps } from "@prisma/client";
import { useParams } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";

function TransferLinkModal({
  showTransferLinkModal,
  setShowTransferLinkModal,
  props,
}: {
  showTransferLinkModal: boolean;
  setShowTransferLinkModal: Dispatch<SetStateAction<boolean>>;
  props: LinkProps;
}) {
  const params = useParams() as { slug?: string };
  const { slug } = params;
  const { projects } = useProjects();
  const [transferring, setTransferring] = useState(false);
  const [selectedProject, setSelectedProject] =
    useState<InputSelectItemProps | null>(null);

  const apexDomain = getApexDomain(props.url);
  const { key, domain } = props;

  const shortlink = useMemo(() => {
    return linkConstructor({
      key,
      domain,
      pretty: true,
    });
  }, [key, domain]);

  const transferLink = async (linkId: string, newProjectId: string) => {
    return await fetch(`/api/links/${linkId}/transfer?projectSlug=${slug}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newProjectId }),
    });
  };

  const { isDesktop } = useMediaQuery();

  return (
    <Modal
      showModal={showTransferLinkModal}
      setShowModal={setShowTransferLinkModal}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (selectedProject) {
            setTransferring(true);
            toast.promise(transferLink(props.id, selectedProject.id), {
              loading: "Transferring link...",
              success: () => {
                mutate(
                  (key) =>
                    typeof key === "string" && key.startsWith("/api/links"),
                  undefined,
                  { revalidate: true },
                );
                setShowTransferLinkModal(false);
                return "Successfully transferred link.";
              },
              error: "Failed to transfer link.",
            });
          }
        }}
      >
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 text-center sm:px-16">
          <BlurImage
            src={`${GOOGLE_FAVICON_URL}${apexDomain}`}
            alt={apexDomain}
            className="h-10 w-10 rounded-full"
            width={20}
            height={20}
          />
          <h3 className="text-lg font-medium">Transfer {shortlink}</h3>
          <p className="text-sm text-gray-500">
            Transfer this link along with its associated analytics to another{" "}
            {APP_NAME} project.
          </p>
        </div>

        <div className="flex flex-col space-y-28 bg-gray-50 px-4 py-8 text-left sm:space-y-3 sm:rounded-b-2xl sm:px-16">
          <InputSelect
            items={
              projects
                ? projects
                    .filter((project) => project.id !== props.projectId)
                    .map((project) => ({
                      id: project.id,
                      value: project.name,
                      image: project.logo || DUB_LOGO,
                    }))
                : []
            }
            selectedItem={selectedProject}
            setSelectedItem={setSelectedProject}
            inputAttrs={{
              placeholder: "Select a project",
            }}
          />
          <Button
            disabled={!selectedProject || !isDubDomain(domain)}
            loading={transferring}
            text="Confirm transfer"
          />
        </div>
      </form>
    </Modal>
  );
}

export function useTransferLinkModal({ props }: { props: LinkProps }) {
  const [showTransferLinkModal, setShowTransferLinkModal] = useState(false);

  const TransferLinkModalCallback = useCallback(() => {
    return props ? (
      <TransferLinkModal
        showTransferLinkModal={showTransferLinkModal}
        setShowTransferLinkModal={setShowTransferLinkModal}
        props={props}
      />
    ) : null;
  }, [showTransferLinkModal, setShowTransferLinkModal]);

  return useMemo(
    () => ({
      setShowTransferLinkModal,
      TransferLinkModal: TransferLinkModalCallback,
    }),
    [setShowTransferLinkModal, TransferLinkModalCallback],
  );
}
