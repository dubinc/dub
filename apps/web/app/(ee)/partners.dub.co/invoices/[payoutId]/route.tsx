import { DubApiError } from "@/lib/api/errors";
import { withPartnerProfile } from "@/lib/auth/partner";
import { prisma } from "@dub/prisma";
import {
  currencyFormatter,
  DUB_WORDMARK,
  EU_COUNTRY_CODES,
  formatDate,
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
    select: {
      id: true,
      status: true,
      partnerId: true,
      periodStart: true,
      periodEnd: true,
      description: true,
      amount: true,
      program: {
        select: {
          name: true,
          logo: true,
          supportEmail: true,
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
    {
      label: "Period",
      value: (
        <Text style={tw("text-neutral-800 w-2/3")}>
          {payout.periodStart && payout.periodEnd
            ? `${formatDate(payout.periodStart, {
                month: "short",
                year: "numeric",
              })} - ${formatDate(payout.periodEnd, { month: "short" })}`
            : "-"}
        </Text>
      ),
    },
    {
      label: "Description",
      value: (
        <Text style={tw("text-neutral-800 w-2/3")}>
          {payout.description || "-"}
        </Text>
      ),
    },
    {
      label: "Amount",
      value: (
        <Text style={tw("text-neutral-800 w-2/3")}>
          {currencyFormatter(payout.amount / 100, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      ),
    },
    {
      label: "Payout reference number",
      value: <Text style={tw("text-neutral-800 w-2/3")}>{payout.id}</Text>,
    },
    // if partner is in EU, add VAT reverse charge note:
    ...(partner.country && EU_COUNTRY_CODES.includes(partner.country)
      ? [
          {
            label: "VAT",
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

  const pdf = await renderToBuffer(
    <Document>
      <Page size="A4" style={tw("p-20 bg-white flex flex-col min-h-full")}>
        <View style={tw("flex-1")}>
          <View style={tw("flex-row justify-between items-center mb-10")}>
            <Image src={DUB_WORDMARK} style={tw("w-20 h-10")} />
            <View style={tw("text-right w-1/2")}>
              <Text style={tw("text-sm font-medium text-neutral-800")}>
                Dub Technologies INC
              </Text>
              <Text style={tw("text-sm text-neutral-500")}>
                2261 Market Street STE 5906
              </Text>
              <Text style={tw("text-sm text-neutral-500")}>
                San Francisco, CA 94114
              </Text>
            </View>
          </View>

          <Text style={tw("text-lg font-bold text-neutral-900 mb-4 leading-6")}>
            Invoice detail
          </Text>
          <View style={tw("flex-col gap-4 text-sm font-medium mb-10")}>
            {invoiceMetadata.map((row) => (
              <View style={tw("flex-row")} key={row.label}>
                <Text style={tw("text-neutral-500 w-1/3")}>{row.label}</Text>
                {row.value}
              </View>
            ))}
          </View>
        </View>

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
