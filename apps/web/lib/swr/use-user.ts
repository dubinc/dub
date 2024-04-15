import { fetcher } from "@dub/utils";
import uswSWRImmutable from "swr/immutable";
import { UserProps } from "../types";

export default function useUser() {
  const { data } = uswSWRImmutable<UserProps>(`/api/user`, fetcher);

  return {
    ...data,
  };
}
