import { generateUnsubscribeUrl } from "@/lib/email/unsubscribe-token";
import useUser from "@/lib/swr/use-user";
import ExternalLink from "@/ui/shared/icons/external-link";
import Link from "next/link";

export default function UpdateSubscription() {
  const { user } = useUser();

  if (!user?.email) {
    return null;
  }

  const unsubscribeUrl = generateUnsubscribeUrl(user.email);

  return (
    <div className="flex items-center gap-x-2">
      <Link
        href={unsubscribeUrl}
        className="flex items-center gap-x-2 text-sm text-neutral-500 transition-colors hover:text-neutral-700"
      >
        <span>Manage email subscriptions</span>
        <ExternalLink className="h-4 w-4" />
      </Link>
    </div>
  );
}
