import { DubApiError } from "@/lib/api/errors";
import { withPartnerProfile } from "@/lib/auth/partner";
import { prisma } from "@dub/prisma";
import {
  currencyFormatter,
  DUB_WORDMARK,
  EU_COUNTRY_CODES,
  formatDate,
  pluralize,
} from "@dub/utils";
import {
  Document,
  Image,
  Link,
  Page,
  renderToBuffer,
  Text,
  View,
} from "@react-pdf/renderer";
import { createTw } from "react-pdf-tailwind";

export const dynamic = "force-dynamic";

const tw = createTw({
  theme: {
    fontFamily: {
      // sans: ["Times-Bold"],
    },
  },
});

// GET /partners.dub.co/invoices/[payoutId] - get the invoice for a payout
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const { payoutId } = params;

  const payout = await prisma.payout.findUniqueOrThrow({
    where: {
      id: payoutId,
    },
    include: {
      program: {
        select: {
          name: true,
          logo: true,
          supportEmail: true,
        },
      },
      _count: {
        select: {
          commissions: true,
        },
      },
    },
  });

  if (payout.partnerId !== partner.id) {
    throw new DubApiError({
      code: "unauthorized",
      message: "You are not authorized to view this payout.",
    });
  }

  if (!["completed", "processing"].includes(payout.status)) {
    throw new DubApiError({
      code: "unauthorized",
      message:
        "This payout is not completed yet, hence no invoice is generated.",
    });
  }

  const EU_PARTNER =
    partner.country && EU_COUNTRY_CODES.includes(partner.country);
  const AU_PARTNER = partner.country && partner.country === "AU";

  const invoiceMetadata = [
    {
      label: "Program",
      value: (
        <View style={tw("flex-row items-center gap-2")}>
          {payout.program.logo && (
            <Image
              src={payout.program.logo}
              style={tw("w-5 h-5 rounded-full")}
            />
          )}
          <Text>{payout.program.name}</Text>
        </View>
      ),
    },
    ...(payout.paidAt
      ? [
          {
            label: "Payout date",
            value: (
              <Text style={tw("text-neutral-800 w-2/3")}>
                {formatDate(payout.paidAt, { month: "short", year: "numeric" })}
              </Text>
            ),
          },
        ]
      : []),
    ...(payout.periodStart && payout.periodEnd
      ? [
          {
            label: "Payout period",
            value: (
              <Text style={tw("text-neutral-800 w-2/3")}>
                {`${formatDate(payout.periodStart, {
                  month: "short",
                  year: "numeric",
                })} - ${formatDate(payout.periodEnd, { month: "short" })}`}
              </Text>
            ),
          },
        ]
      : []),
    {
      label: "Payout amount",
      value: (
        <Text style={tw("text-neutral-800 w-2/3")}>
          {currencyFormatter(payout.amount / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          <Text style={tw("text-neutral-500")}>
            ({payout._count.commissions}{" "}
            {pluralize("commission", payout._count.commissions)})
          </Text>
        </Text>
      ),
    },
    {
      label: "Payout reference number",
      value: <Text style={tw("text-neutral-800 w-2/3")}>{payout.id}</Text>,
    },
    ...(payout.description
      ? [
          {
            label: "Description",
            value: (
              <Text style={tw("text-neutral-800 w-2/3")}>
                {payout.description}
              </Text>
            ),
          },
        ]
      : []),
    ...(partner.country &&
    (EU_COUNTRY_CODES.includes(partner.country) || partner.country === "AU")
      ? [
          {
            label: `${partner.country === "AU" ? "GST" : "VAT"} reverse charge`,
            value: (
              <Text style={tw("text-neutral-800 w-2/3")}>
                Tax to be paid on reverse charge basis.
              </Text>
            ),
          },
        ]
      : []),
  ];

  const supportEmail = payout.program.supportEmail || "support@dub.co";

  const invoiceDate = payout.paidAt
    ? formatDate(payout.paidAt, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : formatDate(new Date(), {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

  const pdf = await renderToBuffer(
    <Document>
      <Page size="A4" style={tw("p-20 bg-white flex flex-col min-h-full")}>
        {/* Header */}
        <View style={tw("flex-row justify-between items-start mb-6")}>
          <Image src={DUB_WORDMARK} style={tw("w-20 h-10 mb-2")} />
          <View style={tw("text-right")}>
            <Text style={tw("text-sm font-medium text-neutral-800 leading-6")}>
              Dub Technologies INC
            </Text>
            <Text style={tw("text-sm text-neutral-500 leading-6")}>
              2261 Market Street STE 5906
            </Text>
            <Text style={tw("text-sm text-neutral-500 leading-6")}>
              San Francisco, CA 94114
            </Text>
            <Text style={tw("text-sm text-neutral-800 leading-6")}>
              Invoice Number: <Text style={tw("font-bold")}>{payout.id}</Text>
            </Text>
            <Text style={tw("text-sm text-neutral-800 leading-6")}>
              Invoice Date: <Text style={tw("font-bold")}>{invoiceDate}</Text>
            </Text>
          </View>
        </View>
        {/* Divider */}
        <View style={tw("h-0.5 bg-neutral-200 mb-6")} />

        {(partner.companyName ||
          partner.invoiceSettings?.address ||
          partner.invoiceSettings?.taxId) && (
          <>
            {/* Payee Section */}
            <View style={tw("mb-6")}>
              <Text style={tw("text-base font-bold text-neutral-900 mb-2")}>
                Payee Details
              </Text>
              <Text style={tw("text-sm text-neutral-800 leading-6")}>
                {partner.companyName || "-"}
              </Text>
              {partner.invoiceSettings?.address && (
                <Text style={tw("text-sm text-neutral-500 leading-6")}>
                  {partner.invoiceSettings.address}
                </Text>
              )}
              {partner.invoiceSettings?.taxId && (
                <Text style={tw("text-sm text-neutral-800")}>
                  Tax ID: {partner.invoiceSettings.taxId}
                </Text>
              )}
            </View>
            {/* Divider */}
            <View style={tw("h-0.5 bg-neutral-200 mb-6")} />
          </>
        )}

        {/* Invoice Details Section */}
        <Text style={tw("text-base font-bold text-neutral-900 mb-4")}>
          Invoice Details
        </Text>
        <View style={tw("flex-col gap-4 text-sm font-medium mb-10")}>
          {invoiceMetadata.map((row) => (
            <View style={tw("flex-row mb-1")} key={row.label}>
              <Text style={tw("text-neutral-500 w-1/3")}>{row.label}</Text>
              {row.value}
            </View>
          ))}
        </View>
        {/* Divider */}
        <View style={tw("h-0.5 bg-neutral-200 mb-6")} />

        {/* Footer */}
        <Text style={tw("text-sm text-neutral-600 mt-auto")}>
          If you have any questions, contact the program at{" "}
          <Link href={`mailto:${supportEmail}`} style={tw("text-neutral-900")}>
            {supportEmail}
          </Link>
        </Text>
      </Page>
    </Document>,
  );

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="payout-invoice-${payout.id}.pdf"`,
    },
  });
});
