import { useState, useMemo, useRef } from "react";
import { Modal, Button, Chip, Separator } from "@heroui/react";
import {
  Printer,
  QrCode,
  Copy,
  Check,
  Search,
  Boxes,
  Warehouse,
  Sparkles,
  Layers,
  FileDown,
  Tag,
  Hash,
} from "lucide-react";
import QRCode from "qrcode";
import type { Batch } from "../types";
import { QRCodeSvg } from "./QRCodeSvg";
import { getBatchAgeDays } from "../lib/db";

interface QRModalProps {
  batch: Batch | null;
  isOpen: boolean;
  onClose: () => void;
}

interface SackItem {
  index: number;
  serialNumber: string;
  sackQrId: string;
  batchId: string;
  commodity: string;
  bay: string;
}

export function QRModal({ batch, isOpen, onClose }: QRModalProps) {
  const [activeView, setActiveView] = useState<"sack_qrs" | "summary">("sack_qrs");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGeneratingPrint, setIsGeneratingPrint] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllSacks, setShowAllSacks] = useState(false);

  const ITEMS_PER_PAGE = 24;

  // Calculate total sacks from total quintals * 2 (1 Quintal = 100 kg = two 50 kg sacks)
  const totalQuintals = useMemo(() => {
    if (!batch) return 0;
    return Number(batch.receivedQty || batch.remainingQty || 0);
  }, [batch]);

  const totalSacks = useMemo(() => {
    return Math.max(1, Math.round(totalQuintals * 2));
  }, [totalQuintals]);

  const padLength = useMemo(() => {
    return Math.max(3, String(totalSacks).length);
  }, [totalSacks]);

  // Generate all sacks for this batch
  const allSacks = useMemo<SackItem[]>(() => {
    if (!batch) return [];
    const list: SackItem[] = [];
    for (let i = 1; i <= totalSacks; i++) {
      const serial = String(i).padStart(padLength, "0");
      list.push({
        index: i,
        serialNumber: serial,
        sackQrId: `${batch.id}_${serial}`,
        batchId: batch.id,
        commodity: batch.commodity,
        bay: batch.bayLocation,
      });
    }
    return list;
  }, [batch, totalSacks, padLength]);

  // Filtered sacks by search query
  const filteredSacks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allSacks;
    return allSacks.filter(
      (s) =>
        s.serialNumber.includes(q) ||
        s.sackQrId.toLowerCase().includes(q) ||
        String(s.index) === q
    );
  }, [allSacks, searchQuery]);

  // Paginated view for on-screen performance
  const paginatedSacks = useMemo(() => {
    if (showAllSacks || filteredSacks.length <= ITEMS_PER_PAGE) {
      return filteredSacks;
    }
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSacks.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSacks, currentPage, showAllSacks]);

  const totalPages = Math.ceil(filteredSacks.length / ITEMS_PER_PAGE);

  // Copy Sack QR ID helper
  const handleCopy = (sackQrId: string) => {
    navigator.clipboard?.writeText(sackQrId);
    setCopiedId(sackQrId);
    setTimeout(() => {
      setCopiedId((prev) => (prev === sackQrId ? null : prev));
    }, 2000);
  };

  // Generate and Print All QRs in Passport Size PDF Format
  const handlePrintAllPassportPDF = async (targetSacks: SackItem[] = allSacks) => {
    if (!batch || targetSacks.length === 0) return;
    setIsGeneratingPrint(true);

    try {
      // 1. Generate SVG strings for all requested sacks
      const svgMap = new Map<string, string>();
      await Promise.all(
        targetSacks.map(async (s) => {
          const svg = await QRCode.toString(s.sackQrId, {
            type: "svg",
            margin: 1,
            width: 100,
            errorCorrectionLevel: "M",
            color: { dark: "#000000", light: "#ffffff" },
          });
          svgMap.set(s.sackQrId, svg);
        })
      );

      // 2. Remove existing print iframe if any
      const existingIframe = document.getElementById("sack-qrs-print-iframe");
      if (existingIframe) existingIframe.remove();

      // 3. Create fresh hidden print iframe
      const iframe = document.createElement("iframe");
      iframe.id = "sack-qrs-print-iframe";
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

      // Group stickers into A4 pages (4 columns x 5 rows = 20 stickers per page)
      const STICKERS_PER_PAGE = 20;
      const pages: SackItem[][] = [];
      for (let i = 0; i < targetSacks.length; i += STICKERS_PER_PAGE) {
        pages.push(targetSacks.slice(i, i + STICKERS_PER_PAGE));
      }

      const pagesHtml = pages
        .map((pageSacks, pageIdx) => {
          const stickersHtml = pageSacks
            .map((s) => {
              const svg = svgMap.get(s.sackQrId) || "";
              return `
              <div class="passport-sticker">
                <div class="sticker-top">
                  <span class="govt-label">iPDS • FOODSTOCK GOVT OF INDIA</span>
                  <span class="sack-serial">SACK #${s.serialNumber}</span>
                </div>

                <div class="sticker-qr">
                  ${svg}
                </div>

                <div class="sticker-id">${s.sackQrId}</div>

                <div class="sticker-bottom">
                  <span>${batch.commodity} • 50 KG</span>
                  <span>${batch.bayLocation}</span>
                </div>
              </div>
            `;
            })
            .join("");

          return `
          <div class="print-page">
            <div class="page-meta-header">
              <span>BATCH: <strong>${batch.id}</strong> (${batch.commodity}) • BAY: <strong>${batch.bayLocation}</strong></span>
              <span>A4 SACK STICKER SHEET — PAGE ${pageIdx + 1} OF ${pages.length} (${targetSacks.length} SACKS TOTAL)</span>
            </div>
            <div class="stickers-grid">
              ${stickersHtml}
            </div>
          </div>
        `;
        })
        .join("");

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <title>Sack QRs Passport PDF - ${batch.id}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 8mm 6mm;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background: #ffffff;
                color: #000000;
              }
              .print-page {
                width: 100%;
                page-break-after: always;
                break-after: page;
                padding: 2mm 0;
              }
              .print-page:last-child {
                page-break-after: avoid;
                break-after: avoid;
              }
              .page-meta-header {
                font-size: 7pt;
                font-family: monospace;
                font-weight: 700;
                color: #475569;
                border-bottom: 0.5px solid #cbd5e1;
                padding-bottom: 1.5mm;
                margin-bottom: 2mm;
                display: flex;
                justify-content: space-between;
              }
              .stickers-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                grid-auto-rows: 50.5mm;
                gap: 3.5mm;
              }
              .passport-sticker {
                width: 100%;
                height: 50.5mm;
                border: 1px dashed #64748b;
                border-radius: 4px;
                padding: 2mm 2mm 1.5mm 2mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                text-align: center;
                background: #ffffff;
                page-break-inside: avoid;
                break-inside: avoid;
              }
              .sticker-top {
                width: 100%;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 0.5px solid #e2e8f0;
                padding-bottom: 1mm;
              }
              .govt-label {
                font-size: 5.5pt;
                font-weight: 800;
                color: #1e293b;
                text-transform: uppercase;
                letter-spacing: 0.3px;
              }
              .sack-serial {
                font-size: 7pt;
                font-weight: 900;
                font-family: monospace;
                color: #0f172a;
              }
              .sticker-qr {
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0.5mm 0;
              }
              .sticker-qr svg {
                width: 25.5mm !important;
                height: 25.5mm !important;
                display: block;
              }
              .sticker-id {
                font-size: 6.5pt;
                font-weight: 800;
                font-family: monospace;
                color: #0f172a;
                background: #f8fafc;
                padding: 0.5mm 1.5mm;
                border-radius: 2px;
                border: 0.5px solid #cbd5e1;
                max-width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .sticker-bottom {
                font-size: 5.8pt;
                font-weight: 700;
                color: #475569;
                width: 100%;
                display: flex;
                justify-content: space-between;
                border-top: 0.5px solid #e2e8f0;
                padding-top: 0.8mm;
              }
            </style>
          </head>
          <body>
            ${pagesHtml}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setIsGeneratingPrint(false);
      }, 500);
    } catch (err) {
      console.error("Print generation error:", err);
      setIsGeneratingPrint(false);
    }
  };

  if (!batch) return null;

  const ageDays = getBatchAgeDays(batch.receiptDate);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setSearchQuery("");
          setCurrentPage(1);
          setShowAllSacks(false);
        }
      }}
    >
      <Modal.Backdrop className="backdrop-blur-sm z-50 p-2 sm:p-4">
        <Modal.Container className="modal-container-fitted-wide">
          <Modal.Dialog className="modal-dialog-fitted-wide !max-w-5xl !w-full flex flex-col flex-1 max-h-[92vh] overflow-hidden bg-surface border border-border rounded-2xl shadow-2xl text-foreground">
            {/* Modal Header */}
            <Modal.Header className="border-b border-border px-5 py-4 shrink-0 bg-surface">
              <div className="flex items-center justify-between w-full pr-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Modal.Heading className="text-base sm:text-lg font-black text-foreground">
                        Batch Sack QR Management Portal
                      </Modal.Heading>
                      <Chip size="sm" color="accent" variant="soft" className="font-bold text-[10px]">
                        {totalSacks} Sacks Total
                      </Chip>
                    </div>
                    <p className="text-xs text-muted">
                      Batch <strong className="text-foreground font-mono">{batch.id}</strong> •{" "}
                      {batch.commodity} • Stack {batch.bayLocation}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    isDisabled={isGeneratingPrint}
                    onPress={() => handlePrintAllPassportPDF(allSacks)}
                    className="font-bold text-xs cursor-pointer shadow-xs"
                  >
                    <Printer className={`w-3.5 h-3.5 mr-1.5 ${isGeneratingPrint ? "animate-spin" : ""}`} />
                    {isGeneratingPrint ? "Generating PDF..." : "Print All QRs (Passport Size PDF)"}
                  </Button>
                </div>
              </div>
              <Modal.CloseTrigger />
            </Modal.Header>

            {/* Modal Body: Scrollable Content */}
            <Modal.Body className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-surface">
              {/* Batch Metadata Header Card (No batch QR code here as instructed) */}
              <div className="p-4 rounded-xl border border-border bg-background/50 shadow-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted">Batch ID</span>
                    <div className="font-mono font-black text-foreground text-sm">{batch.id}</div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted">Commodity</span>
                    <div className="font-bold text-foreground">{batch.commodity}</div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted">Stack Bay</span>
                    <div className="font-mono font-bold text-primary">{batch.bayLocation}</div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted">Received Quantity</span>
                    <div className="font-bold text-foreground">{totalQuintals} Quintals</div>
                  </div>
                  <div className="space-y-0.5 col-span-2 sm:col-span-1">
                    <span className="text-[10px] uppercase font-bold text-muted">Authorized Sacks</span>
                    <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {totalSacks} Sacks <span className="text-[10px] text-muted font-normal">(50 KG each)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* View QRs Section Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-border">
                {/* View Switcher / Tab */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveView("sack_qrs")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeView === "sack_qrs"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-background text-muted hover:text-foreground border border-border"
                    }`}
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>View Sack QRs ({totalSacks})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveView("summary")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeView === "summary"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-background text-muted hover:text-foreground border border-border"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Batch Info</span>
                  </button>
                </div>

                {/* Search / Filter and Print Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  {activeView === "sack_qrs" && (
                    <div className="relative min-w-[180px] sm:min-w-[220px]">
                      <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search Sack # (e.g. 001)..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary font-mono"
                      />
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="primary"
                    isDisabled={isGeneratingPrint}
                    onPress={() => handlePrintAllPassportPDF(filteredSacks)}
                    className="font-bold text-xs cursor-pointer shadow-xs sm:hidden"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1" />
                    Print PDF
                  </Button>
                </div>
              </div>

              {/* ─── TAB 1: SACK QRS VIEW ─── */}
              {activeView === "sack_qrs" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted px-1">
                    <span>
                      Showing {paginatedSacks.length} of {filteredSacks.length} sack stickers (Format:{" "}
                      <strong className="text-primary font-mono">BATCHID_Serialnumber</strong>)
                    </span>

                    <button
                      type="button"
                      onClick={() => setShowAllSacks(!showAllSacks)}
                      className="text-xs text-primary hover:underline cursor-pointer font-semibold"
                    >
                      {showAllSacks ? `Show Paginated (${ITEMS_PER_PAGE}/page)` : "Show All Sacks"}
                    </button>
                  </div>

                  {/* Grid of Passport-Size Sack Sticker Cards */}
                  {paginatedSacks.length === 0 ? (
                    <div className="text-center py-12 text-muted text-xs">
                      No sacks match search filter "{searchQuery}".
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {paginatedSacks.map((s) => {
                        const isCopied = copiedId === s.sackQrId;
                        return (
                          <div
                            key={s.sackQrId}
                            className="p-3 rounded-xl border border-border hover:border-primary/60 bg-surface transition-all hover:shadow-md flex flex-col items-center justify-between text-center space-y-2 group relative"
                            title={`Sack QR ID: ${s.sackQrId}`}
                          >
                            {/* Sticker Header */}
                            <div className="w-full flex items-center justify-between text-[9px] border-b border-border pb-1">
                              <span className="font-bold uppercase tracking-wider text-muted">
                                50 KG SACK
                              </span>
                              <span className="font-mono font-black text-primary">
                                #{s.serialNumber}
                              </span>
                            </div>

                            {/* Crisp SVG QR Code */}
                            <div className="p-1.5 rounded-lg bg-white border border-zinc-200 shadow-xs flex items-center justify-center">
                              <QRCodeSvg value={s.sackQrId} size={88} />
                            </div>

                            {/* Sack QR ID in BATCHID_Serialnumber format */}
                            <div className="w-full space-y-0.5">
                              <div className="font-mono text-[10px] font-black text-foreground truncate px-1.5 py-0.5 rounded bg-background border border-border">
                                {s.sackQrId}
                              </div>
                              <div className="text-[9px] text-muted truncate">
                                {batch.commodity} • {batch.bayLocation}
                              </div>
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="w-full pt-1.5 border-t border-border flex items-center justify-between gap-1">
                              <button
                                type="button"
                                onClick={() => handleCopy(s.sackQrId)}
                                className={`flex-1 py-1 px-1 rounded text-[10px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                                  isCopied
                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                    : "bg-background hover:bg-muted/20 text-foreground border border-border"
                                }`}
                                title="Copy Sack QR ID"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-muted" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePrintAllPassportPDF([s])}
                                className="p-1 rounded bg-background hover:bg-primary hover:text-primary-foreground text-muted transition-colors border border-border cursor-pointer"
                                title="Print Single Sticker"
                              >
                                <Printer className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {!showAllSacks && totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                      <span className="text-muted">
                        Page {currentPage} of {totalPages}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          isDisabled={currentPage <= 1}
                          onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="h-7 px-2 text-xs cursor-pointer"
                        >
                          Previous
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          isDisabled={currentPage >= totalPages}
                          onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="h-7 px-2 text-xs cursor-pointer"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB 2: BATCH INFO VIEW ─── */}
              {activeView === "summary" && (
                <div className="border border-border rounded-xl p-5 bg-surface space-y-4 text-xs">
                  <div className="space-y-1 border-b border-border pb-3">
                    <h4 className="font-bold text-sm text-foreground">Batch Compliance &amp; Storage Record</h4>
                    <p className="text-muted">
                      State Buffer Godown Unit-4 • Integrated Management of Public Distribution System
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between border-b border-border/60 py-1.5">
                        <span className="text-muted">Supplier Depot:</span>
                        <span className="font-semibold text-foreground truncate max-w-[220px]">
                          {batch.supplier}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-border/60 py-1.5">
                        <span className="text-muted">Receipt Date:</span>
                        <span className="font-mono text-foreground">
                          {batch.receiptDate} ({ageDays} Days in godown)
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-border/60 py-1.5">
                        <span className="text-muted">Expiry Date:</span>
                        <span className="font-mono text-foreground">{batch.expiryDate}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between border-b border-border/60 py-1.5">
                        <span className="text-muted">Current Balance:</span>
                        <span className="font-bold text-foreground">
                          {batch.remainingQty} Q ({Math.round(batch.remainingQty * 2)} Sacks remaining)
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-border/60 py-1.5">
                        <span className="text-muted">Moisture Content:</span>
                        <span className="font-mono text-foreground">{batch.moisturePct}%</span>
                      </div>
                      <div className="flex justify-between border-b border-border/60 py-1.5">
                        <span className="text-muted">FIFO Status:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{batch.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/20 text-foreground text-xs flex items-center justify-between gap-3">
                    <div>
                      <strong className="block text-primary">Passport Size Sack Stickers Ready</strong>
                      <span className="text-muted">
                        All {totalSacks} sacks are assigned serialized IDs in the format{" "}
                        <strong className="font-mono text-foreground">{batch.id}_001</strong> to{" "}
                        <strong className="font-mono text-foreground">{batch.id}_{String(totalSacks).padStart(padLength, "0")}</strong>.
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onPress={() => setActiveView("sack_qrs")}
                      className="font-bold text-xs shrink-0 cursor-pointer shadow-xs"
                    >
                      View Sack QRs
                    </Button>
                  </div>
                </div>
              )}
            </Modal.Body>

            {/* Modal Footer */}
            <Modal.Footer className="border-t border-border px-5 py-3.5 bg-surface flex items-center justify-between shrink-0">
              <div className="text-xs text-muted hidden sm:block">
                <span>Passport size: 45mm x 51mm • 20 stickers / A4 sheet</span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onPress={onClose} className="cursor-pointer text-xs">
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  isDisabled={isGeneratingPrint}
                  onPress={() => handlePrintAllPassportPDF(filteredSacks)}
                  className="font-bold text-xs cursor-pointer shadow-xs"
                >
                  <Printer className={`w-3.5 h-3.5 mr-1.5 ${isGeneratingPrint ? "animate-spin" : ""}`} />
                  {isGeneratingPrint ? "Generating PDF..." : `Print All QRs (${filteredSacks.length} Sacks)`}
                </Button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
