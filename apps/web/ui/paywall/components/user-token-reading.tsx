"use client";

import { changePreSignupEmailAction } from "@/lib/actions/pre-checkout-flow/change-email";
import { LoadingSpinner } from "@dub/ui";
import {
  useGetUserProfileQuery,
  useUpdateUserMutation,
} from "core/api/user/user.hook";
import {
  initPeopleAnalytic,
  setPeopleAnalytic,
  setPeopleAnalyticOnce,
} from "core/integration/analytic";
import { useAction } from "next-safe-action/hooks";
import { redirect } from "next/navigation";
import { useRouterStuff } from "node_modules/@dub/ui/src/hooks/use-router-stuff";
import { FC, useEffect } from "react";

interface IUserTokenReadingComponentProps {
  id: string;
  email: string;
  isPaidUser: boolean;
}

export const UserTokenReadingComponent: FC<
  Readonly<IUserTokenReadingComponentProps>
> = ({ id, email, isPaidUser }) => {
  const { queryParams } = useRouterStuff();

  const { data, isLoading } = useGetUserProfileQuery();
  const { trigger: triggerUpdateUserCookie } = useUpdateUserMutation();

  const { executeAsync } = useAction(changePreSignupEmailAction, {
    async onSuccess() {
      await triggerUpdateUserCookie({ isPaidUser, emailMarketing: true });

      initPeopleAnalytic(id);
      setPeopleAnalytic({ $email: email });
      setPeopleAnalyticOnce({ email_marketing: true });

      setTimeout(() => {
        queryParams({
          del: ["user_token"],
        });
      }, 1000);
    },
    onError: () => {
      redirect("/");
    },
  });

  useEffect(() => {
    if (!isLoading && data?.success && data?.data?.currency?.currencyForPay) {
      executeAsync({ email });
    }
  }, [email, isLoading, data]);

  return (
    <div className="flex flex-col items-center justify-center">
      <h3 className="text-medium mx-auto my-8 text-center font-bold leading-[1.17]">
        Almost finished...
      </h3>
      <LoadingSpinner className="m-auto h-5 w-5 text-neutral-400" />
    </div>
  );
};
