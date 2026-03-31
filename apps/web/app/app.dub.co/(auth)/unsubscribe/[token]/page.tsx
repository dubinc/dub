import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import EmptyState from "@/ui/shared/empty-state";
import { LinkBroken } from "@dub/ui/icons";
import { constructMetadata } from "@dub/utils";
import { UnsubscribeForm } from "./unsubscribe-form";

export const metadata = constructMetadata({
  title: "Email Preferences – Dub",
  description: "Manage your email subscription preferences on Dub",
  noIndex: true,
});

export default async function UnsubscribePage(props: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await props.params;

  const email = verifyUnsubscribeToken(token);

  if (!email) {
    return (
      <EmptyState
        icon={LinkBroken}
        title="Invalid Unsubscribe Link"
        description="This unsubscribe link is invalid or has expired. Please use the link from a recent email to manage your preferences."
      />
    );
  }

  return (
    <div className="m-auto w-full max-w-lg overflow-hidden border border-neutral-200 shadow-xl sm:rounded-2xl">
      <UnsubscribeForm email={email} token={token} />
    </div>
  );
}
