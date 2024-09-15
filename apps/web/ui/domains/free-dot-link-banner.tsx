import useDomainsCount from "@/lib/swr/use-domains-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { Grid, useLocalStorage } from "@dub/ui";
import { LinkBroken } from "@dub/ui/src/icons";
import { useRegisterDomainModal } from "../modals/register-domain-modal";
import { X } from "../shared/icons";

export function FreeDotLinkBanner() {
  const { plan } = useWorkspace();
  const [hide, setHide] = useLocalStorage("free-dot-link-banner-hide", false);

  const { RegisterDomainModal, setShowRegisterDomainModal } =
    useRegisterDomainModal();

  const { data: domainsCount } = useDomainsCount({
    includeParams: false,
    params: {
      search: ".link",
    },
  });

  return hide || domainsCount !== 0 ? null : (
    <>
      <RegisterDomainModal />
      <div className="relative isolate flex flex-col justify-between gap-3 overflow-hidden rounded-lg border border-green-600/15 bg-gradient-to-r from-lime-100/80 to-emerald-100/80 py-3 pl-4 pr-12 sm:flex-row sm:items-center sm:py-2">
        <Grid
          cellSize={13}
          patternOffset={[0, -1]}
          className="text-black/30 mix-blend-overlay [mask-image:linear-gradient(to_right,black,transparent)] md:[mask-image:linear-gradient(to_right,black_60%,transparent)]"
        />

        <div className="flex items-center gap-3">
          <div className="hidden rounded-full border border-green-600/50 bg-white/50 p-1 shadow-[inset_0_0_1px_1px_#fff] sm:block">
            <LinkBroken className="m-px size-4 text-green-800" />
          </div>
          <p className="text-sm text-gray-900">
            Claim a free <span className="font-semibold">.link</span> domain,
            free for one year{plan === "free" && " with any paid plan"}.{" "}
            <a
              href="https://dub.co/help/article/free-dot-link-domain" // TODO: Update link
              target="_blank"
              className="text-gray-700 underline transition-colors hover:text-black"
            >
              Learn more
            </a>
          </p>
        </div>

        <div className="flex items-center sm:-my-1">
          <button
            className="whitespace-nowrap rounded-md border border-green-700/50 px-3 py-1 text-sm text-gray-800 transition-colors hover:bg-green-500/10"
            onClick={() => setShowRegisterDomainModal(true)}
          >
            Claim Domain
          </button>
        </div>
        <button
          className="absolute right-2.5 top-2 p-1 text-sm text-green-700 underline transition-colors hover:text-green-900"
          onClick={() => setHide(true)}
        >
          <X className="size-[18px]" />
        </button>
      </div>
    </>
  );
}
