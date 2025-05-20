// "use client";
//
// import { usePdfJs } from "@/ui/qr-builder/hooks/use-pdf-js.ts";
// import { useRef } from "react";
//
// interface Props {
//   file: File;
// }
//
// export const PDFViewer = ({ file }: Props) => {
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);
//
//   usePdfJs(
//     async (pdfjs) => {
//       const typedArray = new Uint8Array(await file.arrayBuffer());
//       const pdf = await pdfjs.getDocument({ data: typedArray }).promise;
//       const page = await pdf.getPage(1);
//
//       const viewport = page.getViewport({ scale: 1.5 });
//       const canvas = canvasRef.current;
//
//       if (!canvas) return;
//       const context = canvas.getContext("2d")!;
//       canvas.height = viewport.height;
//       canvas.width = viewport.width;
//
//       await page.render({ canvasContext: context, viewport }).promise;
//     },
//     [file],
//   );
//
//   return <canvas ref={canvasRef} />;
// };

// import { useState } from "react";
// // import default react-pdf entry
// import { Document, Page, pdfjs } from "react-pdf";
// // import pdf worker as a url, see `next.config.js` and `pdf-worker.js`
// import workerSrc from "../../../../pdf-worker.js";
//
// pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
//
// export default function PDFViewer() {
//   const [file, setFile] = useState("./sample.pdf");
//   const [numPages, setNumPages] = useState(null);
//
//   function onFileChange(event) {
//     setFile(event.target.files[0]);
//   }
//
//   function onDocumentLoadSuccess({ numPages: nextNumPages }) {
//     setNumPages(nextNumPages);
//   }
//
//   // @ts-ignore
//   return (
//     <div>
//       <div>
//         <label htmlFor="file">Load from file:</label>{" "}
//         <input onChange={onFileChange} type="file" />
//       </div>
//       <div>
//         <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
//           {Array.from({ length: numPages }, (_, index) => (
//             <Page
//               key={`page_${index + 1}`}
//               pageNumber={index + 1}
//               renderAnnotationLayer={false}
//               renderTextLayer={false}
//             />
//           ))}
//         </Document>
//       </div>
//     </div>
//   );
// }

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import workerSrc from "../../../../pdf-worker.js";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export default function PDFViewer() {
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState<number | null>(null);

  function onFileChange(event) {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  }

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <div>
      <div>
        <label htmlFor="file">Load from file:</label>{" "}
        <input id="file" type="file" onChange={onFileChange} />
      </div>
      <div>
        {file && (
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(err) =>
              console.error("Failed to load PDF file:", err)
            }
          >
            {Array.from(new Array(numPages), (_, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            ))}
          </Document>
        )}
      </div>
    </div>
  );
}
