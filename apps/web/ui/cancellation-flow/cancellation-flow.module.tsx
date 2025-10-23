"use client";

import { Button } from "@dub/ui";
import { useCancelSubscriptionScheduleMutation } from "core/api/user/subscription/subscription.hook";
import { useRouter } from "next/navigation";
import { FC, useState } from "react";
import { toast } from "sonner";

interface ICancellationFlowModuleProps {
  isDunning: boolean;
}

export const CancellationFlowModule: FC<
  Readonly<ICancellationFlowModuleProps>
> = ({ isDunning }) => {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const {
    trigger: cancelSubscriptionSchedule,
    isMutating: isCancellingSchedule,
  } = useCancelSubscriptionScheduleMutation();

  const handleCancelSubscription = async () => {
    setIsLoading(true);

    // trackClientEvents({
    //   event: EAnalyticEvents.PAGE_CLICKED,
    //   params: {
    //     page_name: pageName,
    //     content_value: "cancel_subscription",
    //     event_category: "Authorized",
    //   },
    //   user,
    //   locale,
    // });

    try {
      const response = await cancelSubscriptionSchedule();

      if (response?.success) {
        router.push("/cancellation/success");
      } else {
        setIsLoading(false);
        toast.error(response?.error || "Something went wrong");
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Cancel subscription error:", error);
    }
  };

  const handleLinkToWorkspaceClick = () => {
    setIsLoading(true);
    router.push("/workspaces");
  };

  return (
    <div className="md:py-18 mx-auto mt-4 flex w-full max-w-[470px] flex-col items-center justify-center gap-6 px-4 py-8 md:mt-6">
      <h1 className="text-center text-2xl font-semibold lg:text-2xl">
        Are you sure you want to cancel your subscription?
      </h1>
      <p className="text-default-700 text-center text-sm">
        After you cancel, you’ll still have access until the end of your current
        billing period. But once it ends, everything you've unlocked will
        disappear.
      </p>
      <div className="flex w-full flex-col gap-2">
        <Button
          loading={isLoading || isCancellingSchedule}
          className="border-none bg-red-500 font-semibold text-white"
          onClick={handleCancelSubscription}
          text="Cancel Subscription"
        />
        <Button
          onClick={handleLinkToWorkspaceClick}
          text="Return to workspace"
        />
      </div>
    </div>
  );
};
