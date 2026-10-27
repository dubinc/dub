import { getEmailDomainBlockFlags } from "./get-email-domain-block-flags";
import { isGenericEmail } from "./is-generic-email";

/**
 * Disposable domains are always rejected.
 * - Users with a partner account: consumer inboxes (gmail, outlook, etc.) are
 *   allowed even if they match emailDomainTerms; other blocked terms still
 *   apply; no +alias lock.
 * - Users without a partner account: blocked terms apply; generic current
 *   emails with + are locked.
 */
export async function canChangeEmail({
  currentEmail,
  newEmail,
  hasPartnerAccount,
}: {
  currentEmail: string;
  newEmail: string;
  hasPartnerAccount: boolean;
}): Promise<boolean> {
  const { isDisposable, matchesBlockedTerms } =
    await getEmailDomainBlockFlags(newEmail);

  if (isDisposable) {
    return false;
  }

  if (hasPartnerAccount) {
    if (isGenericEmail(newEmail)) {
      return true;
    }

    return !matchesBlockedTerms;
  }

  const isGenericEmailWithPlus =
    currentEmail.includes("+") && isGenericEmail(currentEmail);

  if (isGenericEmailWithPlus) {
    return false;
  }

  return !matchesBlockedTerms;
}
