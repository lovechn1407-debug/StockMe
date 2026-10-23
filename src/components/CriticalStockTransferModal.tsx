import { useState } from "react";
import { Modal, Button, Chip, Separator, Table } from "@heroui/react";
import {
  Send,
  Printer,
  Warehouse,
  AlertOctagon,
  CheckCircle2,
  PackageOpen,
} from "lucide-react";
import type { Batch, CommodityType } from "../types";
import { getBatchAgeDays, getExpiryGapColor, getExpiryGapDays } from "../lib/db";
import { QRCodeSvg } from "./QRCodeSvg";
import { ref, set, update, get } from "firebase/database";
import { db } from "../lib/firebase";

const ROOT_PATH = "foodstock_ipds";

const DESTINATION_GODOWNS = [
  { id: "GDN-EAST-2", name: "State Buffer Godown Unit-2 (East)", district: "East Delhi", demandScore: "Very High" },
  { id: "GDN-NORTH-3", name: "State Buffer Godown Unit-3 (North)", district: "North Delhi", demandScore: "High" },
  { id: "GDN-SOUTH-5", name: "State Buffer Godown Unit-5 (South)", district: "South Delhi", demandScore: "High" },
  { id: "GDN-WEST-6", name: "State Buffer Godown Unit-6 (West)", district: "West Delhi", demandScore: "Medium" },
  { id: "GDN-CENTRAL-7", name: "State Buffer Godown Unit-7 (Central)", district: "Central Delhi", demandScore: "Medium" },
];

export interface TransferChallan {
  id: string;
  challanNumber: string;
  fromGodown: string;
  toGodownId: string;
  toGodownName: string;
  commodity: CommodityType;
  batches: { batchId: string; bayLocation: string; quantity: number; ageDays: number }[];
  totalQuantity: number;
  transferDate: string;
  reason: string;
  issuedBy: string;
  createdAt: number;
}

interface CriticalStockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  criticalBatches: Batch[];
  onTransferComplete?: (challan: TransferChallan) => void;
}

export function CriticalStockTransferModal({
  isOpen,
  onClose,
  criticalBatches,
  onTransferComplete,
}: CriticalStockTransferModalProps) {
  const [step, setStep] = useState<"select" | "confirm" | "challan">("select");
  const [selectedGodownId, setSelectedGodownId] = useState<string>("");
  const [transferQty, setTransferQty] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedChallan, setIssuedChallan] = useState<TransferChallan | null>(null);

  const selectedGodown = DESTINATION_GODOWNS.find((g) => g.id === selectedGodownId);

  const totalTransfer = criticalBatches.reduce(
    (sum, b) => sum + (transferQty[b.id] ?? b.remainingQty),
    0
  );

  const getQty = (b: Batch) => (transferQty[b.id] !== undefined ? transferQty[b.id] : b.remainingQty);

  const handleConfirmTransfer = async () => {
    if (!selectedGodown || totalTransfer <= 0) return;
    setIsSubmitting(true);
    try {
      const now = Date.now();
      const challanId = `TC-${now}`;
      const challanNumber = `TRCHL-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;

      const batchItems = criticalBatches
        .filter((b) => getQty(b) > 0)
        .map((b) => ({
          batchId: b.id,
          bayLocation: b.bayLocation,
          quantity: getQty(b),
          ageDays: getBatchAgeDays(b.receiptDate),
        }));

      const challan: TransferChallan = {
        id: challanId,
        challanNumber,
        fromGodown: "State Buffer Godown Unit-4",
        toGodownId: selectedGodown.id,
        toGodownName: selectedGodown.name,
        commodity: criticalBatches[0]?.commodity || "Wheat",
        batches: batchItems,
        totalQuantity: batchItems.reduce((s, i) => s + i.quantity, 0),
        transferDate: new Date().toISOString().split("T")[0],
        reason: "Critical Age Stock (>90 Days) — Priority Inter-Godown Transfer",
        issuedBy: "Assistant Godown Officer (AGO)",
        createdAt: now,
      };

      const updates: Record<string, any> = {};

      for (const item of batchItems) {
        const batchSnap = await get(ref(db, `${ROOT_PATH}/batches/${item.batchId}`));
        if (batchSnap.exists()) {
          const batch = batchSnap.val() as Batch;
          const newQty = Math.max(0, batch.remainingQty - item.quantity);
          updates[`${ROOT_PATH}/batches/${item.batchId}/remainingQty`] = newQty;
          if (newQty === 0) updates[`${ROOT_PATH}/batches/${item.batchId}/status`] = "Depleted";
        }
      }

      const logId = `LOG-${now}`;
      updates[`${ROOT_PATH}/auditLogs/${logId}`] = {
        id: logId,
        action: "DISPATCH_FIFO",
        description: `CRITICAL TRANSFER: ${challan.totalQuantity} Q of ${challan.commodity} transferred to ${selectedGodown.name} via ${challanNumber}. Batches: ${batchItems.map((b) => b.batchId).join(", ")}. Reason: Critical aged stock (>90 days) priority reallocation.`,
        commodity: challan.commodity,
        quantity: challan.totalQuantity,
        performedBy: "AGO — Critical Stock Transfer System",
        timestamp: now,
      };

      updates[`${ROOT_PATH}/challans/${challanId}`] = {
        id: challanId,
        challanNumber,
        fpsId: selectedGodown.id,
        fpsName: selectedGodown.name,
        commodity: challan.commodity,
        totalQuantity: challan.totalQuantity,
        dispatchDate: challan.transferDate,
        isFifoCompliant: true,
        batches: batchItems.map((item) => ({
          batchId: item.batchId,
          bayLocation: item.bayLocation,
          dispatchedQty: item.quantity,
          batchAgeDays: item.ageDays,
        })),
        vehicleNumber: "Official iPDS Critical Transfer",
        driverName: "Authorized Transporter",
        createdAt: now,
      };

      await update(ref(db), updates);

      setIssuedChallan(challan);
      setStep("challan");
      onTransferComplete?.(challan);
    } catch (err) {
      console.error("Transfer failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep("select");
    setSelectedGodownId("");
    setTransferQty({});
    setIssuedChallan(null);
    onClose();
  };

  const qrData = issuedChallan
    ? JSON.stringify({
        type: "CRITICAL_TRANSFER",
        challan: issuedChallan.challanNumber,
        from: "Godown Unit-4",
        to: issuedChallan.toGodownName,
        qty: issuedChallan.totalQuantity,
        date: issuedChallan.transferDate,
      })
    : "";

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg" className="max-w-4xl">
          <Modal.Dialog>
            <Modal.Header>
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-danger" />
                <Modal.Heading className="text-base font-bold text-danger">
                  {step === "challan"
                    ? "Inter-Godown Transfer Challan Issued"
                    : "Critical Stock — Inter-Godown Transfer"}
                </Modal.Heading>
              </div>
              <Modal.CloseTrigger />
            </Modal.Header>

            <Modal.Body className="space-y-4">
              {/* ─── STEP 1: SELECT DESTINATION & QTY ─── */}
              {step === "select" && (
                <>
                  <div className="p-3 bg-danger/5 border border-danger/20 rounded-lg text-xs text-danger font-medium flex items-start gap-2">
                    <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>The following batches have critical expiry status (&lt;30 days remaining). Select a destination godown with high demand to initiate an emergency stock transfer.</span>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold uppercase text-muted mb-2 tracking-wide">
                      Critical Batches ({criticalBatches.length})
                    </h5>
                    <Table>
                      <Table.ScrollContainer>
                        <Table.Content>
                          <Table.Header>
                            <Table.Column isRowHeader>Batch ID</Table.Column>
                            <Table.Column>Commodity</Table.Column>
                            <Table.Column>Bay</Table.Column>
                            <Table.Column>Expiry Gap</Table.Column>
                            <Table.Column>Available</Table.Column>
                            <Table.Column>Transfer Qty (Q)</Table.Column>
                          </Table.Header>
                          <Table.Body>
                            {criticalBatches.map((batch) => {
                              const expiryStyle = getExpiryGapColor(batch.expiryDate);
                              return (
                                <Table.Row key={batch.id}>
                                  <Table.Cell className="font-mono text-xs font-bold text-primary">{batch.id}</Table.Cell>
                                  <Table.Cell className="text-xs font-semibold">{batch.commodity}</Table.Cell>
                                  <Table.Cell><Chip size="sm" variant="soft" color="default">{batch.bayLocation}</Chip></Table.Cell>
                                  <Table.Cell>
                                    <Chip size="sm" color={expiryStyle.color} variant="soft" className="font-semibold">
                                      {expiryStyle.daysLeft <= 0 ? "Expired" : `${expiryStyle.daysLeft}d left`}
                                    </Chip>
                                  </Table.Cell>
                                  <Table.Cell className="text-xs font-medium">{batch.remainingQty} Q</Table.Cell>
                                  <Table.Cell>
                                    <input
                                      type="number"
                                      min={0}
                                      max={batch.remainingQty}
                                      value={getQty(batch)}
                                      onChange={(e) =>
                                        setTransferQty((prev) => ({
                                          ...prev,
                                          [batch.id]: Math.min(batch.remainingQty, Math.max(0, Number(e.target.value))),
                                        }))
                                      }
                                      className="w-20 text-xs border border-border rounded px-2 py-1 bg-surface text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                  </Table.Cell>
                                </Table.Row>
                              );
                            })}
                          </Table.Body>
                        </Table.Content>
                      </Table.ScrollContainer>
                    </Table>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold uppercase text-muted mb-2 tracking-wide">
                      Select Destination Godown
                    </h5>
                    <div className="space-y-2">
                      {DESTINATION_GODOWNS.map((godown) => (
                        <label
                          key={godown.id}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedGodownId === godown.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="godown"
                              value={godown.id}
                              checked={selectedGodownId === godown.id}
                              onChange={() => setSelectedGodownId(godown.id)}
                              className="accent-primary"
                            />
                            <div>
                              <div className="text-xs font-bold text-foreground">{godown.name}</div>
                              <div className="text-[11px] text-muted">{godown.district}</div>
                            </div>
                          </div>
                          <Chip
                            size="sm"
                            color={godown.demandScore === "Very High" ? "danger" : godown.demandScore === "High" ? "warning" : "default"}
                            variant="soft"
                          >
                            Demand: {godown.demandScore}
                          </Chip>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ─── STEP 2: CONFIRM ─── */}
              {step === "confirm" && selectedGodown && (
                <div className="space-y-4">
                  <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 text-warning font-bold text-sm">
                      <AlertOctagon className="w-4 h-4" />
                      Confirm Inter-Godown Transfer
                    </div>
                    <div className="text-xs text-foreground space-y-1.5">
                      <div className="flex gap-2"><span className="text-muted w-28">From:</span><strong>State Buffer Godown Unit-4</strong></div>
                      <div className="flex gap-2"><span className="text-muted w-28">To:</span><strong>{selectedGodown.name}</strong></div>
                      <div className="flex gap-2"><span className="text-muted w-28">Total Qty:</span><strong className="text-primary text-base">{totalTransfer} Quintals</strong></div>
                      <div className="flex gap-2"><span className="text-muted w-28">Batches:</span>{criticalBatches.filter((b) => getQty(b) > 0).map((b) => b.id).join(", ")}</div>
                      <div className="flex gap-2"><span className="text-muted w-28">Reason:</span>Critical Age Stock (&gt;90 Days) — Priority Inter-Godown Reallocation</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted">
                    This action will reduce remaining stock in the affected batches, generate an official transfer challan, create a QR gate pass, and record everything in the iPDS audit trail.
                  </p>
                </div>
              )}

              {/* ─── STEP 3: ISSUED CHALLAN ─── */}
              {step === "challan" && issuedChallan && (
                <div className="border border-border rounded-lg p-5 bg-surface space-y-4">
                  <div className="text-center border-b border-border pb-3 space-y-1">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-muted">Government of India • Ministry of Consumer Affairs, Food &amp; Public Distribution</p>
                    <h3 className="text-base font-extrabold text-foreground">INTER-GODOWN CRITICAL STOCK TRANSFER CHALLAN</h3>
                    <p className="text-xs font-semibold text-danger">FORM PDS-IGT-07 • Emergency Stock Reallocation Gate Pass</p>
                    <p className="text-[11px] text-muted">State Buffer Godown Unit-4 → {issuedChallan.toGodownName}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="space-y-1 p-3 bg-muted/10 rounded-lg">
                      <div className="text-muted">Challan Number:</div>
                      <div className="font-mono font-bold text-primary text-sm">{issuedChallan.challanNumber}</div>
                      <div className="text-muted mt-1">Date:</div>
                      <div className="font-semibold text-foreground">{issuedChallan.transferDate}</div>
                    </div>
                    <div className="space-y-1 p-3 bg-muted/10 rounded-lg">
                      <div className="text-muted">From:</div>
                      <div className="font-bold text-foreground">{issuedChallan.fromGodown}</div>
                      <div className="text-muted mt-1">To:</div>
                      <div className="font-bold text-foreground">{issuedChallan.toGodownName}</div>
                    </div>
                    <div className="space-y-1 p-3 bg-danger/5 border border-danger/20 rounded-lg">
                      <div className="text-muted">Reason:</div>
                      <div className="font-semibold text-danger text-[11px]">{issuedChallan.reason}</div>
                      <div className="text-muted mt-1">Issued By:</div>
                      <div className="font-semibold text-foreground">{issuedChallan.issuedBy}</div>
                    </div>
                  </div>

                  <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                    <thead className="bg-muted/10">
                      <tr>
                        <th className="py-2 px-3 text-left font-semibold text-foreground">Batch ID</th>
                        <th className="py-2 px-3 text-left font-semibold text-foreground">Bay</th>
                        <th className="py-2 px-3 text-right font-semibold text-foreground">Age</th>
                        <th className="py-2 px-3 text-right font-semibold text-foreground">Qty Transferred</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {issuedChallan.batches.map((item) => (
                        <tr key={item.batchId} className="hover:bg-muted/5">
                          <td className="py-2 px-3 font-mono font-bold text-primary">{item.batchId}</td>
                          <td className="py-2 px-3 text-foreground">{item.bayLocation}</td>
                          <td className="py-2 px-3 text-right text-danger font-semibold">{item.ageDays} Days</td>
                          <td className="py-2 px-3 text-right font-bold text-foreground">{item.quantity} Q</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span className="text-xs font-bold text-success">Transfer Authorized &amp; Logged in Audit Trail</span>
                      </div>
                      <div className="text-xs text-muted">Total Transferred:</div>
                      <div className="text-2xl font-black text-foreground">
                        {issuedChallan.totalQuantity}{" "}
                        <span className="text-sm font-normal text-muted">Quintals</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <QRCodeSvg value={qrData} size={100} />
                      <div className="text-[11px] text-muted space-y-1">
                        <div className="font-bold text-foreground">Gate Pass QR</div>
                        <div>Scan at Exit Gate</div>
                        <Chip size="sm" color="danger" variant="soft">Critical Transfer</Chip>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-3 gap-4 text-center text-xs text-muted">
                    <div className="border-t border-border pt-1">Dispatch Officer (AGO)</div>
                    <div className="border-t border-border pt-1">Receiving Godown Officer</div>
                    <div className="border-t border-border pt-1">Authorizing Inspector</div>
                  </div>
                </div>
              )}
            </Modal.Body>

            <Modal.Footer className="flex justify-between">
              {step === "select" && (
                <>
                  <Button variant="secondary" onPress={handleClose}>Cancel</Button>
                  <Button variant="danger" isDisabled={!selectedGodownId || totalTransfer <= 0} onPress={() => setStep("confirm")}>
                    <PackageOpen className="w-4 h-4 mr-1.5" />
                    Proceed to Confirm
                  </Button>
                </>
              )}
              {step === "confirm" && (
                <>
                  <Button variant="secondary" onPress={() => setStep("select")}>← Back</Button>
                  <Button variant="danger" onPress={handleConfirmTransfer} isDisabled={isSubmitting}>
                    <Send className="w-4 h-4 mr-1.5" />
                    {isSubmitting ? "Processing Transfer…" : "Confirm & Issue Transfer Challan"}
                  </Button>
                </>
              )}
              {step === "challan" && (
                <>
                  <Button variant="secondary" onPress={handleClose}>Done / Close</Button>
                  <Button variant="primary" onPress={() => window.print()}>
                    <Printer className="w-4 h-4 mr-1.5" />
                    Print Transfer Challan
                  </Button>
                </>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
