"use client";

import { SWRConfig } from "swr";
import { fetcher } from "./fetcher";

import { FC, ReactNode } from "react";

// interface
interface ISwrProviderProps {
  children: ReactNode;
}

// component
const SwrProvider: FC<Readonly<ISwrProviderProps>> = (props) => {
  const { children } = props;

  // return
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateIfStale: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
};

export default SwrProvider;
