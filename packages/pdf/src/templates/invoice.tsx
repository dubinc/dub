"use client";

import { Document, Page, Text, View } from "@react-pdf/renderer";

export function InvoiceTemplate({
  invoice,
}: {
  invoice: {
    id: string;
    date: string;
    amount: number;
    items: { description: string; quantity: number; price: number }[];
  };
}) {
  return (
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
    </Document>
  );
}
