import { useSearchParams } from "next/navigation";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

// Keeps an import modal's show state in sync with the `?import=` query param
// at the hook level rather than in the modal component itself, which remounts
// on every open/close and would re-open from a stale param mid-navigation
export function useImportModalParam(
  provider: string,
): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [showModal, setShowModal] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    setShowModal(searchParams?.get("import") === provider);
  }, [searchParams, provider]);

  return [showModal, setShowModal];
}
