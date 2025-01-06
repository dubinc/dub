import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import { capitalize, currencyFormatter, formatDate } from "@dub/utils";
import {
  Document,
  Image,
  Link,
  Page,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { createTw } from "react-pdf-tailwind";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const tw = createTw({
  theme: {
    fontFamily: {
      sans: ["Inter"],
    },
  },
});

export const GET = withWorkspace(async ({ workspace, params }) => {
  const { invoiceId } = params;

  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: {
      id: invoiceId,
    },
    select: {
      id: true,
      workspaceId: true,
      amount: true,
      fee: true,
      total: true,
      createdAt: true,
      status: true,
      payouts: {
        select: {
          periodStart: true,
          periodEnd: true,
          type: true,
          amount: true,
          partner: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (invoice.workspaceId !== workspace.id) {
    throw new DubApiError({
      code: "unauthorized",
      message: "You are not authorized to view this invoice",
    });
  }

  if (invoice.status !== "completed") {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: "You can download the invoice once it is completed.",
    });
  }

  const customer = (await stripe.customers.retrieve(
    workspace.stripeId!,
  )) as Stripe.Customer;

  const customerAddress = customer.shipping?.address;

  const invoiceMetadata = [
    {
      label: "Date",
      value: invoice.createdAt.toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
    },
    {
      label: "Receipt #",
      value: "3149-0001",
    },
    {
      label: "Invoice #",
      value: "1354-2341-123",
    },
  ];

  const invoiceSummaryDetails = [
    {
      label: "Amount",
      value: currencyFormatter(invoice.amount / 100, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    },
    {
      label: "Fees",
      value: currencyFormatter(invoice.fee / 100, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    },
    {
      label: "Total",
      value: currencyFormatter(invoice.total / 100, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    },
  ];

  const pdf = await renderToBuffer(
    <Document>
      <Page size="A4" style={tw("p-20")}>
        <View style={tw("flex-row justify-between items-center mb-10")}>
          <Image
            src="https://dubassets.com/logos/clrei1gld0002vs9mzn93p8ik_384uSfo"
            style={tw("w-12 h-12")}
          />
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

        <View style={tw("flex-row justify-between mb-10 ")}>
          <Address
            title="From"
            name="Dub Technologies, Inc."
            line1="2261 Market Street STE 5906"
            city="San Francisco"
            state="CA"
            postalCode="94114"
            email="support@dub.co"
          />

          <Address
            title="Bill to"
            name={customer.shipping?.name}
            line1={customerAddress?.line1}
            line2={customerAddress?.line2}
            city={customerAddress?.city}
            state={customerAddress?.state}
            postalCode={customerAddress?.postal_code}
          />
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
        </View>

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
              Type
            </Text>
            <Text
              style={tw("w-1/6 p-3.5 text-sm font-medium text-neutral-700")}
            >
              Amount
            </Text>
          </View>

          {invoice.payouts.map((payout, index) => (
            <View
              key={index}
              style={tw(
                `flex-row text-sm font-medium text-neutral-700 border-neutral-200 ${index + 1 === invoice.payouts.length ? "" : "border-b"}`,
              )}
            >
              <View style={tw("flex-row items-center gap-2 w-2/6 p-3.5")}>
                <Image
                  src={payout.partner.image!}
                  style={tw("w-5 h-5 rounded-full")}
                />
                <Text>{payout.partner.name}</Text>
              </View>
              <Text style={tw("w-2/6 p-3.5")}>
                {formatDate(payout.periodStart!, {
                  month: "short",
                  year:
                    new Date(payout.periodStart!).getFullYear() ===
                    new Date(payout.periodEnd!).getFullYear()
                      ? undefined
                      : "numeric",
                })}
                -{formatDate(payout.periodEnd!, { month: "short" })}
              </Text>
              <Text style={tw("w-1/6 p-3.5")}>{capitalize(payout.type)}</Text>
              <Text style={tw("w-1/6 p-3.5")}>
                {currencyFormatter(payout.amount / 100, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          ))}
        </View>

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
          If you have any questions, visit our support site at{" "}
          <Link href="https://dub.co/help" style={tw("text-neutral-900")}>
            https://dub.co/help
          </Link>{" "}
          or contact us at{" "}
          <Link href="mailto:support@dub.co" style={tw("text-neutral-900")}>
            support@dub.co
          </Link>
        </Text>
      </Page>
    </Document>,
  );

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-disposition": "inline",
    },
  });
});

// Address component
const Address = ({
  name,
  line1,
  line2,
  city,
  state,
  postalCode,
  title,
  email,
}: {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  title: string;
  email?: string | null;
}) => {
  return (
    <View style={tw("w-1/2")}>
      <Text style={tw("text-sm font-medium text-neutral-800 leading-6 mb-2")}>
        {title}
      </Text>
      <Text style={tw("font-normal text-sm text-neutral-500 leading-6")}>
        {name}
      </Text>
      <Text style={tw("font-normal text-sm text-neutral-500 leading-6")}>
        {line1}
      </Text>
      <Text style={tw("font-normal text-sm text-neutral-500 leading-6")}>
        {line2}
      </Text>
      <Text style={tw("font-normal text-sm text-neutral-500 leading-6")}>
        {city}, {state} {postalCode}
      </Text>
      <Text style={tw("font-normal text-sm text-neutral-500 leading-6")}>
        {email}
      </Text>
    </View>
  );
};
