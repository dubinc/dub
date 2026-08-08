/**
 * Map Resend email-domain DNS records to Domain Connect apply query params
 * for serviceId `email` (dub.co.email.json v2).
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
  mxHost: string;
  mxValue: string;
  spfTxtHost: string;
  spfTxtValue: string;
  dkimTxtHost: string;
  dkimTxtValue: string;
  dmarcHost: string;
  dkim2TxtHost?: string;
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
 * Relativize a Resend record name (relative to the email domain slug)
 * onto the zone apex used by Domain Connect `domain=`.
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

  const mxHost = toZoneHost({
    resendName: mx.name,
    emailSlug,
    apex,
  });
  const spfTxtHost = toZoneHost({
    resendName: spfTxt.name,
    emailSlug,
    apex,
  });
  const spfTxtValue = toSpfRules(spfTxt.value);
  if (!spfTxtValue) return null;

  const dkimTxtHost = toZoneHost({
    resendName: dkims[0].name!,
    emailSlug,
    apex,
  });
  const dkimTxtValue = normalizeDkimValue(dkims[0].value!);
  if (!dkimTxtHost || !dkimTxtValue) return null;

  const dmarcHost = toZoneHost({
    resendName: "_dmarc",
    emailSlug,
    apex,
  });

  const groups = ["mx", "spf", "dkim"];
  const params: EmailDomainConnectParams = {
    groupId: "",
    mxHost,
    mxValue: mx.value.trim().replace(/\.$/, ""),
    spfTxtHost,
    spfTxtValue,
    dkimTxtHost,
    dkimTxtValue,
    dmarcHost,
  };

  if (dkims[1]?.name && dkims[1]?.value) {
    const dkim2TxtHost = toZoneHost({
      resendName: dkims[1].name,
      emailSlug,
      apex,
    });
    const dkim2TxtValue = normalizeDkimValue(dkims[1].value);
    if (dkim2TxtHost && dkim2TxtValue) {
      groups.push("dkim2");
      params.dkim2TxtHost = dkim2TxtHost;
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
