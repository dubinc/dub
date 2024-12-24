import ReactPDF from "@react-pdf/renderer";
import path from "path";
import { fileURLToPath } from "url";
import { InvoiceTemplate } from "./templates/invoice";

// const ReactPDF = dynamic(() => import('@react-pdf/renderer'), { ssr: false });


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const invoice = {
  id: "123",
  date: "2021-01-01",
  amount: 100,
  items: [
    { description: "Item 1", quantity: 1, price: 50 },
    { description: "Item 2", quantity: 2, price: 25 },
  ],
};

export function generatePDF() {
  return ReactPDF.renderToFile(
    <InvoiceTemplate invoice={invoice} />,
    `${__dirname}/invoice.pdf`,
  );
}

export { renderToBuffer, renderToStream } from "@react-pdf/renderer";
