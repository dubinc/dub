import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import {
  Document,
  Page,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

export const dynamic = "force-dynamic";

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

  if (invoice.status !== "completed") {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: "You can download the invoice once it is completed.",
    });
  }

  const pdf = await renderToBuffer(
    <Document>
      <Page size="A4">
        <View>
          <Text>Invoice #{invoice.id}</Text>
          <Text>Date: {invoice.createdAt.toLocaleDateString()}</Text>
        </View>
        <View>
          {invoice.payouts.map((payout, index) => (
            <View
              key={index}
              style={{ marginTop: 20, borderTop: "1px solid #000" }}
            >
              <Text>Description: {payout.description}</Text>
              <Text>Quantity: {payout.quantity}</Text>
              <Text>Price: {payout.total}</Text>
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
