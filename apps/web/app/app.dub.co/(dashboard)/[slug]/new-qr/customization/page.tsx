"use client";

import QRCodeStyling, { FileExtension, Options } from "qr-code-styling";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { STEPS } from "../constants.ts";
import { usePageContext } from "../page-context.tsx";

export default function NewQRCustomization() {
  const { setTitle, setCurrentStep } = usePageContext();
  const [options, setOptions] = useState<Options>({
    width: 300,
    height: 300,
    type: "svg",
    data: "http://qr-code-styling.com",
    image:
      "https://assets.vercel.com/image/upload/front/favicon/vercel/180x180.png",
    margin: 10,
    qrOptions: {
      typeNumber: 0,
      mode: "Byte",
      errorCorrectionLevel: "Q",
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.4,
      margin: 20,
      crossOrigin: "anonymous",
      saveAsBlob: true,
    },
    dotsOptions: {
      color: "#222222",
    },
    backgroundOptions: {
      color: "#5FD4F3",
    },
    cornersSquareOptions: {
      type: "square", // 'dot' 'square' 'extra-rounded' 'rounded' 'dots' 'classy' 'classy-rounded'
    },
    cornersDotOptions: {
      type: "extra-rounded", // 'dot' 'square' 'extra-rounded' 'rounded' 'dots' 'classy' 'classy-rounded'
    },
  });
  const [fileExt, setFileExt] = useState<FileExtension>("svg");
  const [qrCode, setQrCode] = useState<QRCodeStyling>();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitle(STEPS.customization.title);
    setCurrentStep(STEPS.customization.step);

    const qrCodeStyling = new QRCodeStyling(options);

    const customCornerSquaresExtension = (svg, options) => {
      const { width, height } = options;

      // Function to create a triangle for the corner square
      const createTriangle = (x, y, size) => {
        const triangle = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "polygon",
        );
        const points = `${x},${y} ${x + size},${y} ${x + size / 2},${y - size}`;
        triangle.setAttribute("points", points);
        triangle.setAttribute("fill", "#222222"); // Set color
        return triangle;
      };

      // Top-left corner: replace the square with a triangle
      const topLeftCorner = svg.querySelectorAll(".qr-corner-square")[0]; // Adjust selector if necessary
      if (topLeftCorner) {
        const rect = topLeftCorner.getBoundingClientRect();
        const x = rect.left;
        const y = rect.top;
        const triangle = createTriangle(x, y, rect.width);
        svg.removeChild(topLeftCorner);
        svg.appendChild(triangle);
      }

      // Top-right corner: replace the square with a triangle
      const topRightCorner = svg.querySelectorAll(".qr-corner-square")[1]; // Adjust selector if necessary
      if (topRightCorner) {
        const rect = topRightCorner.getBoundingClientRect();
        const x = rect.left;
        const y = rect.top;
        const triangle = createTriangle(x, y, rect.width);
        svg.removeChild(topRightCorner);
        svg.appendChild(triangle);
      }

      // Bottom-left corner: replace the square with a triangle
      const bottomLeftCorner = svg.querySelectorAll(".qr-corner-square")[2]; // Adjust selector if necessary
      if (bottomLeftCorner) {
        const rect = bottomLeftCorner.getBoundingClientRect();
        const x = rect.left;
        const y = rect.top;
        const triangle = createTriangle(x, y, rect.width);
        svg.removeChild(bottomLeftCorner);
        svg.appendChild(triangle);
      }
    };

    qrCodeStyling.applyExtension(customCornerSquaresExtension);

    setQrCode(qrCodeStyling);
  }, []);

  useEffect(() => {
    if (ref.current) {
      qrCode?.append(ref.current);
    }
  }, [qrCode, ref]);

  useEffect(() => {
    if (!qrCode) return;
    qrCode?.update(options);
  }, [qrCode, options]);

  const onDataChange = (event: ChangeEvent<HTMLInputElement>) => {
    setOptions((options) => ({
      ...options,
      data: event.target.value,
    }));
  };

  const onExtensionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFileExt(event.target.value as FileExtension);
  };

  const onDownloadClick = () => {
    if (!qrCode) return;
    qrCode.download({
      extension: fileExt,
    });
  };

  return (
    <>
      <div ref={ref} />
      <div>
        <input value={options.data} onChange={onDataChange} />
        <select onChange={onExtensionChange} value={fileExt}>
          <option value="svg">SVG</option>
          <option value="png">PNG</option>
          <option value="jpeg">JPEG</option>
          <option value="webp">WEBP</option>
        </select>
        <button onClick={onDownloadClick}>Download</button>
      </div>
    </>
  );
}
