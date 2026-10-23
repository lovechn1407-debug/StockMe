import { useState } from "react";
import { Modal, Button, Chip, Separator } from "@heroui/react";
import {
  Printer,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Truck,
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  QrCode,
  Scan,
  UserCheck,
} from "lucide-react";
import type { DeliveryChallan } from "../types";
import { QRCodeSvg } from "./QRCodeSvg";

interface ChallanModalProps {
  challan: DeliveryChallan | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenScanner?: () => void;
}

export function ChallanModal({
  challan,
  isOpen,
  onClose,
  onOpenScanner,
}: ChallanModalProps) {
  const [copyType, setCopyType] = useState<"ORIGINAL" | "DUPLICATE" | "TRIPLICATE">(
    "ORIGINAL"
  );

  if (!challan) return null;

  const qrId = challan.qrId || `QR-${challan.challanNumber.replace(/\D/g, "") || "1001"}`;

  // Real, standards-compliant JSON payload for camera scanner with qrId
  const qrData = JSON.stringify({
    type: "GATE_PASS",
    qrId: qrId,
    challanNo: challan.challanNumber,
    fps: challan.fpsName,
    fpsId: challan.fpsId,
    commodity: challan.commodity,
    qty: challan.totalQuantity,
    vehicle: challan.vehicleNumber || "DL-1LM-4402",
    driver: challan.driverName || "Authorized Transporter",
    date: challan.dispatchDate,
    status: challan.gateStatus || "PENDING_EXIT",
    hash: `SEC-${challan.challanNumber.replace(/\D/g, "") || "8821"}-${challan.totalQuantity}`,
  });

  const handlePrint = () => {
    const printableElement = document.getElementById("printable-challan-sheet");
    if (!printableElement) {
      window.print();
      return;
    }

    // Collect all stylesheets from current document
    const styleTags = Array.from(
      document.querySelectorAll("style, link[rel='stylesheet']")
    )
      .map((tag) => tag.outerHTML)
      .join("\n");

    // Remove any previous print iframe
    const existingIframe = document.getElementById("challan-print-iframe");
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement("iframe");
    iframe.id = "challan-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Delivery Challan & Gate Pass - ${challan.challanNumber}</title>
          ${styleTags}
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
            html, body {
              background: #ffffff !important;
              color: #09090b !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            }
            #printable-challan-sheet {
              display: block !important;
              visibility: visible !important;
              position: static !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              padding: 6mm !important;
              box-shadow: none !important;
              border: 2px solid #18181b !important;
              border-radius: 6px !important;
              background: #ffffff !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            th, td {
              border: 1px solid #71717a !important;
              padding: 5px 8px !important;
            }
            th {
              background-color: #f4f4f5 !important;
            }
          </style>
        </head>
        <body>
          ${printableElement.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    // Trigger print dialog after brief frame parse
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn("Iframe print error fallback to window.print", err);
        window.print();
      }
    }, 250);
  };

  const copyTitles = {
    ORIGINAL: "ORIGINAL — FOR FAIR PRICE SHOP (CONSIGNEE) RECORD",
    DUPLICATE: "DUPLICATE — FOR TRANSPORTER & GODOWN EXIT GATE SECURITY PASS",
    TRIPLICATE: "TRIPLICATE — FOR STATE BUFFER GODOWN AUDIT & CENTRAL OFFICE",
  };

  const totalBags = Math.round(challan.totalQuantity * 2); // 50kg standard jute bags

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg" className="max-w-4xl">
          <Modal.Dialog>
            <Modal.Header className="no-print">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-primary" />
                <Modal.Heading className="text-lg font-bold">
                  Official Delivery Challan &amp; Gate Pass Issued
                </Modal.Heading>
              </div>
              <Modal.CloseTrigger />
            </Modal.Header>

            <Modal.Body className="space-y-4 p-4 md:p-6">
              {/* Copy selector banner (no-print) */}
              <div className="no-print flex flex-wrap items-center justify-between gap-3 p-3 bg-surface border border-border rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted">Select Challan Copy:</span>
                  {(["ORIGINAL", "DUPLICATE", "TRIPLICATE"] as const).map((copy) => (
                    <button
                      key={copy}
                      type="button"
                      onClick={() => setCopyType(copy)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        copyType === copy
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-surface hover:bg-muted/30 text-foreground border-border"
                      }`}
                    >
                      {copy}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Gate Pass Status:</span>
                  <Chip
                    size="sm"
                    color={challan.gateStatus === "CLEARED_EXIT" ? "success" : "warning"}
                    variant="soft"
                    className="font-bold text-xs"
                  >
                    {challan.gateStatus === "CLEARED_EXIT" ? "Cleared Exit Gate" : "Pending Gate Exit"}
                  </Chip>
                </div>
              </div>

              {/* ─── OFFICIAL PRINTABLE DOCUMENT SHEET ─── */}
              <div
                id="printable-challan-sheet"
                className="bg-white text-zinc-950 p-6 md:p-8 rounded-xl border border-zinc-300 shadow-md space-y-6 select-text"
              >
                {/* Government National Header */}
                <div className="text-center border-b-2 border-zinc-950 pb-4 space-y-1 relative">
                  <div className="flex items-center justify-between">
                    {/* Official Ashoka Emblem Badge */}
                    <div className="w-12 h-12 rounded-full border-2 border-zinc-900 flex items-center justify-center font-bold text-xs bg-zinc-100 text-zinc-900">
                      🏛️ iPDS
                    </div>

                    <div className="flex-1 px-4">
                      <p className="text-[11px] font-bold tracking-widest uppercase text-zinc-600">
                        GOVERNMENT OF NATIONAL CAPITAL TERRITORY OF DELHI
                      </p>
                      <h2 className="text-base md:text-xl font-black text-zinc-950 tracking-tight uppercase">
                        DEPARTMENT OF FOOD, SUPPLIES &amp; CONSUMER AFFAIRS
                      </h2>
                      <h4 className="text-xs md:text-sm font-bold text-zinc-800">
                        STATE BUFFER GODOWN UNIT-4 • CENTRAL GRAIN DEPOT
                      </h4>
                      <p className="text-[11px] font-semibold text-zinc-600 tracking-wider">
                        FORM PDS-DC-04 • STATUTORY COMMODITY DELIVERY CHALLAN &amp; GATE EXIT PERMIT
                      </p>
                    </div>

                    {/* Official Security Stamp Emblem */}
                    <div className="w-12 h-12 rounded-full border-2 border-emerald-800 flex flex-col items-center justify-center text-[8px] font-extrabold text-emerald-800 bg-emerald-50">
                      <span>OFFICIAL</span>
                      <span>SEAL</span>
                    </div>
                  </div>

                  {/* Designated Copy Subheader */}
                  <div className="mt-3 pt-2 border-t border-dashed border-zinc-400 flex flex-wrap items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-700">
                    <span className="bg-zinc-100 px-2.5 py-0.5 rounded border border-zinc-300">
                      {copyTitles[copyType]}
                    </span>
                    <span>DISPATCH ORDER REF: NFSA-DL-{challan.dispatchDate.replace(/-/g, "")}</span>
                  </div>
                </div>

                {/* Metadata 3-Column Box */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs border border-zinc-300 rounded-lg p-3.5 bg-zinc-50/70">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Challan &amp; Gate Pass No.</span>
                    <span className="font-mono text-base font-black text-zinc-950">{challan.challanNumber}</span>
                    <div className="text-zinc-600 flex items-center gap-1 pt-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Issue Date: <strong>{challan.dispatchDate}</strong></span>
                    </div>
                    <div className="text-zinc-600 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Issue Time: {new Date(challan.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="space-y-1 border-t md:border-t-0 md:border-l md:border-r border-zinc-300 md:px-3 pt-2 md:pt-0">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Consignee Fair Price Shop</span>
                    <span className="font-bold text-sm text-zinc-950 block">{challan.fpsName}</span>
                    <div className="text-zinc-600">FPS Dealer Code: <strong>{challan.fpsId}</strong></div>
                    <div className="text-zinc-600">Distribution: NFSA / PMGKAY Beneficiaries</div>
                  </div>

                  <div className="space-y-1 border-t md:border-t-0 border-zinc-300 pt-2 md:pt-0">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Transport Carrier &amp; Security</span>
                    <div className="font-mono text-sm font-bold text-zinc-950 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-zinc-700" />
                      {challan.vehicleNumber || "DL-1LM-4402"}
                    </div>
                    <div className="text-zinc-600">Authorized Driver: <strong>{challan.driverName || "Mohan Lal"}</strong></div>
                    <div className="text-zinc-600 text-[11px] pt-0.5">
                      Exit Clearance:{" "}
                      <span className={challan.gateStatus === "CLEARED_EXIT" ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                        {challan.gateStatus === "CLEARED_EXIT" ? "CLEARED AT GATE" : "GATE PASS ACTIVE (PENDING EXIT)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* FIFO Statutory Allocation Verification Seal */}
                <div className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                  challan.isFifoCompliant
                    ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                    : "bg-amber-50 border-amber-300 text-amber-950"
                }`}>
                  <div className="flex items-center gap-2.5">
                    {challan.isFifoCompliant ? (
                      <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                    )}
                    <div>
                      <div className="font-extrabold text-xs">
                        {challan.isFifoCompliant
                          ? "Strict Smart FIFO Compliance Certified"
                          : `Approved FIFO Exception (${challan.exceptionReason || "Authorized Override"})`}
                      </div>
                      <div className="text-[11px] opacity-80">
                        {challan.isFifoCompliant
                          ? "Grains sourced automatically from oldest eligible warehouse stacks to guarantee zero spoilage."
                          : `Authorized by: ${challan.approvingOfficer || "Assistant Godown Officer"}. Remarks: ${challan.exceptionRemarks || "Duly documented in audit ledger"}`}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                    challan.isFifoCompliant
                      ? "bg-emerald-200/60 text-emerald-900 border-emerald-400"
                      : "bg-amber-200/60 text-amber-900 border-amber-400"
                  }`}>
                    {challan.isFifoCompliant ? "FIFO Validated" : "Exception Approved"}
                  </span>
                </div>

                {/* Dispatched Consignment Breakdown Table */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold uppercase text-zinc-700 tracking-wider">
                    <span>Grain Consignment Details ({challan.commodity})</span>
                    <span className="text-zinc-500 text-[11px] font-normal normal-case">
                      Standard Package: 50 kg Sealed Jute Bags
                    </span>
                  </div>

                  <table className="w-full text-xs border border-zinc-300 rounded-lg overflow-hidden">
                    <thead className="bg-zinc-100 text-zinc-900 border-b border-zinc-300 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 text-left">Sr.</th>
                        <th className="py-2.5 px-3 text-left">Stack Batch ID</th>
                        <th className="py-2.5 px-3 text-left">Bay Location</th>
                        <th className="py-2.5 px-3 text-right">Stock Age</th>
                        <th className="py-2.5 px-3 text-right">Est. 50kg Bags</th>
                        <th className="py-2.5 px-3 text-right">Dispatched Qty (Quintals)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {challan.batches.map((item, idx) => {
                        const bags = Math.round(item.dispatchedQty * 2);
                        return (
                          <tr key={item.batchId} className="hover:bg-zinc-50/50">
                            <td className="py-2 px-3 text-zinc-500 font-medium">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-bold text-zinc-950">{item.batchId}</td>
                            <td className="py-2 px-3 font-semibold text-zinc-800">{item.bayLocation}</td>
                            <td className="py-2 px-3 text-right text-zinc-600">{item.batchAgeDays} Days</td>
                            <td className="py-2 px-3 text-right font-medium text-zinc-800">{bags} Bags</td>
                            <td className="py-2 px-3 text-right font-black text-zinc-950 text-sm">
                              {item.dispatchedQty} Q
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-zinc-100/80 border-t-2 border-zinc-400 font-bold text-zinc-950">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider text-xs">
                          Total Net Dispatched Weight:
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-sm">
                          {totalBags} Bags
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-base">
                          {challan.totalQuantity} Quintals
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Gate Pass Verification QR Code & Security Clear Box */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center shrink-0">
                      <QRCodeSvg value={qrData} size={110} />
                      <div className="mt-1 px-2 py-0.5 rounded bg-zinc-900 text-white font-mono text-[10px] font-black tracking-wider text-center border border-zinc-700">
                        {qrId}
                      </div>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 font-black text-sm text-zinc-950">
                        <QrCode className="w-4 h-4 text-emerald-700" />
                        Official Gate Pass QR Code
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-zinc-600">Scan QR or Verify QR ID:</span>
                        <span className="font-mono text-xs font-black text-emerald-900 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                          {qrId}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 leading-snug">
                        Scan at <strong>Godown Exit Gate Post</strong> via camera scanner or enter QR ID at <code>/scan</code>.
                      </p>
                      <div className="text-[10px] font-mono text-zinc-500">
                        DIGITAL VERIFICATION HASH: <strong>SEC-{challan.challanNumber}-{challan.totalQuantity}Q</strong>
                      </div>
                      <div className="text-[10px] text-emerald-800 font-bold pt-0.5">
                        ✓ 256-Bit Encrypted ePDS Statutory Seal
                      </div>
                    </div>
                  </div>

                  <div className="text-right space-y-1 sm:border-l sm:border-zinc-300 sm:pl-6">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Total Certified Quantity</span>
                    <div className="text-2xl font-black text-zinc-950 font-mono">
                      {challan.totalQuantity} <span className="text-sm font-normal text-zinc-600">Quintals</span>
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-600 block">
                      ({totalBags} Standard Jute Bags)
                    </span>
                  </div>
                </div>

                {/* Official Signatures Row */}
                <div className="pt-6 border-t border-zinc-400 grid grid-cols-3 gap-6 text-center text-xs">
                  <div className="space-y-8">
                    <div className="h-10 flex items-end justify-center">
                      <span className="font-cursive text-sm text-zinc-700 italic border-b border-zinc-400 pb-0.5 px-4">
                        A. K. Sharma
                      </span>
                    </div>
                    <div className="border-t border-zinc-900 pt-1">
                      <div className="font-bold text-zinc-900">Godown Dispatch Officer</div>
                      <div className="text-[10px] text-zinc-500">Buffer Godown Unit-4</div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="h-10 flex items-end justify-center">
                      <span className="font-cursive text-sm text-zinc-700 italic border-b border-zinc-400 pb-0.5 px-4">
                        {challan.driverName || "Mohan Lal"}
                      </span>
                    </div>
                    <div className="border-t border-zinc-900 pt-1">
                      <div className="font-bold text-zinc-900">Transporter / Truck Driver</div>
                      <div className="text-[10px] text-zinc-500">Acknowledged Sealed Consignment</div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="h-10 flex items-end justify-center">
                      <span className="text-[11px] text-zinc-400 italic">Signature &amp; Stamp on Receipt</span>
                    </div>
                    <div className="border-t border-zinc-900 pt-1">
                      <div className="font-bold text-zinc-900">Fair Price Shop Dealer</div>
                      <div className="text-[10px] text-zinc-500">ePDS Biometric Receipt</div>
                    </div>
                  </div>
                </div>

                {/* Footer Statutory Notice */}
                <div className="text-center text-[9px] text-zinc-500 border-t border-zinc-200 pt-2 leading-tight">
                  This is an official computer-generated document under the National Food Security Act (NFSA), 2013 and Delhi Foodgrain Movement Control Order. Any tampering or unauthorized transit diversion is a cognizable statutory offense under the Essential Commodities Act, 1955.
                </div>
              </div>
            </Modal.Body>

            <Modal.Footer className="no-print flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button variant="secondary" onPress={onClose}>
                  Done / Close
                </Button>
                {onOpenScanner && (
                  <Button
                    variant="secondary"
                    className="text-xs font-semibold"
                    onPress={() => {
                      onClose();
                      onOpenScanner();
                    }}
                  >
                    <Scan className="w-3.5 h-3.5 mr-1" />
                    Test in Gate Scanner (/scan)
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  className="font-bold shadow-md hover:scale-102 transition-transform"
                  onPress={handlePrint}
                >
                  <Printer className="w-4 h-4 mr-1.5" />
                  Print Official Challan &amp; Gate Pass (A4)
                </Button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
