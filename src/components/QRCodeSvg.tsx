import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRCodeSvgProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Standards-compliant, authentic QR Code Generator.
 * Fully readable by phone cameras, barcode guns, and browser scanner agents.
 */
export function QRCodeSvg({ value, size = 140, className = "" }: QRCodeSvgProps) {
  const [svgXml, setSvgXml] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    QRCode.toString(value, {
      type: "svg",
      margin: 1,
      width: size,
      errorCorrectionLevel: "M",
      color: {
        dark: "#09090b",
        light: "#ffffff",
      },
    })
      .then((xml) => {
        if (isMounted) setSvgXml(xml);
      })
      .catch((err) => {
        console.error("QR Code generation error:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  if (!svgXml) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-white rounded border border-border flex items-center justify-center text-[10px] text-muted animate-pulse ${className}`}
      >
        Generating QR...
      </div>
    );
  }

  return (
    <div
      className={`bg-white p-1 rounded-md border border-border shadow-2xs inline-flex items-center justify-center shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svgXml }}
      role="img"
      aria-label={`Official QR Code for: ${value.slice(0, 40)}`}
    />
  );
}
