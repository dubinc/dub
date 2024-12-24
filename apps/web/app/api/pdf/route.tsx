import {
  Document,
  Page,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

export const dynamic = "force-dynamic";

export async function GET() {
  const invoice = {
    id: "123",
    date: "2021-01-01",
    amount: 100,
    items: [{ description: "Item 1", quantity: 1, price: 50 }],
  };

  const pdf = await renderToBuffer(
    <Document>
      <Page size="A4">
        <View>
          <Text>Invoice #{invoice.id}</Text>
          <Text>Date: {invoice.date}</Text>
        </View>
        <View>
          {invoice.items.map((item, index) => (
            <View key={index}>
              <Text>{item.description}</Text>
              <Text>Quantity: {item.quantity}</Text>
              <Text>Price: {item.price}</Text>
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
}
