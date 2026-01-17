import { FAST_ACH_FEE_CENTS } from "@/lib/constants/payouts";
import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import { Invoice, Project } from "@dub/prisma/client";
import {
  APP_DOMAIN,
  currencyFormatter,
  DUB_WORDMARK,
  EU_COUNTRY_CODES,
  formatDate,
  nFormatter,
  OG_AVATAR_URL,
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
import { endOfMonth, startOfMonth } from "date-fns";
import { createTw } from "react-pdf-tailwind";
import Stripe from "stripe";

const tw = createTw({
  theme: {
    fontFamily: {
      //
    },
  },
});

export async function PartnerPayoutInvoice({
  invoice,
  workspace,
}: {
  invoice: Invoice;
  workspace: Pick<Project, "id" | "name" | "slug" | "stripeId">;
}) {
  const firstEightPayouts = await prisma.payout.findMany({
    where: {
      invoiceId: invoice.id,
    },
    select: {
      periodStart: true,
      periodEnd: true,
      amount: true,
      partner: {
        select: {
          name: true,
          image: true,
        },
      },
    },
    take: 8,
    orderBy: {
      amount: "desc",
    },
  });

  const totalPayouts = await prisma.payout.count({
    where: {
      invoiceId: invoice.id,
    },
  });

  // Show first 5 partners, hide last 3, and show "View +N more" if there are more than 8 total
  const visiblePayouts = firstEightPayouts.slice(0, 5);
  const hiddenPayouts = firstEightPayouts.slice(5, 8); // Last 3 partners for stacked avatars
  const remainingPayoutsTotal = totalPayouts - firstEightPayouts.length;

  let customer: Stripe.Customer | null = null;

  if (workspace.stripeId) {
    try {
      const response = await stripe.customers.retrieve(workspace.stripeId, {
        expand: ["tax_ids"],
      });
      customer = response as Stripe.Customer;
    } catch (error) {
      console.error(error);
    }
  }

  const { amount: chargeAmount, currency: chargeCurrency } =
    invoice.stripeChargeMetadata
      ? (invoice.stripeChargeMetadata as unknown as Stripe.Charge)
      : { amount: undefined, currency: undefined };

  const earliestPeriodStart = visiblePayouts.reduce(
    (acc, payout) => {
      if (!acc) return payout.periodStart;
      if (!payout.periodStart) return acc;
      return payout.periodStart < (acc as Date) ? payout.periodStart : acc;
    },
    null as Date | null,
  );

  const latestPeriodEnd = visiblePayouts.reduce(
    (acc, payout) => {
      if (!acc) return payout.periodEnd;
      if (!payout.periodEnd) return acc;
      return payout.periodEnd > (acc as Date) ? payout.periodEnd : acc;
    },
    null as Date | null,
  );

  const invoiceMetadata = [
    {
      label: "Invoice number",
      value: `#${invoice.number}`,
    },
    {
      label: "Date of issue",
      value: formatDate(invoice.createdAt, {
        month: "short",
        day: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }),
    },
    {
      label: "Payout period",
      value: `${formatDate(
        startOfMonth(earliestPeriodStart || invoice.createdAt),
        {
          month: "short",
          year: "numeric",
        },
      )} - ${formatDate(endOfMonth(latestPeriodEnd || invoice.createdAt), {
        month: "short",
        year: "numeric",
      })}`,
    },
  ];

  const EU_CUSTOMER =
    customer?.address?.country &&
    EU_COUNTRY_CODES.includes(customer.address.country);
  const AU_CUSTOMER =
    customer?.address?.country && customer.address.country === "AU";

  const nonUsdTransactionDisplay =
    chargeAmount && chargeCurrency && chargeCurrency !== "usd"
      ? ` (${currencyFormatter(chargeAmount, {
          currency: chargeCurrency.toUpperCase(),
        })})`
      : "";

  const fastAchFee =
    invoice.paymentMethod === "ach_fast" ? FAST_ACH_FEE_CENTS : 0;

  // guard against invalid invoice amounts
  if (invoice.amount === 0) {
    throw new Error("Invoice amount cannot be zero");
  }
  if (invoice.fee < fastAchFee) {
    throw new Error("Invoice fee cannot be less than Fast ACH fee");
  }

  const invoiceSummaryDetails = [
    {
      label: "Invoice amount",
      value: currencyFormatter(invoice.amount),
    },
    {
      label: `Platform fees (${Math.round(((invoice.fee - fastAchFee) / invoice.amount) * 100)}%)`,
      value: `${currencyFormatter(invoice.fee - fastAchFee)}`,
    },
    ...(fastAchFee > 0
      ? [
          {
            label: "Fast ACH fees",
            value: currencyFormatter(fastAchFee),
          },
        ]
      : []),
    {
      label: "Invoice total",
      value: `${currencyFormatter(invoice.total)}${nonUsdTransactionDisplay}`,
    },
    // if customer is in EU or AU, add VAT/GST reverse charge note
    ...(EU_CUSTOMER || AU_CUSTOMER
      ? [
          {
            label: `${AU_CUSTOMER ? "GST" : "VAT"} reverse charge`,
            value: "Tax to be paid on reverse charge basis.",
          },
        ]
      : []),
  ];

  // Get the first tax ID if available
  const primaryTaxId = customer?.tax_ids?.data?.[0];

  const addresses = [
    {
      title: "From",
      address: {
        name: "Dub Technologies, Inc.",
        line1: "2261 Market Street STE 5906",
        city: "San Francisco",
        state: "CA",
        postalCode: "94114",
      },
    },
    {
      title: "Bill to",
      address: {
        companyName: workspace.name,
        name: customer?.shipping?.name,
        line1: customer?.shipping?.address?.line1,
        line2: customer?.shipping?.address?.line2,
        city: customer?.shipping?.address?.city,
        state: customer?.shipping?.address?.state,
        postalCode: customer?.shipping?.address?.postal_code,
        email: customer?.email,
        taxId: primaryTaxId ? `Tax ID: ${primaryTaxId.value}` : undefined,
      },
    },
  ];

  return await renderToBuffer(
    <Document>
      <Page size="A4" style={tw("p-20 bg-white")}>
        <View style={tw("flex-row justify-between items-center mb-4")}>
          <Image src={DUB_WORDMARK} style={tw("w-20 h-10")} />
        </View>

        <View style={tw("flex-col gap-2 text-sm font-medium mb-10")}>
          {invoiceMetadata.map((row) => (
            <View style={tw("flex-row")} key={row.label}>
              <Text style={tw("text-neutral-500 w-1/5")}>{row.label}</Text>
              <Text style={tw("text-neutral-800 w-4/5")}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={tw("flex-row justify-between mb-4")}>
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
              address.taxId,
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
        </View>

        <View
          style={tw(
            "flex-row justify-between border border-neutral-200 rounded-xl mb-6",
          )}
        >
          <View style={tw("flex-col gap-2 w-1/2 p-4")}>
            <Text style={tw("text-neutral-500 font-normal text-sm")}>
              Payouts
            </Text>
            <Text style={tw("text-neutral-800 font-medium text-[16px]")}>
              {nFormatter(totalPayouts, { full: true })}
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
              {currencyFormatter(invoice.total)}
            </Text>
          </View>
        </View>

        {visiblePayouts.length > 0 && (
          <View style={tw("mb-6 border border-neutral-200 rounded-xl")}>
            <View style={tw("flex-row border-neutral-200 border-b")}>
              <Text
                style={tw("w-2/6 p-3.5 text-sm font-medium text-neutral-700")}
              >
                Partner
              </Text>
              <Text
                style={tw("w-2/6 p-3.5 text-sm font-medium text-neutral-700")}
              >
                Period
              </Text>
              <Text
                style={tw("w-1/6 p-3.5 text-sm font-medium text-neutral-700")}
              >
                Amount
              </Text>
            </View>

            {visiblePayouts.map((payout, index) => (
              <View
                key={index}
                style={tw(
                  `flex-row text-sm font-medium text-neutral-700 border-neutral-200 items-center ${index + 1 === visiblePayouts.length ? "" : "border-b"}`,
                )}
              >
                <View style={tw("flex-row items-center gap-2 w-2/6 p-3.5")}>
                  <Image
                    src={
                      payout.partner.image ??
                      `${OG_AVATAR_URL}${payout.partner.name}`
                    }
                    style={tw("w-5 h-5 rounded-full")}
                  />
                  <Text>{payout.partner.name}</Text>
                </View>
                <Text style={tw("w-2/6 p-3.5")}>
                  {payout.periodStart && payout.periodEnd ? (
                    <>
                      {formatDate(payout.periodStart, {
                        month: "short",
                        year:
                          new Date(payout.periodStart).getFullYear() ===
                          new Date(payout.periodEnd).getFullYear()
                            ? undefined
                            : "numeric",
                      })}
                      -{formatDate(payout.periodEnd, { month: "short" })}
                    </>
                  ) : (
                    "-"
                  )}
                </Text>
                <Text style={tw("w-1/6 p-3.5")}>
                  {currencyFormatter(payout.amount)}
                </Text>
              </View>
            ))}

            {/* Stacked avatars and View +N more row */}
            {(hiddenPayouts.length > 0 || remainingPayoutsTotal > 0) && (
              <View
                style={tw(
                  "flex-row items-center gap-2 p-3.5 w-full text-sm font-medium text-neutral-700 border-neutral-200 border-t",
                )}
              >
                {/* Stacked avatars for hidden partners */}
                <View style={tw("flex-row -space-x-1")}>
                  {hiddenPayouts.slice(0, 4).map((payout, index) => (
                    <Image
                      key={index}
                      src={
                        payout.partner.image ??
                        `${OG_AVATAR_URL}${payout.partner.name}`
                      }
                      style={tw(
                        "h-5 w-5 shrink-0 rounded-full border border-white",
                      )}
                    />
                  ))}
                </View>
                <Link
                  href={`${APP_DOMAIN}/${workspace.slug}/program/payouts?invoiceId=${invoice.id}`}
                  style={tw("text-blue-600")}
                >
                  View +
                  {nFormatter(hiddenPayouts.length + remainingPayoutsTotal, {
                    full: true,
                  })}{" "}
                  more payouts
                </Link>
              </View>
            )}
          </View>
        )}

        <View
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
        </View>

        <Text style={tw("text-sm text-neutral-600 mt-6")}>
          If you have any questions,{" "}
          <Link href="https://dub.co/help" style={tw("text-neutral-900")}>
            visit our help center
          </Link>{" "}
          or{" "}
          <Link href="https://dub.co/support" style={tw("text-neutral-900")}>
            reach out to our support team
          </Link>
          .
        </Text>
      </Page>
    </Document>,
  );
}
