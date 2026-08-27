import { Callout } from "../../shared/callout";

export function RiskDisclaimerBanner({ className }: { className?: string }) {
  return (
    <Callout variant="warn" size={2} className={className}>
      We recommend reviewing the risk events thoroughly before taking action.
      Unresolved events expire after 30 days, except confirmed network-level
      bans.{" "}
      <a
        href="https://dub.co/help/article/risk-monitoring"
        target="_blank"
        className="font-medium underline underline-offset-2 transition-colors hover:text-neutral-800"
      >
        Learn more
      </a>
    </Callout>
  );
}
