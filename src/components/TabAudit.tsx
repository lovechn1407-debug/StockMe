import {
  Card,
  Table,
  Button,
  Chip,
  Tabs,
  Modal,
  TextField,
  Label,
  Input,
  Alert,
} from "@heroui/react";
import {
  ShieldAlert,
  Search,
  History,
  FileCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";
import type {
  Batch,
  DeliveryChallan,
  FairPriceShop,
  FIFOException,
  AuditLog,
} from "../types";
import { recallBatch } from "../lib/db";

interface TabAuditProps {
  batches: Batch[];
  challans: DeliveryChallan[];
  shops: FairPriceShop[];
  exceptions: FIFOException[];
  auditLogs: AuditLog[];
}

export function TabAudit({
  batches,
  challans,
  shops,
  exceptions,
  auditLogs,
}: TabAuditProps) {
  const [selectedSubTab, setSelectedSubTab] = useState<string>("traceability");

  // Traceability filters
  const [selectedBatchId, setSelectedBatchId] = useState<string>(batches[0]?.id || "");
  const [selectedShopId, setSelectedShopId] = useState<string>("All");

  // Recall Modal states
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const [recallReason, setRecallReason] = useState<string>(
    "Pest infestation / abnormal moisture reported by field quality lab"
  );
  const [isSubmittingRecall, setIsSubmittingRecall] = useState(false);
  const [recallSuccessMsg, setRecallSuccessMsg] = useState<string | null>(null);

  // Filter Delivery Challans containing selected batch
  const matchingChallans = challans.filter((c) => {
    const hasBatch = selectedBatchId ? c.batches.some((b) => b.batchId === selectedBatchId) : true;
    const hasShop = selectedShopId === "All" ? true : c.fpsId === selectedShopId;
    return hasBatch && hasShop;
  });

  // Calculate affected shops for current selected batch
  const affectedShopIds = new Set(
    challans
      .filter((c) => c.batches.some((b) => b.batchId === selectedBatchId))
      .map((c) => c.fpsId)
  );
  const affectedShops = shops.filter((s) => affectedShopIds.has(s.id));

  // Current selected batch object
  const currentBatch = batches.find((b) => b.id === selectedBatchId);

  // Execute Batch Recall
  const handleExecuteRecall = async () => {
    if (!currentBatch) return;
    setIsSubmittingRecall(true);
    try {
      await recallBatch(currentBatch.id, recallReason, affectedShops.length);
      setIsRecallModalOpen(false);
      setRecallSuccessMsg(
        `Batch ${currentBatch.id} successfully frozen on Quality Hold. Emergency alerts sent to ${affectedShops.length} Fair Price Shops.`
      );
      setTimeout(() => setRecallSuccessMsg(null), 8000);
    } catch (err) {
      console.error("Recall failed:", err);
    } finally {
      setIsSubmittingRecall(false);
    }
  };

  // Sort audit logs chronological descending
  const sortedLogs = [...auditLogs].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-foreground">
          Traceability, Emergency Batch Recall & Movement Audit
        </h2>
        <p className="text-xs text-muted">
          End-to-end supply chain accountability. Map any batch to every downstream Fair Price Shop, initiate official food recalls, and review the tamper-evident ledger.
        </p>
      </div>

      {recallSuccessMsg && (
        <Alert status="warning">
          <Alert.Indicator>
            <ShieldAlert className="w-5 h-5 text-warning" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title className="font-bold">Official Recall Issued</Alert.Title>
            <Alert.Description>{recallSuccessMsg}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* HeroUI Tabs for Sub-views */}
      <Tabs
        selectedKey={selectedSubTab}
        onSelectionChange={(key) => setSelectedSubTab(key as string)}
      >
        <Tabs.List className="border-b border-border pb-2">
          <Tabs.Tab id="traceability" className="font-semibold text-xs">
            Batch-to-FPS Traceability & Recall
          </Tabs.Tab>
          <Tabs.Tab id="movement" className="font-semibold text-xs">
            Complete Movement Log ({sortedLogs.length})
          </Tabs.Tab>
          <Tabs.Tab id="exceptions" className="font-semibold text-xs">
            FIFO Override Exceptions ({exceptions.length})
          </Tabs.Tab>
        </Tabs.List>

        {/* SUB-TAB 1: Batch-to-FPS Traceability */}
        <Tabs.Panel id="traceability" className="pt-4 space-y-5">
          {/* Filter Bar & Recall Trigger */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted block">
                    Select Target Batch ID:
                  </span>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="text-xs font-mono font-bold bg-surface border border-border rounded px-3 py-1.5 text-primary focus:outline-none"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.id} ({b.commodity} • {b.remainingQty} Q remaining)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted block">
                    Filter Consignee Shop:
                  </span>
                  <select
                    value={selectedShopId}
                    onChange={(e) => setSelectedShopId(e.target.value)}
                    className="text-xs font-medium bg-surface border border-border rounded px-3 py-1.5 text-foreground focus:outline-none"
                  >
                    <option value="All">All Fair Price Shops</option>
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recall Button */}
              {currentBatch && (
                <Button
                  variant="danger"
                  size="sm"
                  onPress={() => setIsRecallModalOpen(true)}
                  className="font-bold"
                >
                  <ShieldAlert className="w-4 h-4 mr-1.5" />
                  Freeze & Recall Batch ({currentBatch.id})
                </Button>
              )}
            </div>
          </Card>

          {/* Current Batch Status Banner */}
          {currentBatch && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-lg bg-surface border border-border text-xs">
              <div>
                <span className="text-muted block">Batch Commodity:</span>
                <strong className="text-sm text-foreground">{currentBatch.commodity}</strong>
              </div>
              <div>
                <span className="text-muted block">Current Godown Balance:</span>
                <strong className="text-sm text-foreground">{currentBatch.remainingQty} Quintals</strong>
              </div>
              <div>
                <span className="text-muted block">Stack Location:</span>
                <strong className="text-sm text-primary">{currentBatch.bayLocation}</strong>
              </div>
              <div>
                <span className="text-muted block">Quality Status:</span>
                <Chip
                  size="sm"
                  color={
                    currentBatch.status === "Eligible"
                      ? "success"
                      : currentBatch.status === "Quality Hold"
                      ? "danger"
                      : "warning"
                  }
                  variant="soft"
                >
                  {currentBatch.status}
                </Chip>
              </div>
            </div>
          )}

          {/* Matching Dispatches Table */}
          <Card>
            <Card.Header className="p-4 border-b border-border">
              <Card.Title className="text-sm font-bold">
                Delivery Challans Sourced from {selectedBatchId}
              </Card.Title>
              <Card.Description className="text-xs text-muted">
                Showing all consignments issued to Fair Price Shops from this specific inward batch.
              </Card.Description>
            </Card.Header>

            <Card.Content className="p-0">
              <Table>
                <Table.ScrollContainer>
                  <Table.Content>
                    <Table.Header>
                      <Table.Column isRowHeader>Challan Number</Table.Column>
                      <Table.Column>Issue Date</Table.Column>
                      <Table.Column>Fair Price Shop</Table.Column>
                      <Table.Column>License & Dealer</Table.Column>
                      <Table.Column>Sourced from this Batch</Table.Column>
                      <Table.Column>Total Challan Qty</Table.Column>
                      <Table.Column>FIFO Status</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {matchingChallans.length > 0 ? (
                        matchingChallans.map((challan) => {
                          const batchItem = challan.batches.find(
                            (b) => b.batchId === selectedBatchId
                          );
                          const shop = shops.find((s) => s.id === challan.fpsId);

                          return (
                            <Table.Row key={challan.id}>
                              <Table.Cell className="font-mono text-xs font-bold text-primary">
                                {challan.challanNumber}
                              </Table.Cell>

                              <Table.Cell className="text-xs font-medium text-foreground">
                                {challan.dispatchDate}
                              </Table.Cell>

                              <Table.Cell className="font-semibold text-xs text-foreground">
                                {challan.fpsName}
                              </Table.Cell>

                              <Table.Cell className="text-xs text-muted">
                                {shop ? `${shop.dealerName} (${shop.licenseNo})` : "Verified Dealer"}
                              </Table.Cell>

                              <Table.Cell className="font-bold text-xs text-primary">
                                {batchItem ? `${batchItem.dispatchedQty} Q` : "—"}
                              </Table.Cell>

                              <Table.Cell className="text-xs font-medium text-foreground">
                                {challan.totalQuantity} Q
                              </Table.Cell>

                              <Table.Cell>
                                <Chip
                                  size="sm"
                                  color={challan.isFifoCompliant ? "success" : "warning"}
                                  variant="soft"
                                >
                                  {challan.isFifoCompliant ? "FIFO Compliant" : "Override"}
                                </Chip>
                              </Table.Cell>
                            </Table.Row>
                          );
                        })
                      ) : (
                        <Table.Row>
                          <Table.Cell className="text-xs text-muted">
                            No dispatches recorded for this batch yet.
                          </Table.Cell>
                          <Table.Cell>—</Table.Cell>
                          <Table.Cell>—</Table.Cell>
                          <Table.Cell>—</Table.Cell>
                          <Table.Cell>—</Table.Cell>
                          <Table.Cell>—</Table.Cell>
                          <Table.Cell>—</Table.Cell>
                        </Table.Row>
                      )}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </Card.Content>
          </Card>
        </Tabs.Panel>

        {/* SUB-TAB 2: Complete Movement Audit Log */}
        <Tabs.Panel id="movement" className="pt-4 space-y-4">
          <Card>
            <Card.Header className="p-4 border-b border-border">
              <Card.Title className="text-sm font-bold">
                Chronological Supply Chain Audit Log
              </Card.Title>
              <Card.Description className="text-xs text-muted">
                Permanent ledger of inward receipts, FIFO splits, override approvals, and driage weight adjustments.
              </Card.Description>
            </Card.Header>

            <Card.Content className="p-0">
              <Table>
                <Table.ScrollContainer>
                  <Table.Content>
                    <Table.Header>
                      <Table.Column isRowHeader>Timestamp</Table.Column>
                      <Table.Column>Action Type</Table.Column>
                      <Table.Column>Activity Description</Table.Column>
                      <Table.Column>Batch ID</Table.Column>
                      <Table.Column>Quantity</Table.Column>
                      <Table.Column>Authorized Officer</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {sortedLogs.map((log) => (
                        <Table.Row key={log.id}>
                          <Table.Cell className="text-xs font-mono text-muted">
                            {new Date(log.timestamp).toLocaleString()}
                          </Table.Cell>

                          <Table.Cell>
                            <Chip
                              size="sm"
                              color={
                                log.action === "DISPATCH_FIFO"
                                  ? "success"
                                  : log.action === "DISPATCH_OVERRIDE"
                                  ? "warning"
                                  : log.action === "BATCH_RECALL"
                                  ? "danger"
                                  : log.action === "INWARD_STOCK"
                                  ? "accent"
                                  : "default"
                              }
                              variant="soft"
                            >
                              {log.action.replace("_", " ")}
                            </Chip>
                          </Table.Cell>

                          <Table.Cell className="text-xs font-medium text-foreground max-w-[320px]">
                            {log.description}
                          </Table.Cell>

                          <Table.Cell className="font-mono text-xs font-bold text-primary">
                            {log.batchId || "—"}
                          </Table.Cell>

                          <Table.Cell className="text-xs font-semibold text-foreground">
                            {log.quantity ? `${log.quantity} Q` : "—"}
                          </Table.Cell>

                          <Table.Cell className="text-xs text-muted">
                            {log.performedBy}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </Card.Content>
          </Card>
        </Tabs.Panel>

        {/* SUB-TAB 3: FIFO Override Exceptions */}
        <Tabs.Panel id="exceptions" className="pt-4 space-y-4">
          <Card>
            <Card.Header className="p-4 border-b border-border">
              <Card.Title className="text-sm font-bold">
                Recorded FIFO Override Exceptions
              </Card.Title>
              <Card.Description className="text-xs text-muted">
                Statutory register of non-FIFO dispatches authorized by Assistant Godown Officers.
              </Card.Description>
            </Card.Header>

            <Card.Content className="p-0">
              <Table>
                <Table.ScrollContainer>
                  <Table.Content>
                    <Table.Header>
                      <Table.Column isRowHeader>Date & Time</Table.Column>
                      <Table.Column>Commodity & Batch</Table.Column>
                      <Table.Column>Consignee FPS</Table.Column>
                      <Table.Column>Dispatched Qty</Table.Column>
                      <Table.Column>Exception Reason</Table.Column>
                      <Table.Column>Officer Justification Remarks</Table.Column>
                      <Table.Column>Approving Officer</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {exceptions.length > 0 ? (
                        exceptions.map((exc) => (
                          <Table.Row key={exc.id}>
                            <Table.Cell className="text-xs font-mono text-muted">
                              {new Date(exc.timestamp).toLocaleDateString()}
                            </Table.Cell>

                            <Table.Cell className="text-xs font-bold text-primary">
                              {exc.commodity} ({exc.batchId})
                            </Table.Cell>

                            <Table.Cell className="text-xs font-medium text-foreground">
                              {exc.fpsName}
                            </Table.Cell>

                            <Table.Cell className="text-xs font-bold text-foreground">
                              {exc.quantity} Q
                            </Table.Cell>

                            <Table.Cell>
                              <Chip size="sm" color="warning" variant="soft">
                                {exc.reason}
                              </Chip>
                            </Table.Cell>

                            <Table.Cell className="text-xs text-muted max-w-[280px]">
                              {exc.remarks}
                            </Table.Cell>

                            <Table.Cell className="text-xs font-semibold text-foreground">
                              {exc.officerName}
                            </Table.Cell>
                          </Table.Row>
                        ))
                      ) : (
                        <Table.Row>
                          <Table.Cell className="text-xs text-muted">
                            No FIFO override exceptions recorded. All dispatches strictly compliant.
                          </Table.Cell>
                          <Table.Cell>—</Table.Cell>
                          <Table.Cell>—</Table.Cell>
                          <Table.Cell>—</Table.Cell>
                          <Table.Cell>—</Table.Cell>
                          <Table.Cell>—</Table.Cell>
                          <Table.Cell>—</Table.Cell>
                        </Table.Row>
                      )}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </Card.Content>
          </Card>
        </Tabs.Panel>
      </Tabs>

      {/* Freeze & Recall Confirmation Modal */}
      {currentBatch && (
        <Modal isOpen={isRecallModalOpen} onOpenChange={setIsRecallModalOpen}>
          <Modal.Backdrop>
            <Modal.Container size="lg">
              <Modal.Dialog>
                <Modal.Header>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-danger" />
                    <Modal.Heading className="text-base font-bold text-danger">
                      EMERGENCY STATUTORY FOOD RECALL
                    </Modal.Heading>
                  </div>
                  <Modal.CloseTrigger />
                </Modal.Header>

                <Modal.Body className="space-y-4">
                  <Alert status="danger">
                    <Alert.Indicator>
                      <AlertTriangle className="w-5 h-5 text-danger" />
                    </Alert.Indicator>
                    <Alert.Content>
                      <Alert.Title className="font-bold">
                        Confirming Quality Freeze & Downstream Recall
                      </Alert.Title>
                      <Alert.Description>
                        This will immediately freeze remaining stock of <strong>{currentBatch.id}</strong> ({currentBatch.remainingQty} Q in {currentBatch.bayLocation}) under Quality Hold and transmit an emergency distribution halt advisory to all affected Fair Price Shops.
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>

                  <div className="p-3 bg-muted/10 rounded-lg text-xs space-y-2">
                    <div>
                      <strong>Affected Downstream Shops:</strong> {affectedShops.length} Fair Price Shops
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {affectedShops.map((s) => (
                        <span key={s.id} className="bg-surface border border-border px-2 py-0.5 rounded text-[11px]">
                          {s.name} ({s.dealerName})
                        </span>
                      ))}
                    </div>
                  </div>

                  <TextField
                    value={recallReason}
                    onChange={setRecallReason}
                    isRequired
                    fullWidth
                  >
                    <Label>Statutory Cause / Quality Breach Reason</Label>
                    <Input placeholder="e.g. Moisture level exceeded safe threshold; beetle larvae detected" />
                  </TextField>
                </Modal.Body>

                <Modal.Footer className="flex justify-between">
                  <Button
                    variant="secondary"
                    onPress={() => setIsRecallModalOpen(false)}
                    isDisabled={isSubmittingRecall}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onPress={handleExecuteRecall}
                    isDisabled={isSubmittingRecall}
                  >
                    {isSubmittingRecall ? "Transmitting Recall..." : "Confirm & Execute Recall"}
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      )}
    </div>
  );
}
