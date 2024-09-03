import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { Search } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

interface ClaimDomainProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
}

const ClaimDomain = ({ showModal, setShowModal }: ClaimDomainProps) => {
  const { slug } = useWorkspace();
  const { isMobile } = useMediaQuery();
  const [domain, setDomain] = useState<string | undefined>(undefined);
  const [domainAvailable, setDomainAvailable] = useState<boolean>(false);

  useEffect(() => {
    setDomain(slug);
  }, [slug]);

  return (
    <Modal showModal={true} setShowModal={setShowModal}>
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
        <h3 className="text-lg font-medium">Claim .link domain</h3>
      </div>

      <form
        className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-8"
        onSubmit={async (e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
        }}
      >
        <div>
          <label htmlFor="domain" className="flex items-center space-x-2">
            <p className="block text-sm font-medium text-gray-700">
              Search domains
            </p>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
              PRO
            </span>
          </label>
          <div className="mt-2 flex rounded-md border border-gray-300 bg-white shadow-sm">
            <input
              name="domain"
              id="domain"
              type="text"
              required
              autoComplete="off"
              className="block w-full rounded-l-md border-0 text-gray-900 placeholder-gray-400 focus:ring-0 sm:text-sm"
              aria-invalid="true"
              autoFocus={!isMobile}
              placeholder={domain}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <span className="inline-flex items-center px-3 text-gray-500 sm:text-sm">
              .link
            </span>
            <Button
              className="w-fit rounded-l-none border-l border-gray-300"
              icon={<Search className="h-4 w-4" />}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="secondary"
            text="Cancel"
            onClick={() => setShowModal(false)}
          />
          <Button text="Claim domain" disabled={!domainAvailable} />
        </div>
      </form>
    </Modal>
  );
};

export function useClaimDomainModal() {
  const [showClaimDomainModal, setShowClaimDomainModal] = useState(false);

  const ClaimDomainModal = useCallback(() => {
    return (
      <ClaimDomain
        showModal={showClaimDomainModal}
        setShowModal={setShowClaimDomainModal}
      />
    );
  }, [showClaimDomainModal, setShowClaimDomainModal]);

  return useMemo(
    () => ({ setShowClaimDomainModal, ClaimDomainModal }),
    [setShowClaimDomainModal, ClaimDomainModal],
  );
}
