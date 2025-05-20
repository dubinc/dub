// "use client";
//
// import { Document, Page, pdfjs } from "react-pdf";
//
// pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.js";
//
// export function QRCodeDemoPdf({ files }: { files: File[] }) {
//   const file = files[0];
//
//   return (
//     <Document file={file}>
//       <Page pageNumber={1} />
//     </Document>
//   );
// }

import dynamic from "next/dynamic";

const PDFViewer = dynamic(() => import("../pdf-viewer.tsx"), {
  ssr: false,
});

export default function QRCodeDemoPdf() {
  return <PDFViewer />;
}
