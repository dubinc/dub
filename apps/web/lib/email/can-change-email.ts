import { getEmailDomainBlockFlags } from "./get-email-domain-block-flags";
import { isGenericEmail } from "./is-generic-email";

/**
 * Disposable domains are always rejected, blocked terms apply, and generic
 * current emails with + are locked.
 */
export async function canChangeEmail({
  currentEmail,
  newEmail,
}: {
  currentEmail: string;
  newEmail: string;
}): Promise<boolean> {
  const { isDisposable, matchesBlockedTerms } =
    await getEmailDomainBlockFlags(newEmail);

  if (isDisposable) {
    return false;
  }

  const isGenericEmailWithPlus =
    currentEmail.includes("+") && isGenericEmail(currentEmail);

  if (isGenericEmailWithPlus) {
    return false;
  }

  return !matchesBlockedTerms;
}
