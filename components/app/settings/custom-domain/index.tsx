import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/utils";
import { useRouter } from "next/router";
import {
  AlertCircleFill,
  CheckCircleFill,
  ExternalLink,
  LoadingCircle,
  LoadingDots,
  XCircleFill,
} from "@/components/shared/icons";
import { useEditDomainModal } from "../../modals/edit-domain-modal";
import { DomainVerificationStatusProps } from "@/lib/types";
import DomainConfiguration from "./domain-configuration";
import useProject from "@/lib/swr/use-project";

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
    }
  );

  const { setShowEditDomainModal, EditDomainModal } = useEditDomainModal();

  return (
    <div className="bg-white rounded-lg border border-gray-200 py-10">
      {domain && <EditDomainModal />}
      <div className="flex flex-col space-y-3 px-10">
        <h2 className="text-xl font-medium">Custom Domain</h2>
        <p className="text-gray-500 text-sm">
          This is the custom domain associated with your project.
        </p>
      </div>
      <div className="border-b border-gray-200 my-8" />
      <div className="flex flex-col space-y-3 px-10">
        <div className="flex justify-between space-x-4">
          {domain ? (
            <a
              href={`http://${domain}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-2"
            >
              <p className="text-xl font-semibold flex items-center">
                {domain}
              </p>
              <ExternalLink className="w-5 h-5" />
            </a>
          ) : (
            <div className="h-8 w-32 bg-gray-200 rounded-md animate-pulse" />
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
                    : "bg-white hover:text-black hover:border-black"
                } text-gray-500 border-gray-200 h-9 w-24 text-sm border-solid border rounded-md focus:outline-none transition-all ease-in-out duration-150`}
              >
                {isValidating ? <LoadingDots /> : "Refresh"}
              </button>
            ) : (
              <div className="h-9 w-24 bg-gray-200 rounded-md animate-pulse" />
            )}
            {domain ? (
              <button
                onClick={() => setShowEditDomainModal(true)}
                className="bg-black text-white border-black hover:text-black hover:bg-white h-9 w-24 text-sm border-solid border rounded-md focus:outline-none transition-all ease-in-out duration-150"
              >
                Change
              </button>
            ) : (
              <div className="h-9 w-24 bg-gray-200 rounded-md animate-pulse" />
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2 h-10">
          {data ? (
            data.status === "Valid Configuration" ? (
              <CheckCircleFill className="w-6 h-6 text-blue-500" />
            ) : data.status === "Pending Verification" ? (
              <AlertCircleFill className="w-6 h-6 text-yellow-500" />
            ) : (
              <XCircleFill className="w-6 h-6 text-red-500" />
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
