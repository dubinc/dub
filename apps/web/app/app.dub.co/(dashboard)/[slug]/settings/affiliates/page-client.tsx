"use client";

import { useAffiliates } from "@/lib/swr/use-affiliates";
import useWorkspace from "@/lib/swr/use-workspace";
import { TokenAvatar } from "@dub/ui/dist/avatar";
import { InfoTooltip, TooltipContent } from "@dub/ui/src/tooltip";

export const AffiliatesClient = () => {
  const { id: workspaceId } = useWorkspace();
  const { affiliates, loading: affiliatesLoading } = useAffiliates();

  console.log(affiliates);

  return (
    <>
      <div className="grid gap-5">
        <div className="flex flex-wrap justify-between gap-6">
          <div className="flex items-center gap-x-2">
            <h1 className="text-2xl font-semibold tracking-tight text-black">
              Affiliates
            </h1>
            <InfoTooltip
              content={
                <TooltipContent
                  title="Learn more about affiliates"
                  href="https://dub.co/help/article/affiliates"
                  target="_blank"
                  cta="Learn more"
                />
              }
            />
          </div>
        </div>
      </div>

      <AffiliateTable />
    </>
  );
};

const AffiliateTable = () => {
  const { affiliates, loading: affiliatesLoading } = useAffiliates();

  return (
    <>
      <table className="w-full border">
        <tbody>
          {affiliates?.map((affiliate) => (
            <tr key={affiliate.id}>
              <td>{<TokenAvatar id={affiliate.id} className="size-6" />}</td>
              <td>
                {affiliate.firstName} {affiliate.lastName}
              </td>
              <td>{affiliate.email}</td>
              <td>
                {affiliate.link ? (
                  <span>
                    {affiliate.link.domain}/{affiliate.link.key}
                  </span>
                ) : (
                  <span className="text-gray-500">None</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};
