import { DubApiError } from "@/lib/api/errors";
import { withPartnerProfile } from "@/lib/auth/partner";
import { prisma } from "@dub/prisma";
import { currencyFormatter, DUB_WORDMARK, formatDate } from "@dub/utils";
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

// GET /api/partner-profile/payouts/[payoutId]/invoice - get the invoice for a payout
export const GET = withPartnerProfile(async ({ partner, session, params }) => {
  const { payoutId } = params;

  const payout = await prisma.payout.findUniqueOrThrow({
    where: {
      id: payoutId,
    },
    select: {
      id: true,
      status: true,
      invoiceId: true,
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

  console.log(payout);

  if (payout.partnerId !== partner.id) {
    throw new DubApiError({
      code: "unauthorized",
      message: "You are not authorized to view this payout.",
    });
  }

  if (payout.status !== "completed") {
    throw new DubApiError({
      code: "unauthorized",
      message:
        "This payout is not completed yet, hence no invoice is generated.",
    });
  }

  const invoiceMetadata = [
    {
      label: "Program",
      value: payout.program.name,
    },
    {
      label: "Period",
      value:
        payout.periodStart && payout.periodEnd
          ? `${formatDate(payout.periodStart, {
              month: "short",
              year: "numeric",
            })} - ${formatDate(payout.periodEnd, { month: "short" })}`
          : "-",
    },
    {
      label: "Description",
      value: payout.description || "-",
    },
    {
      label: "Amount",
      value: currencyFormatter(payout.amount / 100, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    },
    {
      label: "VAT",
      value: "VAT to be paid on reverse charge basis.",
    },
    {
      label: "Payout reference number",
      value: payout.id,
    },
  ];

  const dubAddress = {
    name: "Dub Technologies, Inc.",
    line1: "2261 Market Street STE 5906",
    city: "San Francisco",
    state: "CA",
    postalCode: "94114",
  };

  const supportEmail = payout.program.supportEmail || "support@dub.co";

  const pdf = await renderToBuffer(
    <Document>
      <Page size="A4" style={tw("p-20 bg-white")}>
        <View style={tw("flex-row justify-between items-center mb-10")}>
          <Image src={DUB_WORDMARK} style={tw("w-20 h-10")} />
          <View style={tw("text-right w-1/2")}>
            <Text style={tw("text-sm font-medium text-neutral-800")}>
              Dub Technologies Inc.
            </Text>
            <Text style={tw("text-sm text-neutral-500 ")}>support@dub.co</Text>
          </View>
        </View>

        <View style={tw("flex-col gap-2 text-sm font-medium mb-10")}>
          {invoiceMetadata.map((row) => (
            <View style={tw("flex-row")} key={row.label}>
              <Text style={tw("text-neutral-500 w-1/5")}>{row.label}</Text>
              <Text style={tw("text-neutral-800 w-4/5")}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* <View style={tw("flex-row justify-between mb-10 ")}>
          {addresses.map(({ title, address }, index) => {
            const cityStatePostal = [
              address.city,
              address.state,
              address.postalCode,
            ]
              .filter(Boolean)
              .join(", ");

            const records = [
              address.companyName,
              address.name,
              address.line1,
              address.line2,
              cityStatePostal,
              address.email,
            ].filter((record) => record && record.length > 0);

            return (
              <View style={tw("w-1/2")} key={index}>
                <Text
                  style={tw(
                    "text-sm font-medium text-neutral-800 leading-6 mb-2",
                  )}
                >
                  {title}
                </Text>
                {records.map((record, index) => (
                  <Text
                    style={tw("font-normal text-sm text-neutral-500 leading-6")}
                    key={index}
                  >
                    {record}
                  </Text>
                ))}
              </View>
            );
          })}
        </View> */}

        {/* <View
          style={tw(
            "flex-row justify-between border border-neutral-200 rounded-xl mb-6",
          )}
        >
          <View style={tw("flex-col gap-2 w-1/2 p-4")}>
            <Text style={tw("text-neutral-500 font-normal text-sm")}>
              Payouts
            </Text>
            <Text style={tw("text-neutral-800 font-medium text-[16px]")}>
              {invoice.payouts.length}
            </Text>
          </View>

          <View
            style={tw(
              "flex-col items-start gap-2 border-l border-neutral-200 w-1/2 p-4",
            )}
          >
            <Text style={tw("text-neutral-500 font-normal text-sm")}>
              Total
            </Text>
            <Text style={tw("text-neutral-800 font-medium text-[16px]")}>
              {currencyFormatter(invoice.total / 100, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View> */}

        {/* <View
          style={tw(
            "flex-col gap-2 mb-10 p-4 border border-neutral-100 rounded-xl bg-neutral-50",
          )}
        >
          {invoiceSummaryDetails.map((row) => (
            <View style={tw("flex-row")} key={row.label}>
              <Text style={tw("text-neutral-500 text-sm font-medium w-2/5")}>
                {row.label}
              </Text>
              <Text style={tw("text-neutral-800 text-sm font-medium w-3/5")}>
                {row.value}
              </Text>
            </View>
          ))}
        </View> */}

        <Text style={tw("text-sm text-neutral-600 mt-6")}>
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
      "Content-Disposition": `inline; filename="Invoice-${payout.id}.pdf"`,
    },
  });
});
