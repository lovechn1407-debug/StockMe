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
  Eye,
  Filter,
  Building2,
  Calendar,
  Clock,
  User,
  FileText,
  Boxes,
  Layers,
  Scale,
  Truck,
  FileSpreadsheet,
} from "lucide-react";
import { useState, useMemo } from "react";
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

  // Movement Log Filters & Search
  const [movementSearchQuery, setMovementSearchQuery] = useState("");
  const [movementActionFilter, setMovementActionFilter] = useState("ALL");
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<AuditLog | null>(null);

  // FIFO Exceptions Filters & Search
  const [exceptionSearchQuery, setExceptionSearchQuery] = useState("");
  const [selectedExceptionForDetails, setSelectedExceptionForDetails] = useState<FIFOException | null>(null);

  // Recall Modal states
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const [recallReason, setRecallReason] = useState<string>(
    "Pest infestation / abnormal moisture reported by field quality lab"
  );
  const [isSubmittingRecall, setIsSubmittingRecall] = useState(false);
  const [recallSuccessMsg, setRecallSuccessMsg] = useState<string | null>(null);

  // Filter Delivery Challans containing selected batch
  const matchingChallans = useMemo(() => {
    return challans.filter((c) => {
      const hasBatch = selectedBatchId ? c.batches.some((b) => b.batchId === selectedBatchId) : true;
      const hasShop = selectedShopId === "All" ? true : c.fpsId === selectedShopId;
      return hasBatch && hasShop;
    });
  }, [challans, selectedBatchId, selectedShopId]);

  // Calculate affected shops for current selected batch
  const affectedShopIds = useMemo(() => {
    return new Set(
      challans
        .filter((c) => c.batches.some((b) => b.batchId === selectedBatchId))
        .map((c) => c.fpsId)
    );
  }, [challans, selectedBatchId]);

  const affectedShops = useMemo(() => {
    return shops.filter((s) => affectedShopIds.has(s.id));
  }, [shops, affectedShopIds]);

  // Current selected batch object
  const currentBatch = useMemo(() => {
    return batches.find((b) => b.id === selectedBatchId);
  }, [batches, selectedBatchId]);

  // Total recalled batches count
  const recalledBatchesCount = useMemo(() => {
    return batches.filter((b) => b.status === "Quality Hold").length;
  }, [batches]);

  // Execute Batch Recall
  const handleExecuteRecall = async () => {
    if (!currentBatch) return;
    setIsSubmittingRecall(true);
    try {
      await recallBatch(currentBatch.id, recallReason, affectedShops.length);
      setIsRecallModalOpen(false);
      setRecallSuccessMsg(
        `Batch ${currentBatch.id} successfully frozen on Quality Hold. Emergency alerts transmitted to ${affectedShops.length} Fair Price Shops.`
      );
      setTimeout(() => setRecallSuccessMsg(null), 8000);
    } catch (err) {
      console.error("Recall failed:", err);
    } finally {
      setIsSubmittingRecall(false);
    }
  };

  // Sort audit logs chronological descending
  const sortedLogs = useMemo(() => {
    return [...auditLogs].sort((a, b) => b.timestamp - a.timestamp);
  }, [auditLogs]);

  // Filtered audit logs based on search and action dropdown
  const filteredLogs = useMemo(() => {
    const q = movementSearchQuery.trim().toLowerCase();
    return sortedLogs.filter((log) => {
      const matchesAction =
        movementActionFilter === "ALL" || log.action === movementActionFilter;
      if (!matchesAction) return false;

      if (!q) return true;
      const desc = log.description?.toLowerCase() || "";
      const bId = log.batchId?.toLowerCase() || "";
      const perf = log.performedBy?.toLowerCase() || "";
      const action = log.action?.toLowerCase() || "";
      return desc.includes(q) || bId.includes(q) || perf.includes(q) || action.includes(q);
    });
  }, [sortedLogs, movementSearchQuery, movementActionFilter]);

  // Filtered exceptions based on search
  const filteredExceptions = useMemo(() => {
    const q = exceptionSearchQuery.trim().toLowerCase();
    if (!q) return exceptions;
    return exceptions.filter((exc) => {
      const bId = exc.batchId?.toLowerCase() || "";
      const comm = exc.commodity?.toLowerCase() || "";
      const fps = exc.fpsName?.toLowerCase() || "";
      const reason = exc.reason?.toLowerCase() || "";
      const remarks = exc.remarks?.toLowerCase() || "";
      const officer = exc.officerName?.toLowerCase() || "";
      return (
        bId.includes(q) ||
        comm.includes(q) ||
        fps.includes(q) ||
        reason.includes(q) ||
        remarks.includes(q) ||
        officer.includes(q)
      );
    });
  }, [exceptions, exceptionSearchQuery]);

  return (
    <div className="space-y-5">
      {/* ─── Compact Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Traceability &amp; Audit
            </h2>
            <Chip size="sm" variant="soft" color="default" className="text-[10px] font-bold">
              ePDS Statutory Ledger • Unit-4
            </Chip>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Batch tracking, movement history, and FIFO compliance
          </p>
        </div>

        {/* Live System Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted flex items-center gap-1.5 bg-surface border border-border px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            Live Audit Stream Active
          </span>
        </div>
      </div>

      {/* ─── Compact Summary Metrics Row ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3 border border-border bg-surface !rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted block">
                Movement Records
              </span>
              <span className="text-xl font-black text-foreground">
                {auditLogs.length}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <History className="w-4 h-4" />
            </div>
          </div>
          <span className="text-[10px] text-muted mt-1 block truncate">
            Permanent ledger transactions
          </span>
        </Card>

        <Card className="p-3 border border-border bg-surface !rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted block">
                FIFO Exceptions
              </span>
              <span className={`text-xl font-black ${exceptions.length > 0 ? "text-amber-500" : "text-foreground"}`}>
                {exceptions.length}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <span className="text-[10px] text-muted mt-1 block truncate">
            {exceptions.length > 0 ? "Statutory AGO overrides" : "Strict FIFO compliance"}
          </span>
        </Card>

        <Card className="p-3 border border-border bg-surface !rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted block">
                Quality Holds / Recalls
              </span>
              <span className={`text-xl font-black ${recalledBatchesCount > 0 ? "text-danger" : "text-foreground"}`}>
                {recalledBatchesCount}
              </span>
            </div>
            <div className={`p-2 rounded-lg ${recalledBatchesCount > 0 ? "bg-danger/10 text-danger" : "bg-muted/10 text-muted"}`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <span className="text-[10px] text-muted mt-1 block truncate">
            {recalledBatchesCount > 0 ? "Batches under emergency halt" : "Zero active quality holds"}
          </span>
        </Card>

        <Card className="p-3 border border-border bg-surface !rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted block">
                Tracked Challans
              </span>
              <span className="text-xl font-black text-foreground">
                {challans.length}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <span className="text-[10px] text-muted mt-1 block truncate">
            Downstream FPS consignments
          </span>
        </Card>
      </div>

      {/* ─── Emergency Recall Alert Banner ─── */}
      {recallSuccessMsg && (
        <Alert status="warning" className="rounded-xl border border-amber-500/30">
          <Alert.Indicator>
            <ShieldAlert className="w-5 h-5 text-amber-500" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title className="font-bold text-xs">Official Recall Executed</Alert.Title>
            <Alert.Description className="text-xs">{recallSuccessMsg}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* ─── HeroUI Sub-Views Tab Navigation ─── */}
      <Tabs
        selectedKey={selectedSubTab}
        onSelectionChange={(key) => setSelectedSubTab(key as string)}
      >
        <Tabs.List className="border-b border-border pb-1 gap-2">
          <Tabs.Tab id="traceability" className="font-semibold text-xs cursor-pointer py-1.5 px-3">
            Batch-to-FPS Traceability &amp; Recall
          </Tabs.Tab>
          <Tabs.Tab id="movement" className="font-semibold text-xs cursor-pointer py-1.5 px-3">
            Complete Movement Log ({sortedLogs.length})
          </Tabs.Tab>
          <Tabs.Tab id="exceptions" className="font-semibold text-xs cursor-pointer py-1.5 px-3">
            FIFO Override Exceptions ({exceptions.length})
          </Tabs.Tab>
        </Tabs.List>

        {/* ══════════════════════════════════════════════════════════════════════
            SUB-TAB 1: Batch-to-FPS Traceability & Recall
           ══════════════════════════════════════════════════════════════════════ */}
        <Tabs.Panel id="traceability" className="pt-4 space-y-4">
          {/* Filter Bar & Recall Trigger */}
          <Card className="p-3.5 border border-border bg-surface !rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted whitespace-nowrap">Target Batch:</span>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="text-xs font-mono font-bold bg-background border border-border rounded-lg px-2.5 py-1.5 text-primary focus:outline-none focus:border-primary"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.id} ({b.commodity} • {b.remainingQty} Q in {b.bayLocation})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted whitespace-nowrap">Consignee Shop:</span>
                  <select
                    value={selectedShopId}
                    onChange={(e) => setSelectedShopId(e.target.value)}
                    className="text-xs font-medium bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="All">All Fair Price Shops ({shops.length})</option>
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.dealerName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Compact Recall Button */}
              {currentBatch && (
                <Button
                  variant="danger"
                  size="sm"
                  onPress={() => setIsRecallModalOpen(true)}
                  className="font-bold text-xs cursor-pointer shadow-xs"
                >
                  <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
                  Freeze &amp; Recall Batch ({currentBatch.id})
                </Button>
              )}
            </div>
          </Card>

          {/* Current Batch Status Banner */}
          {currentBatch && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-3.5 rounded-xl bg-surface border border-border text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted block">Batch Commodity</span>
                <strong className="text-sm text-foreground">{currentBatch.commodity}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted block">Current Godown Balance</span>
                <strong className="text-sm text-foreground">
                  {currentBatch.remainingQty} <span className="text-xs font-normal text-muted">Quintals</span>
                </strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted block">Stack Bay</span>
                <strong className="text-sm text-primary font-mono">{currentBatch.bayLocation}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted block">Downstream FPS Reach</span>
                <strong className="text-sm text-foreground">
                  {affectedShops.length} <span className="text-xs font-normal text-muted">Fair Price Shops</span>
                </strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-muted block">Quality Status</span>
                <div className="mt-0.5">
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
                    className="font-bold text-[10px]"
                  >
                    {currentBatch.status}
                  </Chip>
                </div>
              </div>
            </div>
          )}

          {/* Matching Dispatches Table */}
          <Card className="border border-border bg-surface !rounded-xl overflow-hidden">
            <Card.Header className="p-3.5 border-b border-border flex items-center justify-between">
              <div>
                <Card.Title className="text-xs font-bold text-foreground">
                  Delivery Challans Sourced from {selectedBatchId}
                </Card.Title>
                <Card.Description className="text-[11px] text-muted">
                  Showing all consignments issued to Fair Price Shops from this specific inward batch.
                </Card.Description>
              </div>
              <span className="text-xs text-muted font-medium">
                {matchingChallans.length} Challan{matchingChallans.length === 1 ? "" : "s"} Found
              </span>
            </Card.Header>

            <Card.Content className="p-0">
              <Table>
                <Table.ScrollContainer className="overflow-x-auto">
                  <Table.Content className="min-w-[850px]">
                    <Table.Header>
                      <Table.Column isRowHeader className="whitespace-nowrap">Challan Number</Table.Column>
                      <Table.Column className="whitespace-nowrap">Issue Date</Table.Column>
                      <Table.Column className="whitespace-nowrap">Fair Price Shop</Table.Column>
                      <Table.Column className="whitespace-nowrap">License &amp; Dealer</Table.Column>
                      <Table.Column className="whitespace-nowrap text-right">Sourced from this Batch</Table.Column>
                      <Table.Column className="whitespace-nowrap text-right">Total Challan Qty</Table.Column>
                      <Table.Column className="whitespace-nowrap">FIFO Status</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {matchingChallans.length > 0 ? (
                        matchingChallans.map((challan) => {
                          const batchItem = challan.batches.find(
                            (b) => b.batchId === selectedBatchId
                          );
                          const shop = shops.find((s) => s.id === challan.fpsId);

                          return (
                            <Table.Row key={challan.id} className="hover:bg-muted/10">
                              <Table.Cell className="font-mono text-xs font-bold text-primary whitespace-nowrap">
                                {challan.challanNumber}
                              </Table.Cell>

                              <Table.Cell className="text-xs font-medium text-foreground whitespace-nowrap">
                                {challan.dispatchDate}
                              </Table.Cell>

                              <Table.Cell className="font-semibold text-xs text-foreground whitespace-nowrap">
                                {challan.fpsName}
                              </Table.Cell>

                              <Table.Cell className="text-xs text-muted whitespace-nowrap">
                                {shop ? `${shop.dealerName} (${shop.licenseNo})` : "Verified Dealer"}
                              </Table.Cell>

                              <Table.Cell className="font-bold text-xs text-primary text-right whitespace-nowrap">
                                {batchItem ? `${batchItem.dispatchedQty} Q` : "—"}
                              </Table.Cell>

                              <Table.Cell className="text-xs font-medium text-foreground text-right whitespace-nowrap">
                                {challan.totalQuantity} Q
                              </Table.Cell>

                              <Table.Cell className="whitespace-nowrap">
                                <Chip
                                  size="sm"
                                  color={challan.isFifoCompliant ? "success" : "warning"}
                                  variant="soft"
                                  className="font-bold text-[10px]"
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

        {/* ══════════════════════════════════════════════════════════════════════
            SUB-TAB 2: Complete Movement Audit Log
           ══════════════════════════════════════════════════════════════════════ */}
        <Tabs.Panel id="movement" className="pt-4 space-y-3.5">
          {/* Client-Side Search and Action Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-border">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search activity, batch ID, officer..."
                  value={movementSearchQuery}
                  onChange={(e) => setMovementSearchQuery(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted whitespace-nowrap">Filter Action:</span>
              <select
                value={movementActionFilter}
                onChange={(e) => setMovementActionFilter(e.target.value)}
                className="text-xs font-medium bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary"
              >
                <option value="ALL">All Actions ({sortedLogs.length})</option>
                <option value="DISPATCH_FIFO">FIFO Dispatches</option>
                <option value="DISPATCH_OVERRIDE">FIFO Overrides</option>
                <option value="INWARD_STOCK">Inward Stock</option>
                <option value="BATCH_RECALL">Batch Recalls</option>
                <option value="STATUS_CHANGE">Status Changes</option>
                <option value="DRIAGE_ADJUSTMENT">Driage Adjustments</option>
              </select>

              <span className="text-xs text-muted font-medium ml-1">
                Showing {filteredLogs.length} of {sortedLogs.length}
              </span>
            </div>
          </div>

          <Card className="border border-border bg-surface !rounded-xl overflow-hidden">
            <Card.Content className="p-0">
              <Table>
                <Table.ScrollContainer className="overflow-x-auto">
                  <Table.Content className="min-w-[850px]">
                    <Table.Header>
                      <Table.Column isRowHeader className="whitespace-nowrap">Timestamp</Table.Column>
                      <Table.Column className="whitespace-nowrap">Action Type</Table.Column>
                      <Table.Column className="whitespace-nowrap">Activity Summary</Table.Column>
                      <Table.Column className="whitespace-nowrap">Batch ID</Table.Column>
                      <Table.Column className="whitespace-nowrap text-right">Quantity</Table.Column>
                      <Table.Column className="whitespace-nowrap">Authorized Officer</Table.Column>
                      <Table.Column className="whitespace-nowrap w-[70px] text-center">Action</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {filteredLogs.length > 0 ? (
                        filteredLogs.map((log) => (
                          <Table.Row key={log.id} className="hover:bg-muted/10">
                            <Table.Cell className="text-xs font-mono text-muted whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString([], {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </Table.Cell>

                            <Table.Cell className="whitespace-nowrap">
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
                                className="font-bold text-[10px]"
                              >
                                {log.action.replace(/_/g, " ")}
                              </Chip>
                            </Table.Cell>

                            <Table.Cell className="text-xs font-medium text-foreground max-w-[260px] truncate">
                              <span title={log.description}>{log.description}</span>
                            </Table.Cell>

                            <Table.Cell className="font-mono text-xs font-bold text-primary whitespace-nowrap">
                              {log.batchId || "—"}
                            </Table.Cell>

                            <Table.Cell className="text-xs font-semibold text-foreground text-right whitespace-nowrap">
                              {log.quantity ? `${log.quantity} Q` : "—"}
                            </Table.Cell>

                            <Table.Cell className="text-xs text-muted whitespace-nowrap">
                              {log.performedBy}
                            </Table.Cell>

                            <Table.Cell className="whitespace-nowrap text-center">
                              <Button
                                size="sm"
                                variant="secondary"
                                onPress={() => setSelectedLogForDetails(log)}
                                className="h-6 px-2 text-[11px] font-semibold cursor-pointer"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Inspect
                              </Button>
                            </Table.Cell>
                          </Table.Row>
                        ))
                      ) : (
                        <Table.Row>
                          <Table.Cell className="text-xs text-muted">
                            No movement logs match the filter criteria.
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

        {/* ══════════════════════════════════════════════════════════════════════
            SUB-TAB 3: FIFO Override Exceptions
           ══════════════════════════════════════════════════════════════════════ */}
        <Tabs.Panel id="exceptions" className="pt-4 space-y-3.5">
          {/* Client-Side Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-border">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search exceptions by batch, FPS, officer, reason..."
                  value={exceptionSearchQuery}
                  onChange={(e) => setExceptionSearchQuery(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary font-mono"
                />
              </div>
            </div>

            <div className="text-xs text-muted font-medium">
              Showing {filteredExceptions.length} of {exceptions.length} Recorded Overrides
            </div>
          </div>

          <Card className="border border-border bg-surface !rounded-xl overflow-hidden">
            <Card.Content className="p-0">
              <Table>
                <Table.ScrollContainer className="overflow-x-auto">
                  <Table.Content className="min-w-[850px]">
                    <Table.Header>
                      <Table.Column isRowHeader className="whitespace-nowrap">Date &amp; Time</Table.Column>
                      <Table.Column className="whitespace-nowrap">Commodity &amp; Batch</Table.Column>
                      <Table.Column className="whitespace-nowrap">Consignee FPS</Table.Column>
                      <Table.Column className="whitespace-nowrap text-right">Dispatched Qty</Table.Column>
                      <Table.Column className="whitespace-nowrap">Exception Reason</Table.Column>
                      <Table.Column className="whitespace-nowrap">Officer Justification Remarks</Table.Column>
                      <Table.Column className="whitespace-nowrap">Approving Officer</Table.Column>
                      <Table.Column className="whitespace-nowrap w-[70px] text-center">Action</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {filteredExceptions.length > 0 ? (
                        filteredExceptions.map((exc) => (
                          <Table.Row key={exc.id} className="hover:bg-muted/10">
                            <Table.Cell className="text-xs font-mono text-muted whitespace-nowrap">
                              {new Date(exc.timestamp).toLocaleString([], {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </Table.Cell>

                            <Table.Cell className="text-xs font-bold text-primary whitespace-nowrap">
                              {exc.commodity} <span className="font-mono">({exc.batchId})</span>
                            </Table.Cell>

                            <Table.Cell className="text-xs font-medium text-foreground whitespace-nowrap">
                              {exc.fpsName}
                            </Table.Cell>

                            <Table.Cell className="text-xs font-bold text-foreground text-right whitespace-nowrap">
                              {exc.quantity} Q
                            </Table.Cell>

                            <Table.Cell className="whitespace-nowrap">
                              <Chip size="sm" color="warning" variant="soft" className="font-bold text-[10px]">
                                {exc.reason}
                              </Chip>
                            </Table.Cell>

                            <Table.Cell className="text-xs text-muted max-w-[200px] truncate">
                              <span title={exc.remarks}>{exc.remarks}</span>
                            </Table.Cell>

                            <Table.Cell className="text-xs font-semibold text-foreground whitespace-nowrap">
                              {exc.officerName}
                            </Table.Cell>

                            <Table.Cell className="whitespace-nowrap text-center">
                              <Button
                                size="sm"
                                variant="secondary"
                                onPress={() => setSelectedExceptionForDetails(exc)}
                                className="h-6 px-2 text-[11px] font-semibold cursor-pointer"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Details
                              </Button>
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

      {/* ══════════════════════════════════════════════════════════════════════
          EVENT DETAILS INSPECTION MODAL (Sub-Tab 2)
         ══════════════════════════════════════════════════════════════════════ */}
      {selectedLogForDetails && (
        <Modal
          isOpen={Boolean(selectedLogForDetails)}
          onOpenChange={(open) => !open && setSelectedLogForDetails(null)}
        >
          <Modal.Backdrop className="backdrop-blur-sm z-50 p-2 sm:p-4">
            <Modal.Container className="modal-container-fitted-wide">
              <Modal.Dialog className="modal-dialog-fitted-wide !max-w-2xl !w-full overflow-hidden shadow-2xl rounded-2xl bg-surface border border-border">
                <Modal.Header className="border-b border-border px-5 py-4 shrink-0 bg-surface">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <History className="w-4 h-4" />
                    </div>
                    <div>
                      <Modal.Heading className="text-base font-bold text-foreground">
                        Statutory Audit Event Record
                      </Modal.Heading>
                      <p className="text-xs text-muted">
                        Event ID: <strong className="font-mono text-foreground">{selectedLogForDetails.id}</strong>
                      </p>
                    </div>
                  </div>
                  <Modal.CloseTrigger />
                </Modal.Header>

                <Modal.Body className="p-5 space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-background border border-border">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted block">Action Type</span>
                      <div className="mt-1">
                        <Chip
                          size="sm"
                          color={
                            selectedLogForDetails.action === "DISPATCH_FIFO"
                              ? "success"
                              : selectedLogForDetails.action === "DISPATCH_OVERRIDE"
                              ? "warning"
                              : selectedLogForDetails.action === "BATCH_RECALL"
                              ? "danger"
                              : selectedLogForDetails.action === "INWARD_STOCK"
                              ? "accent"
                              : "default"
                          }
                          variant="soft"
                          className="font-bold text-[10px]"
                        >
                          {selectedLogForDetails.action.replace(/_/g, " ")}
                        </Chip>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted block">Timestamp</span>
                      <strong className="text-xs font-mono text-foreground mt-1 block">
                        {new Date(selectedLogForDetails.timestamp).toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted block">
                      Activity Description
                    </span>
                    <div className="p-3.5 rounded-xl bg-background border border-border text-foreground font-medium text-xs leading-relaxed">
                      {selectedLogForDetails.description}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg border border-border bg-background">
                      <span className="text-[10px] uppercase font-bold text-muted block">Referenced Batch</span>
                      <span className="font-mono font-bold text-primary text-xs mt-0.5 block">
                        {selectedLogForDetails.batchId || "—"}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg border border-border bg-background">
                      <span className="text-[10px] uppercase font-bold text-muted block">Quantity Involved</span>
                      <span className="font-bold text-foreground text-xs mt-0.5 block">
                        {selectedLogForDetails.quantity ? `${selectedLogForDetails.quantity} Quintals` : "—"}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg border border-border bg-background">
                      <span className="text-[10px] uppercase font-bold text-muted block">Authorized By</span>
                      <span className="font-semibold text-foreground text-xs mt-0.5 block">
                        {selectedLogForDetails.performedBy}
                      </span>
                    </div>
                  </div>
                </Modal.Body>

                <Modal.Footer className="border-t border-border px-5 py-3 bg-surface flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => setSelectedLogForDetails(null)}
                    className="cursor-pointer text-xs font-medium"
                  >
                    Done / Close
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          FIFO EXCEPTION DETAILS MODAL (Sub-Tab 3)
         ══════════════════════════════════════════════════════════════════════ */}
      {selectedExceptionForDetails && (
        <Modal
          isOpen={Boolean(selectedExceptionForDetails)}
          onOpenChange={(open) => !open && setSelectedExceptionForDetails(null)}
        >
          <Modal.Backdrop className="backdrop-blur-sm z-50 p-2 sm:p-4">
            <Modal.Container className="modal-container-fitted-wide">
              <Modal.Dialog className="modal-dialog-fitted-wide !max-w-2xl !w-full overflow-hidden shadow-2xl rounded-2xl bg-surface border border-border">
                <Modal.Header className="border-b border-border px-5 py-4 shrink-0 bg-surface">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <Modal.Heading className="text-base font-bold text-foreground">
                        FIFO Override Statutory Approval Record
                      </Modal.Heading>
                      <p className="text-xs text-muted">
                        Exception ID: <strong className="font-mono text-foreground">{selectedExceptionForDetails.id}</strong>
                      </p>
                    </div>
                  </div>
                  <Modal.CloseTrigger />
                </Modal.Header>

                <Modal.Body className="p-5 space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-background border border-border">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted block">Commodity &amp; Batch</span>
                      <strong className="text-xs text-primary font-bold mt-0.5 block">
                        {selectedExceptionForDetails.commodity} ({selectedExceptionForDetails.batchId})
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted block">Consignee Shop</span>
                      <strong className="text-xs text-foreground mt-0.5 block">
                        {selectedExceptionForDetails.fpsName}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted block">Dispatched Quantity</span>
                      <strong className="text-xs text-foreground mt-0.5 block">
                        {selectedExceptionForDetails.quantity} Quintals
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted block">
                      Statutory Exception Reason
                    </span>
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-xs">
                      {selectedExceptionForDetails.reason}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted block">
                      Officer Justification &amp; Audit Remarks
                    </span>
                    <div className="p-3.5 rounded-xl bg-background border border-border text-foreground font-medium text-xs leading-relaxed whitespace-pre-wrap">
                      {selectedExceptionForDetails.remarks}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border bg-background">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted block">Approving Officer</span>
                      <span className="font-semibold text-foreground text-xs mt-0.5 block">
                        {selectedExceptionForDetails.officerName}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted block">Approval Date &amp; Time</span>
                      <span className="font-mono text-xs text-muted mt-0.5 block">
                        {new Date(selectedExceptionForDetails.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Modal.Body>

                <Modal.Footer className="border-t border-border px-5 py-3 bg-surface flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => setSelectedExceptionForDetails(null)}
                    className="cursor-pointer text-xs font-medium"
                  >
                    Done / Close
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          EMERGENCY STATUTORY FOOD RECALL MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {currentBatch && (
        <Modal isOpen={isRecallModalOpen} onOpenChange={setIsRecallModalOpen}>
          <Modal.Backdrop className="backdrop-blur-sm z-50 p-2 sm:p-4">
            <Modal.Container className="modal-container-fitted-wide">
              <Modal.Dialog className="modal-dialog-fitted-wide !max-w-2xl !w-full overflow-hidden shadow-2xl rounded-2xl bg-surface border border-border">
                <Modal.Header className="border-b border-border px-5 py-4 shrink-0 bg-surface">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-danger/10 text-danger">
                      <ShieldAlert className="w-5 h-5 text-danger" />
                    </div>
                    <div>
                      <Modal.Heading className="text-base font-bold text-danger">
                        EMERGENCY STATUTORY FOOD RECALL
                      </Modal.Heading>
                      <p className="text-xs text-muted">
                        Statutory Action Under Essential Commodities Act &amp; NFSA
                      </p>
                    </div>
                  </div>
                  <Modal.CloseTrigger />
                </Modal.Header>

                <Modal.Body className="p-5 space-y-4 text-xs">
                  <Alert status="danger" className="rounded-xl border border-danger/30">
                    <Alert.Indicator>
                      <AlertTriangle className="w-5 h-5 text-danger" />
                    </Alert.Indicator>
                    <Alert.Content>
                      <Alert.Title className="font-bold text-xs">
                        Confirming Quality Freeze &amp; Downstream Recall
                      </Alert.Title>
                      <Alert.Description className="text-xs mt-1 leading-relaxed">
                        This action will immediately freeze remaining stock of{" "}
                        <strong>{currentBatch.id}</strong> ({currentBatch.remainingQty} Q in{" "}
                        {currentBatch.bayLocation}) under <strong>Quality Hold</strong> and transmit an
                        emergency distribution halt advisory to all affected Fair Price Shops.
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>

                  <div className="p-3.5 bg-background rounded-xl border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <strong className="text-foreground">Affected Downstream Beneficiaries:</strong>
                      <span className="font-bold text-danger">{affectedShops.length} Fair Price Shops</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1 max-h-36 overflow-y-auto pr-1">
                      {affectedShops.length > 0 ? (
                        affectedShops.map((s) => (
                          <span
                            key={s.id}
                            className="bg-surface border border-border px-2 py-0.5 rounded text-[11px] text-foreground font-medium"
                          >
                            {s.name} ({s.dealerName})
                          </span>
                        ))
                      ) : (
                        <span className="text-muted text-[11px] italic">
                          No Fair Price Shops have received dispatches from this batch yet.
                        </span>
                      )}
                    </div>
                  </div>

                  <TextField
                    value={recallReason}
                    onChange={setRecallReason}
                    isRequired
                    fullWidth
                  >
                    <Label className="text-xs font-semibold text-foreground">
                      Statutory Cause / Quality Breach Reason
                    </Label>
                    <Input
                      placeholder="e.g. Moisture level exceeded safe threshold; beetle larvae detected"
                      className="text-xs mt-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    />
                  </TextField>
                </Modal.Body>

                <Modal.Footer className="border-t border-border px-5 py-3.5 bg-surface flex justify-between">
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => setIsRecallModalOpen(false)}
                    isDisabled={isSubmittingRecall}
                    className="cursor-pointer text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onPress={handleExecuteRecall}
                    isDisabled={isSubmittingRecall}
                    className="font-bold text-xs cursor-pointer shadow-xs"
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
