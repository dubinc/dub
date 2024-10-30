"use client";

import { createContext, Dispatch, SetStateAction } from "react";

export const PayoutsListContext = createContext<{
  openMenu: string | null;
  setOpenMenu: Dispatch<SetStateAction<string | null>>;
}>({
  openMenu: null,
  setOpenMenu: () => {},
});
