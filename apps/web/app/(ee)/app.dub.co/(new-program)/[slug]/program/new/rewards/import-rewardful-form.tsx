"use client";

import { setRewardfulTokenAction } from "@/lib/actions/partners/set-rewardful-token";
import { RewardfulCampaign } from "@/lib/rewardful/types";
import { useRewardfulCampaigns } from "@/lib/swr/use-rewardful-campaigns";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramData } from "@/lib/types";
import { Button, Input } from "@dub/ui";
import { capitalize } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { toast } from "sonner";

type FormProps = {
  register: UseFormRegister<ProgramData>;
  watch: UseFormWatch<ProgramData>;
  setValue: UseFormSetValue<ProgramData>;
};

export const ImportRewardfulForm = ({
  register,
  watch,
  setValue,
}: FormProps) => {
  const { id: workspaceId } = useWorkspace();
  const [token, setToken] = useState("");

  const rewardful = watch("rewardful");

  const {
    executeAsync: setRewardfulToken,
    isPending: isSettingRewardfulToken,
  } = useAction(setRewardfulTokenAction, {
    onSuccess: ({ data }) => {
      setValue("rewardful.maskedToken", data?.maskedToken);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const { campaigns, loading: isLoadingCampaigns } = useRewardfulCampaigns({
    enabled: !!rewardful?.maskedToken,
  });

  const selectedCampaign = campaigns?.find(
    (campaign) => campaign.id === rewardful?.id,
  );

  useEffect(() => {
    if (selectedCampaign) {
      setValue("rewardful", {
        ...rewardful,
        ...selectedCampaign,
      });
    }
  }, [selectedCampaign, setValue]);

  const formatCommission = useCallback((campaign: RewardfulCampaign) => {
    return campaign.reward_type === "percent"
      ? `${campaign.commission_percent}%`
      : `$${(campaign.commission_amount_cents / 100).toFixed(2)}`;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-neutral-800">
          Rewardful API secret
        </label>
        <Input
          type="password"
          placeholder="API token"
          className="mt-2 max-w-full"
          value={token || rewardful?.maskedToken || ""}
          onChange={(e) => setToken(e.target.value)}
        />
        <div className="mt-2 text-xs font-normal leading-[1.1] text-neutral-600">
          Find your Rewardful API secret on your{" "}
          <Link
            href="https://app.getrewardful.com/company/edit"
            className="underline decoration-solid decoration-auto underline-offset-auto"
            target="_blank"
            rel="noopener noreferrer"
          >
            Company settings page
          </Link>
        </div>
      </div>

      {rewardful?.maskedToken && (
        <div>
          <label className="text-sm font-medium text-neutral-800">
            Campaign to import
          </label>
          <div className="relative mt-2">
            {isLoadingCampaigns ? (
              <div className="h-10 w-full animate-pulse rounded-md bg-neutral-200" />
            ) : (
              <>
                <select
                  {...register("rewardful.id")}
                  className="block w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 py-2 pr-8 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500"
                >
                  <option value="">Select a campaign</option>
                  {campaigns?.map(({ id, name }) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              </>
            )}
          </div>
          <Link
            href="https://dub.co/help/article/migrating-from-rewardful#migrating-multiple-campaigns"
            className="mt-2 text-xs font-normal leading-[1.1] text-neutral-600 underline decoration-solid decoration-auto underline-offset-auto"
            target="_blank"
            rel="noopener noreferrer"
          >
            Want to migrate more than one campaign?
          </Link>
        </div>
      )}

      {selectedCampaign && (
        <div className="grid grid-cols-2 gap-6 rounded-lg border border-neutral-300 bg-neutral-50 p-6">
          <div>
            <div className="text-sm text-neutral-500">Type</div>
            <div className="text-sm font-medium text-neutral-800">
              {capitalize(selectedCampaign.reward_type)}
            </div>
          </div>
          <div>
            <div className="text-sm text-neutral-500">Duration</div>
            <div className="text-sm font-medium text-neutral-800">
              {selectedCampaign.max_commission_period_months} months
            </div>
          </div>
          <div>
            <div className="text-sm text-neutral-500">Commission</div>
            <div className="text-sm font-medium text-neutral-800">
              {formatCommission(selectedCampaign)}
            </div>
          </div>
          <div>
            <div className="text-sm text-neutral-500">Affiliates</div>
            <div className="text-sm font-medium text-neutral-800">
              {selectedCampaign.affiliates}
            </div>
          </div>
        </div>
      )}

      {!rewardful?.id && (
        <Button
          text="Fetch campaigns"
          className="w-full"
          disabled={isSettingRewardfulToken || !token}
          loading={isSettingRewardfulToken}
          onClick={async () => {
            if (!workspaceId) return;

            await setRewardfulToken({
              workspaceId,
              token,
            });
          }}
        />
      )}
    </div>
  );
};
