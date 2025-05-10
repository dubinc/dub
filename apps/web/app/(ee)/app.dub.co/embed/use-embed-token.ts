import { useSearchParams } from "next/navigation";

export const useEmbedToken = () => {
  const searchParams = useSearchParams();

  return searchParams.get("token");
};
