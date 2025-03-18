import { nanoid } from "@dub/utils";
import { isCaseSensitiveDomain } from "../api/links/case-sensitivity";
import { checkIfKeyExists } from "./check-if-key-exists";

export async function getRandomKey({
  domain,
  prefix,
  long,
  skipKeyAvailabilityCheck = false,
}: {
  domain: string;
  prefix?: string;
  long?: boolean;
  skipKeyAvailabilityCheck?: boolean;
}): Promise<string> {
  /* recursively get random key till it gets one that's available */
  let key = long ? nanoid(69) : nanoid();
  if (prefix) {
    key = `${prefix.replace(/^\/|\/$/g, "")}/${key}`;
  }

  // if we're skipping the availability check, we can just return the key
  if (skipKeyAvailabilityCheck) {
    return key;
  }

  const exists = await checkIfKeyExists({ domain, key });

  if (exists) {
    // by the off chance that key already exists
    return getRandomKey({ domain, prefix, long });
  } else {
    if (isCaseSensitiveDomain(domain)) {
      const unencodedExists = await checkIfKeyExists({
        domain,
        key,
        ignoreCaseSensitivity: true,
      });

      if (unencodedExists) {
        return getRandomKey({ domain, prefix, long });
      }
    }

    return key;
  }
}
