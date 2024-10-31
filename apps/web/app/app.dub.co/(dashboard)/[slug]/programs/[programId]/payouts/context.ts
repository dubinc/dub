"use client";

import { createContext, Dispatch, SetStateAction } from "react";

export const PayoutsListContext = createContext<{
  openMenuId: string | null;
  setOpenMenuId: Dispatch<SetStateAction<string | null>>;
}>({
  openMenuId: null,
  setOpenMenuId: () => {},
});
