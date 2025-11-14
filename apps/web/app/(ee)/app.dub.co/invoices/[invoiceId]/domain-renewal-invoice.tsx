import { stripe } from "@/lib/stripe";
import { prisma } from "@dub/prisma";
import { currencyFormatter, DUB_WORDMARK, formatDate } from "@dub/utils";
import { Invoice, Project } from "@prisma/client";
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
import Stripe from "stripe";

const tw = createTw({
  theme: {
    fontFamily: {
      //
    },
  },
});

export async function DomainRenewalInvoice({
  invoice,
  workspace,
}: {
  invoice: Invoice;
  workspace: Pick<Project, "id" | "name" | "stripeId">;
}) {
  const domains = await prisma.registeredDomain.findMany({
    where: {
      slug: {
        in: invoice.registeredDomains as string[],
      },
    },
    select: {
      slug: true,
      renewalFee: true,
    },
  });

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
  ];
  const invoiceSummaryDetails = [
    {
      label: "Invoice amount",
      value: currencyFormatter(invoice.amount),
    },
    {
      label: `Platform fees (${Math.round((invoice.fee / invoice.amount) * 100)}%)`,
      value: `${currencyFormatter(invoice.fee)}`,
    },
    {
      label: "Invoice total",
      value: currencyFormatter(invoice.total),
    },
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
        email: "support@dub.co",
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

        <View style={tw("flex-row justify-between mb-10 ")}>
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
              Domains
            </Text>
            <Text style={tw("text-neutral-800 font-medium text-[16px]")}>
              {domains.length}
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

        {domains.length > 0 && (
          <View style={tw("mb-6 border border-neutral-200 rounded-xl")}>
            <View style={tw("flex-row border-neutral-200 border-b")}>
              <Text
                style={tw("w-[70%] p-2.5 text-sm font-medium text-neutral-700")}
              >
                Domain
              </Text>
              <Text
                style={tw("w-[30%] p-2.5 text-sm font-medium text-neutral-700")}
              >
                Renewal Fee
              </Text>
            </View>

            {domains.map((domain, index) => (
              <View
                key={index}
                style={tw(
                  `flex-row text-sm font-medium text-neutral-700 border-neutral-200 items-center ${index + 1 === domains.length ? "" : "border-b"}`,
                )}
              >
                <Text style={tw("w-[70%] p-2.5")}>{domain.slug}</Text>
                <Text style={tw("w-[30%] p-2.5")}>
                  {currencyFormatter(domain.renewalFee)}
                </Text>
              </View>
            ))}
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
}
