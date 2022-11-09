import { useRouter } from "next/router";
import useSWR, { mutate } from "swr";
import {
  AlertCircleFill,
  CheckCircleFill,
  ExternalLink,
  LoadingCircle,
  LoadingDots,
  XCircleFill,
} from "@/components/shared/icons";
import useProject from "@/lib/swr/use-project";
import { DomainVerificationStatusProps } from "@/lib/types";
import { fetcher } from "@/lib/utils";
import { useEditDomainModal } from "../../modals/edit-domain-modal";
import DomainConfiguration from "./domain-configuration";

export default function CustomDomain() {
  const router = useRouter();
  const { slug } = router.query as { slug: string };
  const { project: { domain } = {} } = useProject();

  const { data, isValidating } = useSWR<{
    status: DomainVerificationStatusProps;
    response: any;
  }>(
    slug && domain && `/api/projects/${slug}/domains/${domain}/verify`,
    fetcher,
    {
      revalidateOnMount: true,
      refreshInterval: 5000,
    },
  );

  const { setShowEditDomainModal, EditDomainModal } = useEditDomainModal();

  return (
    <div className="max-w-full rounded-lg border border-gray-200 bg-white py-5 sm:py-10">
      {domain && <EditDomainModal />}
      <div className="flex flex-col space-y-3 px-5 sm:px-10">
        <h2 className="text-xl font-medium">Custom Domain</h2>
        <p className="text-sm text-gray-500">
          This is the custom domain associated with your project.
        </p>
      </div>
      <div className="my-4 border-b border-gray-200 sm:my-8" />
      <div className="flex flex-col space-y-3 px-5 sm:px-10">
        <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:space-x-4">
          {domain ? (
            <a
              href={`http://${domain}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-2"
            >
              <p className="flex items-center text-xl font-semibold">
                {domain}
              </p>
              <ExternalLink className="h-5 w-5" />
            </a>
          ) : (
            <div className="h-8 w-32 animate-pulse rounded-md bg-gray-200" />
          )}
          <div className="flex space-x-3">
            {domain ? (
              <button
                onClick={() => {
                  mutate(`/api/projects/${slug}/domains/${domain}/verify`);
                }}
                disabled={isValidating}
                className={`${
                  isValidating
                    ? "cursor-not-allowed bg-gray-100"
                    : "bg-white hover:border-black hover:text-black"
                } h-9 w-24 rounded-md border border-solid border-gray-200 text-sm text-gray-500 transition-all duration-150 ease-in-out focus:outline-none`}
              >
                {isValidating ? <LoadingDots /> : "Refresh"}
              </button>
            ) : (
              <div className="h-9 w-24 animate-pulse rounded-md bg-gray-200" />
            )}
            {domain ? (
              <button
                onClick={() => setShowEditDomainModal(true)}
                className="h-9 w-24 rounded-md border border-solid border-black bg-black text-sm text-white transition-all duration-150 ease-in-out hover:bg-white hover:text-black focus:outline-none"
              >
                Change
              </button>
            ) : (
              <div className="h-9 w-24 animate-pulse rounded-md bg-gray-200" />
            )}
          </div>
        </div>
        <div className="flex h-10 items-center space-x-2">
          {data ? (
            data.status === "Valid Configuration" ? (
              <CheckCircleFill className="h-6 w-6 text-blue-500" />
            ) : data.status === "Pending Verification" ? (
              <AlertCircleFill className="h-6 w-6 text-yellow-500" />
            ) : (
              <XCircleFill className="h-6 w-6 text-red-500" />
            )
          ) : (
            <LoadingCircle dimensions="w-5 h-5 mr-1" />
          )}
          <p className="text-sm text-gray-500">
            {data ? data.status : "Checking Domain Status"}
          </p>
        </div>
        {data && data.status !== "Valid Configuration" && (
          <DomainConfiguration data={data} />
        )}
      </div>
    </div>
  );
}
