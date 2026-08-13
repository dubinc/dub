/**
 * Map Resend email-domain DNS records to Domain Connect apply query params
 * for serviceId `email` (dub.co.email.json v2).
 *
 * Subdomain email domains (e.g. partners.acme.com) use the Domain Connect
 * `host` query parameter — record hosts stay relative to that email domain
 * (`send`, `resend._domainkey`, `_dmarc`), never zone-appended
 * (`send.partners`, `_dmarc.partners`).
 */

type ResendDnsRecord = {
  record?: string;
  type?: string;
  name?: string;
  value?: string;
  priority?: number | null;
};

type EmailDomainConnectParams = {
  groupId: string;
  /** Domain Connect `host` — email subdomain relative to the zone apex, if any. */
  host?: string;
  mxHost: string;
  mxValue: string;
  spfTxtHost: string;
  spfTxtValue: string;
  dkimSelector: string;
  dkimTxtValue: string;
  dkim2Selector?: string;
  dkim2TxtValue?: string;
};

/** Strip full SPF TXT into SPFM merge mechanisms (no v=spf1 / trailing all). */
function toSpfRules(raw: string): string {
  return raw
    .trim()
    .replace(/^"+|"+$/g, "")
    .replace(/^v=spf1\s+/i, "")
    .replace(/\s+[~\-+?]?all\s*$/i, "")
    .trim();
}

/** Ensure DKIM TXT starts with v=DKIM1 for template conflict matching. */
function normalizeDkimValue(raw: string): string {
  const value = raw.trim().replace(/^"+|"+$/g, "");
  if (!value) return value;
  if (/^v=DKIM1/i.test(value)) return value;
  if (/^p=/i.test(value)) return `v=DKIM1; k=rsa; ${value}`;
  return `v=DKIM1; ${value}`;
}

/**
 * Relativize a Resend record name onto the email domain slug
 * (Domain Connect host scope), not the zone apex.
 *
 * e.g. slug `partners.acme.com`, name `send` → `send`
 *      slug `partners.acme.com`, name `send.partners.acme.com` → `send`
 *      slug `acme.com`, name `@` → `@`
 */
function relativeToEmailSlug({
  resendName,
  emailSlug,
}: {
  resendName: string;
  emailSlug: string;
}): string {
  const name = (resendName || "").trim().toLowerCase();
  const slug = emailSlug.toLowerCase();

  if (name === "" || name === "@" || name === slug) return "@";

  const slugSuffix = `.${slug}`;
  if (name.endsWith(slugSuffix)) {
    const relative = name.slice(0, -slugSuffix.length);
    return relative || "@";
  }

  return name;
}

/**
 * Relativize a Resend record name onto the zone apex (for forward-instructions
 * emails that list zone-absolute labels an admin pastes into DNS).
 *
 * e.g. slug `partners.acme.com`, apex `acme.com`, name `send`
 *   → host `send.partners`
 */
function toZoneHost({
  resendName,
  emailSlug,
  apex,
}: {
  resendName: string;
  emailSlug: string;
  apex: string;
}): string {
  const name = (resendName || "").trim().toLowerCase();
  const slug = emailSlug.toLowerCase();
  const apexLower = apex.toLowerCase();

  const fqdn =
    name === "" || name === "@"
      ? slug
      : name === slug || name.endsWith(`.${slug}`)
        ? name
        : `${name}.${slug}`.replace(/\.+/g, ".");

  const apexSuffix = `.${apexLower}`;
  if (fqdn === apexLower) return "@";
  if (fqdn.endsWith(apexSuffix)) return fqdn.slice(0, -apexSuffix.length);
  return name || "@";
}

function extractDkimSelector(relativeHost: string): string | null {
  const host = relativeHost.trim().toLowerCase();
  if (!host || host === "@") return null;
  const match = host.match(/^([^.]+)\._domainkey$/i);
  if (match?.[1]) return match[1];
  // Resend sometimes returns only the selector label
  if (!host.includes(".")) return host;
  return null;
}

/**
 * Build Domain Connect query params from Resend domain records.
 * Returns null when required MX, SPF TXT, or primary DKIM are missing.
 */
export function mapResendRecordsToEmailDomainConnectParams({
  records,
  emailSlug,
  apex,
}: {
  records: ResendDnsRecord[];
  emailSlug: string;
  apex: string;
}): EmailDomainConnectParams | null {
  const mx = records.find(
    (r) => r.type === "MX" && r.record !== "Receiving" && r.name && r.value,
  );
  const spfTxt = records.find(
    (r) => r.record === "SPF" && r.type === "TXT" && r.name && r.value,
  );
  const dkims = records.filter(
    (r) => r.record === "DKIM" && r.type === "TXT" && r.name && r.value,
  );

  if (!mx?.name || !mx.value || !spfTxt?.name || !spfTxt.value || !dkims[0]) {
    return null;
  }

  const mxHost = relativeToEmailSlug({
    resendName: mx.name,
    emailSlug,
  });
  const spfTxtHost = relativeToEmailSlug({
    resendName: spfTxt.name,
    emailSlug,
  });
  const spfTxtValue = toSpfRules(spfTxt.value);
  if (!spfTxtValue || !mxHost || mxHost === "@" || !spfTxtHost) return null;

  const dkimRelative = relativeToEmailSlug({
    resendName: dkims[0].name!,
    emailSlug,
  });
  const dkimSelector = extractDkimSelector(dkimRelative);
  const dkimTxtValue = normalizeDkimValue(dkims[0].value!);
  if (!dkimSelector || !dkimTxtValue) return null;

  const slug = emailSlug.toLowerCase();
  const apexLower = apex.toLowerCase();
  const host =
    slug === apexLower
      ? undefined
      : slug.endsWith(`.${apexLower}`)
        ? slug.slice(0, -(apexLower.length + 1))
        : undefined;

  const groups = ["mx", "spf", "dkim"];
  const params: EmailDomainConnectParams = {
    groupId: "",
    ...(host ? { host } : {}),
    mxHost,
    mxValue: mx.value.trim().replace(/\.$/, ""),
    spfTxtHost,
    spfTxtValue,
    dkimSelector,
    dkimTxtValue,
  };

  if (dkims[1]?.name && dkims[1]?.value) {
    const dkim2Relative = relativeToEmailSlug({
      resendName: dkims[1].name,
      emailSlug,
    });
    const dkim2Selector = extractDkimSelector(dkim2Relative);
    const dkim2TxtValue = normalizeDkimValue(dkims[1].value);
    if (dkim2Selector && dkim2TxtValue) {
      groups.push("dkim2");
      params.dkim2Selector = dkim2Selector;
      params.dkim2TxtValue = dkim2TxtValue;
    }
  }

  groups.push("dmarc");
  params.groupId = groups.join(",");
  return params;
}

/** Flat DNS rows for forward-instructions email (includes recommended DMARC). */
export function mapResendRecordsToForwardRows({
  records,
  emailSlug,
  apex,
}: {
  records: ResendDnsRecord[];
  emailSlug: string;
  apex: string;
}): { type: string; name: string; value: string }[] {
  const rows: { type: string; name: string; value: string }[] = [];

  for (const r of records) {
    if (!r.type || !r.name || !r.value) continue;
    // Skip inbound Receiving MX if present — outbound setup only
    if (r.record === "Receiving") continue;

    const name = toZoneHost({
      resendName: r.name,
      emailSlug,
      apex,
    });
    const trimmed = r.value.trim();
    const value =
      r.type === "MX" && typeof r.priority === "number"
        ? `${r.priority} ${trimmed}`
        : trimmed;
    rows.push({
      type: r.type,
      name,
      value,
    });
  }

  rows.push({
    type: "TXT",
    name: toZoneHost({
      resendName: "_dmarc",
      emailSlug,
      apex,
    }),
    value: "v=DMARC1; p=none;",
  });

  return rows;
}
