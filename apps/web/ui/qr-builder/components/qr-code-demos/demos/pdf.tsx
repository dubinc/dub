import { LoadingCircle } from "@dub/ui";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("../pdf-viewer.tsx"), {
  ssr: false,
  loading: () => (
    <LoadingCircle className="fill-secondary text-secondary-100 h-10 w-10 self-center" />
  ),
});

interface IQRCodeDemoPdfProps {
  files: File[];
}
export default function QRCodeDemoPdf({ files }: IQRCodeDemoPdfProps) {
  return <PdfViewer file={files?.[0]} />;
}
