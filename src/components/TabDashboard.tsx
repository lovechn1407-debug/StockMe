import { useState } from "react";
import {
  Card,
  Meter,
  Chip,
  Table,
  Button,
  Alert,
  Switch,
  Modal,
} from "@heroui/react";
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  Truck,
  ArrowRight,
  Droplets,
  Calendar,
  AlertOctagon,
  X,
  Send,
  Clock,
  Thermometer,
  MapPin,
  Hash,
} from "lucide-react";
import type { Batch, DeliveryChallan, CommodityType } from "../types";
import { COMMODITIES } from "../types";
import {
  getBatchAgeDays,
  formatBayCode,
  getExpiryGapDays,
  getExpiryGapColor,
} from "../lib/db";
import { CriticalStockTransferModal } from "./CriticalStockTransferModal";
import { DashboardCharts } from "./DashboardCharts";

interface TabDashboardProps {
  batches: Batch[];
  challans: DeliveryChallan[];
  onSelectCommodityForDispatch: (commodity: CommodityType, batchId?: string) => void;
  monsoonSimActive: boolean;
  setMonsoonSimActive: (val: boolean) => void;
  onOpenCriticalTab?: () => void;
}

export function TabDashboard({
  batches,
  challans,
  onSelectCommodityForDispatch,
  monsoonSimActive,
  setMonsoonSimActive,
}: TabDashboardProps) {
  const [alertDetailBatches, setAlertDetailBatches] = useState<Batch[] | null>(null);
  const [alertDetailTitle, setAlertDetailTitle] = useState<string>("");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetBatches, setTransferTargetBatches] = useState<Batch[]>([]);

  // 1. Metric: Total Available Stock
  const totalAvailableStock = batches.reduce(
    (sum, b) => sum + (b.remainingQty || 0),
    0
  );

  // 2. Metric: FIFO Compliance Score
  const totalChallans = challans.length;
  const fifoCompliantChallans = challans.filter((c) => c.isFifoCompliant).length;
  const fifoScore =
    totalChallans > 0 ? Math.round((fifoCompliantChallans / totalChallans) * 100) : 100;

  // 3. Metric: Batches approaching expiry (<60 Days, consistent with Inward Stock)
  // Critical: < 30 days to expiry (Red)
  // Warning: 30 to 60 days to expiry (Yellow)
  const criticalExpiringBatches = batches.filter(
    (b) =>
      Number(b.remainingQty || 0) > 0 &&
      b.status !== "Depleted" &&
      getExpiryGapDays(b.expiryDate) < 30
  );

  const warningExpiringBatches = batches.filter(
    (b) =>
      Number(b.remainingQty || 0) > 0 &&
      b.status !== "Depleted" &&
      getExpiryGapDays(b.expiryDate) >= 30 &&
      getExpiryGapDays(b.expiryDate) <= 60
  );

  const urgentBatches = [...criticalExpiringBatches, ...warningExpiringBatches];

  // 4. Metric: Total FPS served
  const uniqueShopsServed = new Set(challans.map((c) => c.fpsId)).size;

  // Commodity Next-Out mapping
  const commodityRows = COMMODITIES.map((commodity) => {
    const commodityBatches = batches.filter(
      (b) => b.commodity === commodity && b.remainingQty > 0
    );
    const totalQty = commodityBatches.reduce((acc, b) => acc + b.remainingQty, 0);
    const activeBatchCount = commodityBatches.length;

    const eligibleBatches = commodityBatches
      .filter((b) => b.status === "Eligible")
      .sort((a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime());

    const oldest = eligibleBatches[0] || null;
    const oldestAge = oldest ? getBatchAgeDays(oldest.receiptDate) : 0;

    const isMoistureSensitive =
      monsoonSimActive && ["Sugar", "Salt", "Chana Dal"].includes(commodity);

    return {
      commodity,
      totalQty,
      activeBatchCount,
      oldestBatchId: oldest ? oldest.id : "None Available",
      oldestAge,
      bayLocation: oldest ? oldest.bayLocation : "—",
      isMoistureSensitive,
      hasEligible: Boolean(oldest),
      oldestBatch: oldest,
    };
  });

  const openAlertDetail = (batchList: Batch[], title: string) => {
    setAlertDetailBatches(batchList);
    setAlertDetailTitle(title);
  };

  const openTransfer = (batchList: Batch[]) => {
    setTransferTargetBatches(batchList);
    setIsTransferModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Stock */}
        <Card className="p-4 border border-border shadow-xs bg-surface flex flex-col justify-between h-[154px] !rounded-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-muted block mb-1">
                Total Available Stock
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-foreground tracking-tight">
                  {totalAvailableStock.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-muted">Qtl</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-2xs">
              <Package className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="w-full h-1.5 rounded-full bg-muted/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(8, (totalAvailableStock / 3000) * 100))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span>Across 7 commodities</span>
              <span className="font-semibold text-foreground">12 Godown Bays</span>
            </div>
          </div>
        </Card>

        {/* Card 2: FIFO Compliance Score */}
        <Card className="p-4 border border-border shadow-xs bg-surface flex flex-col justify-between h-[154px] !rounded-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-muted block mb-1">
                FIFO Compliance Score
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-foreground tracking-tight">
                  {fifoScore}%
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    fifoScore >= 80
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  }`}
                >
                  Target &gt;90%
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="w-full h-1.5 rounded-full bg-muted/20 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  fifoScore >= 80 ? "bg-emerald-500" : "bg-amber-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, fifoScore))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span>{fifoCompliantChallans} of {totalChallans} dispatches</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Strict FIFO</span>
            </div>
          </div>
        </Card>

        {/* Card 3: Expiring Stock Alert (<60d) — clickable */}
        <Card
          className="p-4 border border-border shadow-xs bg-surface flex flex-col justify-between h-[154px] !rounded-xl cursor-pointer group hover:border-amber-500/60 hover:shadow-md transition-all select-none"
          onClick={() => openAlertDetail(urgentBatches, "Expiring Stock Alert (<60 Days)")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-muted block mb-1">
                Expiring Stock Alert (&lt;60d)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-foreground tracking-tight">
                  {urgentBatches.length}
                </span>
                <span className="text-xs font-semibold text-muted">Batches</span>
                {criticalExpiringBatches.length > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30">
                    {criticalExpiringBatches.length} Critical (&lt;30d)
                  </span>
                ) : warningExpiringBatches.length > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    {warningExpiringBatches.length} Expiring Soon
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    All Safe (&gt;60d)
                  </span>
                )}
              </div>
            </div>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border shadow-2xs group-hover:scale-105 transition-transform ${
              criticalExpiringBatches.length > 0
                ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            }`}>
              {criticalExpiringBatches.length > 0 ? (
                <AlertOctagon className="w-4.5 h-4.5" />
              ) : (
                <AlertTriangle className="w-4.5 h-4.5" />
              )}
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="w-full h-1.5 rounded-full bg-muted/20 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  criticalExpiringBatches.length > 0 ? "bg-red-500" : "bg-amber-500"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(urgentBatches.length > 0 ? 8 : 0, (urgentBatches.length / Math.max(1, batches.length)) * 100)
                  )}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted truncate">
                {urgentBatches[0]
                  ? `Shortest: ${getExpiryGapDays(urgentBatches[0].expiryDate)}d to expiry`
                  : "All stock safe (>60d)"}
              </span>
              <span className="font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center">
                Details <ArrowRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </div>
        </Card>

        {/* Card 4: Total FPS Dispatches */}
        <Card className="p-4 border border-border shadow-xs bg-surface flex flex-col justify-between h-[154px] !rounded-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-muted block mb-1">
                Total FPS Dispatches
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-foreground tracking-tight">
                  {totalChallans}
                </span>
                <span className="text-xs font-semibold text-muted">Challans Issued</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-2xs">
              <Truck className="w-4.5 h-4.5" />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="w-full h-1.5 rounded-full bg-muted/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-purple-500 transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(15, (uniqueShopsServed / 6) * 100))}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span>{uniqueShopsServed} Fair Price Shops</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">100% Replenished</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── Dashboard Visual Analytics: Grain Stock Bar Chart & FIFO Compliance Line Graph ─── */}
      <DashboardCharts batches={batches} challans={challans} />

      {/* Main Section: Commodity Stock & Next-Out Summary Table */}
      <Card className="!rounded-xl">
        <Card.Header className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-4">
          <div>
            <Card.Title className="text-lg font-bold">Commodity Stock &amp; Next-Out Summary Table</Card.Title>
            <Card.Description className="text-xs text-muted">
              Smart FIFO automatically identifies the oldest eligible batch for every commodity to guarantee zero food grain rot. Stock age color reflects remaining shelf-life quarter.
            </Card.Description>
          </div>
          <div className="flex items-center gap-3">
            <Switch isSelected={monsoonSimActive} onChange={setMonsoonSimActive}>
              <Switch.Control><Switch.Thumb /></Switch.Control>
              <Switch.Content className="text-xs font-medium cursor-pointer">
                Simulate Monsoon Humidity (&gt;75% RH)
              </Switch.Content>
            </Switch>
          </div>
        </Card.Header>

        <Card.Content className="p-0">
          <Table>
            <Table.ScrollContainer>
              <Table.Content>
                <Table.Header>
                  <Table.Column isRowHeader>Commodity</Table.Column>
                  <Table.Column>Available Quantity</Table.Column>
                  <Table.Column>Active Batches</Table.Column>
                  <Table.Column>Oldest Eligible Batch</Table.Column>
                  <Table.Column>Storage Age</Table.Column>
                  <Table.Column>Bay Location</Table.Column>
                  <Table.Column>FIFO Status</Table.Column>
                  <Table.Column>Quick Action</Table.Column>
                </Table.Header>
                <Table.Body>
                  {commodityRows.map((row) => {
                    const expiryStyle = row.oldestBatch
                      ? getExpiryGapColor(row.oldestBatch.expiryDate)
                      : null;

                    return (
                      <Table.Row key={row.commodity}>
                        <Table.Cell className="font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <span>{row.commodity}</span>
                            {row.isMoistureSensitive && (
                              <Chip size="sm" color="warning" variant="secondary" className="text-[10px]">
                                Moisture Risk
                              </Chip>
                            )}
                          </div>
                        </Table.Cell>

                        <Table.Cell>
                          <span className="font-medium text-foreground">{row.totalQty.toLocaleString()} Q</span>
                        </Table.Cell>

                        <Table.Cell>
                          <span className="text-muted">
                            {row.activeBatchCount} {row.activeBatchCount === 1 ? "Batch" : "Batches"}
                          </span>
                        </Table.Cell>

                        <Table.Cell>
                          <span className="font-mono text-xs font-semibold text-primary">{row.oldestBatchId}</span>
                        </Table.Cell>

                        <Table.Cell>
                          {row.hasEligible && expiryStyle && row.oldestBatch ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold shadow-xs ${expiryStyle.bg} ${expiryStyle.text}`}
                              title={`Expiry Date: ${row.oldestBatch.expiryDate} (${expiryStyle.daysLeft} days remaining)`}
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{row.oldestAge} Days</span>
                              <span className="text-[10px] opacity-90 font-medium">({expiryStyle.daysLeft <= 0 ? "Expired" : `${expiryStyle.daysLeft}d left`})</span>
                            </span>
                          ) : (
                            <span className="text-muted text-xs">No active stock</span>
                          )}
                        </Table.Cell>

                        <Table.Cell className="whitespace-nowrap">
                          <Chip size="sm" variant="soft" color="default" className="whitespace-nowrap font-bold">
                            {formatBayCode(row.bayLocation)}
                          </Chip>
                        </Table.Cell>

                        <Table.Cell>
                          {row.hasEligible ? (
                            <Chip size="sm" color="accent" variant="soft">Next Out</Chip>
                          ) : (
                            <Chip size="sm" color="default" variant="soft">Exhausted</Chip>
                          )}
                        </Table.Cell>

                        <Table.Cell>
                          <Button
                            size="sm"
                            variant="primary"
                            isDisabled={!row.hasEligible}
                            onPress={() => onSelectCommodityForDispatch(row.commodity)}
                          >
                            Issue Stock
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </Card.Content>
      </Card>

      {/* Expiry Gap Legend matching Inward Stock */}
      <div className="flex flex-wrap items-center gap-2.5 px-1 py-1 bg-surface border border-border rounded-lg p-3">
        <span className="text-xs text-foreground font-semibold flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-primary" />
          Stock Expiry Status (Inward Standard):
        </span>
        {[
          { bg: "bg-emerald-600", text: "text-white", label: "Green: Safe (>60 Days to Expiry)" },
          { bg: "bg-amber-400", text: "text-zinc-950", label: "Yellow: Expiring Soon (30–60 Days Gap)" },
          { bg: "bg-red-600", text: "text-white", label: "Red: Critical Alert (<30 Days Gap)" },
        ].map((item) => (
          <span
            key={item.label}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-md shadow-xs ${item.bg} ${item.text}`}
          >
            {item.label}
          </span>
        ))}
      </div>

      {/* Monsoon Alert */}
      {monsoonSimActive && (
        <Alert status="warning">
          <Alert.Indicator><Droplets className="w-5 h-5 text-warning" /></Alert.Indicator>
          <Alert.Content>
            <Alert.Title className="font-bold">Monsoon Season High Humidity Protocol Activated (&gt;80% Relative Humidity)</Alert.Title>
            <Alert.Description>
              Moisture-sensitive commodities (<strong>Sugar, Salt, Chana Dal</strong>) have been automatically prioritized for immediate dispatch to Fair Price Shops to prevent caking, clump formation, and pest attraction.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* Critical Expiry Alerts (<30 Days) — clickable */}
      {criticalExpiringBatches.length > 0 && (
        <div
          className="cursor-pointer group"
          onClick={() => openAlertDetail(criticalExpiringBatches, "Critical Expiry Warning (<30 Days to Expiry)")}
        >
          <Alert status="danger" className="group-hover:shadow-md transition-shadow">
            <Alert.Indicator><AlertOctagon className="w-5 h-5 text-danger" /></Alert.Indicator>
            <Alert.Content>
              <Alert.Title className="font-bold">
                Critical Expiry Warning (&lt;30 Days to Expiry) — Click to view &amp; act
              </Alert.Title>
              <Alert.Description>
                {criticalExpiringBatches.length} batch(es) have less than 30 days of shelf life remaining and MUST be dispatched before newer stock.{" "}
                {criticalExpiringBatches.map((b) => {
                  const daysLeft = getExpiryGapDays(b.expiryDate);
                  return (
                    <span key={b.id} className="font-semibold underline ml-1">
                      {b.id} ({b.commodity}, {daysLeft <= 0 ? "Expired" : `${daysLeft} Days left`}, Bay {b.bayLocation})
                    </span>
                  );
                })}
                <span className="ml-2 text-danger font-bold">→ Click to manage</span>
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </div>
      )}

      {/* Warning Expiring Alerts (30-60 Days) — clickable */}
      {warningExpiringBatches.length > 0 && (
        <div
          className="cursor-pointer group"
          onClick={() => openAlertDetail(warningExpiringBatches, "Expiring Soon Notice (30–60 Days to Expiry)")}
        >
          <Alert status="warning" className="group-hover:shadow-md transition-shadow">
            <Alert.Indicator><AlertTriangle className="w-5 h-5 text-warning" /></Alert.Indicator>
            <Alert.Content>
              <Alert.Title className="font-bold">
                Expiring Soon Notice (30–60 Days to Expiry) — Click to view details
              </Alert.Title>
              <Alert.Description>
                {warningExpiringBatches.length} batch(es) have between 30 and 60 days to expiry. The FIFO engine has queued them for immediate allocation.{" "}
                {warningExpiringBatches.map((b) => (
                  <span key={b.id} className="font-mono text-xs bg-warning/15 px-1.5 py-0.5 rounded mx-1">
                    {b.id} ({b.commodity}, {getExpiryGapDays(b.expiryDate)}d left)
                  </span>
                ))}
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </div>
      )}

      {/* ─── Alert Detail Modal ─── */}
      {alertDetailBatches && (
        <Modal
          isOpen={Boolean(alertDetailBatches)}
          onOpenChange={(open) => { if (!open) setAlertDetailBatches(null); }}
        >
          <Modal.Backdrop>
            <Modal.Container size="lg" className="max-w-4xl">
              <Modal.Dialog>
                <Modal.Header>
                  <div className="flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5 text-danger" />
                    <Modal.Heading className="text-base font-bold">{alertDetailTitle}</Modal.Heading>
                  </div>
                  <Modal.CloseTrigger />
                </Modal.Header>

                <Modal.Body className="space-y-4">
                  <p className="text-xs text-muted">
                    The following batches require your immediate attention. Review each batch's details, expiry status, and take action.
                  </p>

                  {/* Detailed Batch Cards */}
                  <div className="space-y-3">
                    {alertDetailBatches.map((b) => {
                      const age = getBatchAgeDays(b.receiptDate);
                      const expiryStyle = getExpiryGapColor(b.expiryDate);
                      return (
                        <div
                          key={b.id}
                          className="p-4 rounded-lg border border-border bg-surface space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Batch</span>
                              <h5 className="font-mono font-bold text-sm text-primary">{b.id}</h5>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-bold px-2.5 py-1 rounded-full ${expiryStyle.bg} ${expiryStyle.text}`}
                              >
                                {expiryStyle.label} — {age} Days in Godown
                              </span>
                              <Chip
                                size="sm"
                                color={b.status === "Eligible" ? "success" : b.status === "Under Fumigation" ? "warning" : "danger"}
                                variant="soft"
                              >
                                {b.status}
                              </Chip>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-muted flex items-center gap-1 mb-0.5"><Package className="w-3 h-3" /> Commodity</span>
                              <span className="font-semibold text-foreground">{b.commodity}</span>
                            </div>
                            <div>
                              <span className="text-muted flex items-center gap-1 mb-0.5"><Hash className="w-3 h-3" /> Remaining</span>
                              <span className="font-bold text-foreground">{b.remainingQty} Q</span>
                              <span className="text-muted"> / {b.receivedQty} Q</span>
                            </div>
                            <div>
                              <span className="text-muted flex items-center gap-1 mb-0.5"><MapPin className="w-3 h-3" /> Bay Location</span>
                              <span className="font-semibold text-foreground">{b.bayLocation}</span>
                            </div>
                            <div>
                              <span className="text-muted flex items-center gap-1 mb-0.5"><Thermometer className="w-3 h-3" /> Moisture</span>
                              <span className="font-semibold text-foreground">{b.moisturePct}%</span>
                            </div>
                            <div>
                              <span className="text-muted flex items-center gap-1 mb-0.5"><Calendar className="w-3 h-3" /> Receipt Date</span>
                              <span className="font-medium text-foreground">{b.receiptDate}</span>
                            </div>
                            <div>
                              <span className="text-muted flex items-center gap-1 mb-0.5"><Clock className="w-3 h-3" /> Expiry Date</span>
                              <span className="font-medium text-foreground">{b.expiryDate}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted flex items-center gap-1 mb-0.5"><Truck className="w-3 h-3" /> Supplier</span>
                              <span className="font-medium text-foreground">{b.supplier}</span>
                            </div>
                          </div>

                          {/* Action row per batch */}
                          <div className="flex gap-2 pt-1 border-t border-border/50">
                            <Button
                              size="sm"
                              variant="primary"
                              onPress={() => {
                                setAlertDetailBatches(null);
                                onSelectCommodityForDispatch(b.commodity);
                              }}
                            >
                              <ArrowRight className="w-3.5 h-3.5 mr-1" />
                              Dispatch via FPS
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Modal.Body>

                <Modal.Footer className="flex justify-between">
                  <Button variant="secondary" onPress={() => setAlertDetailBatches(null)}>
                    Close
                  </Button>
                  {alertDetailBatches.some((b) => getExpiryGapDays(b.expiryDate) < 30) && (
                    <Button
                      variant="danger"
                      onPress={() => {
                        const critical = alertDetailBatches.filter(
                          (b) => getExpiryGapDays(b.expiryDate) < 30
                        );
                        setAlertDetailBatches(null);
                        openTransfer(critical);
                      }}
                    >
                      <Send className="w-4 h-4 mr-1.5" />
                      Transfer Critical Stock to Another Godown
                    </Button>
                  )}
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      )}

      {/* ─── Critical Transfer Modal ─── */}
      <CriticalStockTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        criticalBatches={transferTargetBatches}
      />
    </div>
  );
}
