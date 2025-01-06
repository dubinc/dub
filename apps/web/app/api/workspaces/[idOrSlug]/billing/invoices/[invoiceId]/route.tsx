import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { currencyFormatter } from "@dub/utils";
import {
  Document,
  Font,
  Image,
  Page,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { createTw } from "react-pdf-tailwind";

Font.register({
  family: "Open Sans",
  src: "https://fonts.gstatic.com/s/opensans/v18/mem8YaGs126MiZpBA-U1Ug.ttf", // URL to the font file
});

export const dynamic = "force-dynamic";

const tw = createTw(
  {
    theme: {
      extend: {
        colors: {
          primary: "#000",
        },
        // fontFamily: {
        //   sans: "Open Sans",
        // },
      },
    },
  },
  {
    ptPerRem: 12,
  },
);

export const GET = withWorkspace(async ({ workspace, params }) => {
  const { invoiceId } = params;

  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: {
      id: invoiceId,
    },
    include: {
      payouts: true,
    },
  });

  if (invoice.workspaceId !== workspace.id) {
    throw new DubApiError({
      code: "unauthorized",
      message: "You are not authorized to view this invoice",
    });
  }

  // if (invoice.status !== "completed") {
  //   throw new DubApiError({
  //     code: "unprocessable_entity",
  //     message: "You can download the invoice once it is completed.",
  //   });
  // }

  const pdf = await renderToBuffer(
    <Document>
      <Page size="A4" style={tw("p-20")}>
        <View style={tw("flex-row justify-between items-center")}>
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

        <View style={tw("flex-col gap-2 text-sm mt-10 font-medium")}>
          <View style={tw("flex-row")}>
            <Text style={tw("text-neutral-500 w-1/5")}>Date</Text>
            <Text style={tw("text-neutral-800 w-4/5")}>
              {invoice.createdAt.toLocaleString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })}
            </Text>
          </View>

          <View style={tw("flex-row")}>
            <Text style={tw("text-neutral-500 w-1/5")}>Receipt #</Text>
            <Text style={tw("text-neutral-800 w-4/5")}>3149-0001</Text>
          </View>

          <View style={tw("flex-row")}>
            <Text style={tw("text-neutral-500 w-1/5")}>Invoice #</Text>
            <Text style={tw("text-neutral-800 w-4/5")}>1354-2341-123</Text>
          </View>
        </View>

        <View
          style={tw(
            "flex-row justify-between mt-10 border border-neutral-200 rounded-xl",
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

        <View>
          {invoice.payouts.map((payout, index) => (
            <View
              key={index}
              style={{ marginTop: 20, borderTop: "1px solid #000" }}
            >
              <Text>Description: {payout.description}</Text>
              <Text>Quantity: {payout.quantity}</Text>
              <Text>Price: {payout.amount}</Text>
            </View>
          ))}
        </View>
        <View>
          <Text>Total: {invoice.amount}</Text>
        </View>
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
