"use client";

import useUser from "@/lib/swr/use-user.ts";
import {
  initPeopleAnalytic,
  setPeopleAnalytic,
} from "core/integration/analytic";
import { useEffect } from "react";

export const AnalyticInitializerComponent = () => {
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      setPeopleAnalytic({ $email: user.email });
      initPeopleAnalytic(user.id);
    }
  }, [user]);

  return null;
};
