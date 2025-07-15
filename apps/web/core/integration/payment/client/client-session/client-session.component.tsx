"use client";

import { useCreateUserSessionMutation } from "core/api/user/payment/payment.hook.tsx";
import {
  useGetUserProfileQuery,
  useUpdateUserMutation,
} from "core/api/user/user.hook.tsx";
import { stripeSessions } from "core/constants/stripe.constant.ts";
import { FC, useEffect, useRef } from "react";
import { createSessionsForClient } from "../session";

// component
export const ClientSessionComponent: FC = () => {
  const { data: user, isLoading } = useGetUserProfileQuery();

  const triggeredCommonSession = useRef(false);
  const triggeredClientSession = useRef(false);

  const { trigger: triggerUpdateUser } = useUpdateUserMutation();
  const { trigger: triggerCreateUserSession } = useCreateUserSessionMutation();

  useEffect(() => {
    if (!isLoading && user?.success) {
      if (
        user?.data?.currency?.currencyForPay &&
        // !user?.data?.paymentInfo?.clientToken &&
        !triggeredClientSession.current
      ) {
        triggeredClientSession.current = true;

        triggerCreateUserSession({});
      }

      if (
        !user?.data?.sessions?.stripe_session_id &&
        !triggeredCommonSession.current
      ) {
        triggeredCommonSession.current = true;

        createSessionsForClient(stripeSessions).then((res) => {
          triggerUpdateUser({ sessions: { ...res } }).finally();
        });
      }
    }
  }, [user]);

  // return
  return null;
};
