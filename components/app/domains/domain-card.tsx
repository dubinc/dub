import { useRouter } from "next/router";
import useSWR, { mutate } from "swr";
import {
  AlertCircleFill,
  Chart,
  CheckCircleFill,
  ExternalLink,
  XCircleFill,
} from "@/components/shared/icons";
import { LoadingCircle, LoadingDots } from "#/ui/icons";
import { DomainProps, DomainVerificationStatusProps } from "#/lib/types";
import { capitalize, fetcher, nFormatter, truncate } from "#/lib/utils";
import { useAddEditDomainModal } from "../modals/add-edit-domain-modal";
import DomainConfiguration from "./domain-configuration";
import Link from "next/link";
import punycode from "punycode/";
import Button from "#/ui/button";
import Number from "#/ui/number";

export default function DomainCard({ props }: { props: DomainProps }) {
  const router = useRouter();
  const { slug } = router.query as { slug: string };

  const { slug: domain, primary, target, type } = props || {};

  const { data, isValidating } = useSWR<{
    status: DomainVerificationStatusProps;
    response: any;
  }>(slug && `/api/projects/${slug}/domains/${domain}/verify`, fetcher, {
    revalidateOnMount: true,
    refreshInterval: 5000,
  });

  const { data: clicks } = useSWR<number>(
    slug && `/api/projects/${slug}/domains/${domain}/clicks`,
    fetcher,
    {
      dedupingInterval: 15000,
    },
  );

  const { setShowAddEditDomainModal, AddEditDomainModal } =
    useAddEditDomainModal({
      props,
    });

  return (
    <>
      <AddEditDomainModal />
      <div className="flex flex-col space-y-3 rounded-lg border border-gray-200 bg-white px-5 py-8 sm:px-10">
        <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:space-x-4">
          <div className="flex items-center space-x-2">
            <a
              href={`http://${domain}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-2"
            >
              <p className="flex items-center text-xl font-semibold">
                {punycode.toUnicode(domain)}
              </p>
              <ExternalLink className="h-5 w-5" />
            </a>
            <Number value={clicks}>
              <Link
                href={`/${slug}/${domain}`}
                className="flex items-center space-x-1 rounded-md bg-gray-100 px-2 py-0.5 transition-all duration-75 hover:scale-105 active:scale-100"
              >
                <Chart className="h-4 w-4" />
                <p className="text-sm">
                  {!clicks && clicks !== 0 ? (
                    <LoadingDots color="#71717A" />
                  ) : (
                    nFormatter(clicks)
                  )}
                  <span className="ml-1 hidden sm:inline-block">clicks</span>
                </p>
              </Link>
            </Number>
            {primary && (
              <span className="rounded-full bg-blue-500 px-3 py-0.5 text-xs text-white">
                Primary Domain
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            <Button
              text="Refresh"
              variant="secondary"
              loading={isValidating}
              onClick={() => {
                mutate(`/api/projects/${slug}/domains/${domain}/verify`);
              }}
            />
            <Button
              text="Edit"
              variant="secondary"
              onClick={() => setShowAddEditDomainModal(true)}
            />
          </div>
        </div>
        <div className="flex h-10 flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-5 sm:space-y-0">
          <div className="flex items-center space-x-2">
            {data ? (
              data.status === "Valid Configuration" ? (
                <CheckCircleFill className="h-6 w-6 text-blue-500" />
              ) : data.status === "Pending Verification" ? (
                <AlertCircleFill className="h-6 w-6 text-yellow-500" />
              ) : (
                <XCircleFill className="h-6 w-6 text-red-500" />
              )
            ) : (
              <LoadingCircle className="mr-1 h-5 w-5" />
            )}
            <p className="text-sm text-gray-500">
              {data ? data.status : "Checking Domain Status"}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {target ? (
              <CheckCircleFill className="h-6 w-6 text-blue-500" />
            ) : (
              <XCircleFill className="h-6 w-6 text-gray-400" />
            )}
            <div className="flex space-x-1">
              <p className="text-sm text-gray-500">
                {target ? `${capitalize(type)}s to` : `No ${type} configured`}
              </p>
              {target && (
                <a
                  href={target}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-gray-600"
                >
                  {truncate(
                    target.replace(/^(?:https?:\/\/)?(?:www\.)?/i, ""),
                    24,
                  )}
                </a>
              )}
            </div>
          </div>
        </div>
        {data && data.status !== "Valid Configuration" && (
          <DomainConfiguration data={data} />
        )}
      </div>
    </>
  );
}
