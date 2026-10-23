import { useState } from "react";
import {
  Card,
  Table,
  Button,
  Chip,
  Alert,
} from "@heroui/react";
import {
  AlertOctagon,
  Send,
  ArrowRight,
  Warehouse,
  Calendar,
  Clock,
  Thermometer,
  ShieldAlert,
  TrendingUp,
  MapPin,
  Package,
  Layers,
  FileText,
} from "lucide-react";
import type { Batch, CommodityType } from "../types";
import {
  getBatchAgeDays,
  formatDaysLeft,
  formatBayCode,
  getExpiryGapDays,
  getExpiryGapColor,
} from "../lib/db";
import { CriticalStockTransferModal } from "./CriticalStockTransferModal";

interface TabCriticalStockProps {
  batches: Batch[];
  onSelectCommodityForDispatch: (commodity: CommodityType, batchId?: string) => void;
}

export function TabCriticalStock({
  batches,
  onSelectCommodityForDispatch,
}: TabCriticalStockProps) {
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedBatchesForTransfer, setSelectedBatchesForTransfer] = useState<Batch[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<"critical" | "all_aged">("critical");

  // Filter batches based on Inward Stock expiry gap calculation:
  // Critical: < 30 days to expiry (Red)
  // Expiring Soon (Warning): 30 to 60 days to expiry (Yellow)
  const criticalBatches = batches.filter((b) => {
    if (Number(b.remainingQty || 0) <= 0 || b.status === "Depleted") return false;
    const daysLeft = getExpiryGapDays(b.expiryDate);
    return daysLeft < 30;
  });

  const warningBatches = batches.filter((b) => {
    if (Number(b.remainingQty || 0) <= 0 || b.status === "Depleted") return false;
    const daysLeft = getExpiryGapDays(b.expiryDate);
    return daysLeft >= 30 && daysLeft <= 60;
  });

  const displayedBatches =
    filterSeverity === "critical"
      ? criticalBatches
      : [...criticalBatches, ...warningBatches];

  const totalCriticalQty = criticalBatches.reduce(
    (acc, b) => acc + (b.remainingQty || 0),
    0
  );

  const lowestCriticalDays = criticalBatches.reduce((min, b) => {
    const d = getExpiryGapDays(b.expiryDate);
    return d < min ? d : min;
  }, 9999);

  const handleOpenTransferModal = (targetList: Batch[]) => {
    setSelectedBatchesForTransfer(targetList.length > 0 ? targetList : criticalBatches);
    setIsTransferModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* ─── Top Header & Summary Banner ─── */}
      <div className="p-6 rounded-xl border border-danger/30 bg-gradient-to-r from-danger/10 via-danger/5 to-surface flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-danger text-white shadow-sm">
              <AlertOctagon className="w-6 h-6 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Critical Stock &amp; Inter-Godown Reallocation
                </h2>
                <Chip size="sm" color="danger" variant="primary" className="font-bold text-xs">
                  {criticalBatches.length} Urgent Batches
                </Chip>
              </div>
              <p className="text-xs text-muted">
                PDS Buffer Monitoring: Foodgrain batches approaching expiry (&lt;30 days critical urgency, 30–60 days expiring soon).
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="danger"
            size="md"
            className="font-bold shadow-md hover:scale-102 transition-transform"
            isDisabled={criticalBatches.length === 0}
            onPress={() => handleOpenTransferModal(criticalBatches)}
          >
            <Send className="w-4 h-4 mr-2" />
            Transfer Critical Stock to High-Demand Godown
          </Button>
        </div>
      </div>

      {/* ─── Metric KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Critical Batches */}
        <Card className="p-4 border-l-4 border-l-danger border-border">
          <Card.Header className="flex justify-between items-start pb-2">
            <div>
              <Card.Description className="text-xs uppercase font-semibold text-muted">
                Critical Batches
              </Card.Description>
              <Card.Title className="text-2xl font-bold text-danger mt-1">
                {criticalBatches.length}{" "}
                <span className="text-sm font-normal text-muted">Batches</span>
              </Card.Title>
            </div>
            <div className="p-2 rounded-lg bg-danger/15 text-danger">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </Card.Header>
          <Card.Content className="pt-0">
            <p className="text-xs text-muted">
              {criticalBatches.length > 0
                ? "Immediate reallocation or dispatch required"
                : "All batches currently safe within shelf-life"}
            </p>
          </Card.Content>
        </Card>

        {/* Total Critical Volume */}
        <Card className="p-4 border-border">
          <Card.Header className="flex justify-between items-start pb-2">
            <div>
              <Card.Description className="text-xs uppercase font-semibold text-muted">
                Critical Volume
              </Card.Description>
              <Card.Title className="text-2xl font-bold text-foreground mt-1 font-mono">
                {totalCriticalQty.toLocaleString()}{" "}
                <span className="text-sm font-normal text-muted">Quintals</span>
              </Card.Title>
            </div>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Package className="w-5 h-5" />
            </div>
          </Card.Header>
          <Card.Content className="pt-0">
            <p className="text-xs text-muted">
              Valued buffer grains at heightened risk of driage/spoilage
            </p>
          </Card.Content>
        </Card>

        {/* Urgent Expiry Countdown */}
        <Card className="p-4 border-border">
          <Card.Header className="flex justify-between items-start pb-2">
            <div>
              <Card.Description className="text-xs uppercase font-semibold text-muted">
                Shortest Expiry Gap
              </Card.Description>
              <Card.Title className="text-2xl font-bold text-danger mt-1">
                {criticalBatches.length > 0 && lowestCriticalDays < 9000
                  ? `${lowestCriticalDays} Days Left`
                  : "Safe (>60d)"}
              </Card.Title>
            </div>
            <div className="p-2 rounded-lg bg-danger/15 text-danger">
              <Clock className="w-5 h-5" />
            </div>
          </Card.Header>
          <Card.Content className="pt-0">
            <p className="text-xs text-muted">
              {criticalBatches.length > 0
                ? "Urgent: batch requires immediate redistribution"
                : "No batches within 30 days of statutory expiry"}
            </p>
          </Card.Content>
        </Card>

        {/* Destination Centers Available */}
        <Card className="p-4 border-border">
          <Card.Header className="flex justify-between items-start pb-2">
            <div>
              <Card.Description className="text-xs uppercase font-semibold text-muted">
                High-Demand Godowns
              </Card.Description>
              <Card.Title className="text-2xl font-bold text-foreground mt-1 flex items-center gap-2">
                5 <span className="text-sm font-normal text-muted">Units Ready</span>
              </Card.Title>
            </div>
            <div className="p-2 rounded-lg bg-success/15 text-success">
              <TrendingUp className="w-5 h-5" />
            </div>
          </Card.Header>
          <Card.Content className="pt-0">
            <p className="text-xs text-muted">
              Ready to receive stock with high off-take demand
            </p>
          </Card.Content>
        </Card>
      </div>

      {/* ─── Destination Godown Demand Intelligence ─── */}
      <Card className="border-border">
        <Card.Header className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-primary" />
              State Buffer Network — High Demand Transfer Destinations
            </h3>
            <p className="text-xs text-muted">
              Select one of these state godowns during transfer to route aging stock where public distribution consumption is fastest.
            </p>
          </div>
          <span className="text-xs text-muted font-mono bg-muted/20 px-2 py-1 rounded">
            Source: State Buffer Godown Unit-4
          </span>
        </Card.Header>
        <Card.Content className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { id: "GDN-EAST-2", name: "Unit-2 (East)", district: "East Delhi", demand: "Very High", offTake: "3.2x Faster", deficit: "420 Q Deficit" },
              { id: "GDN-NORTH-3", name: "Unit-3 (North)", district: "North Delhi", demand: "High", offTake: "2.5x Faster", deficit: "310 Q Deficit" },
              { id: "GDN-SOUTH-5", name: "Unit-5 (South)", district: "South Delhi", demand: "High", offTake: "2.1x Faster", deficit: "280 Q Deficit" },
              { id: "GDN-WEST-6", name: "Unit-6 (West)", district: "West Delhi", demand: "Medium", offTake: "1.5x Faster", deficit: "150 Q Deficit" },
              { id: "GDN-CENTRAL-7", name: "Unit-7 (Central)", district: "Central Delhi", demand: "Medium", offTake: "1.2x Faster", deficit: "110 Q Deficit" },
            ].map((g) => (
              <div
                key={g.id}
                className="p-3 rounded-lg border border-border bg-surface hover:border-primary/50 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-foreground">{g.name}</span>
                  <Chip
                    size="sm"
                    color={g.demand === "Very High" ? "danger" : g.demand === "High" ? "warning" : "default"}
                    variant="soft"
                    className="text-[10px] font-bold"
                  >
                    {g.demand}
                  </Chip>
                </div>
                <div className="text-[11px] text-muted flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {g.district}
                </div>
                <div className="text-[11px] font-medium text-primary">
                  {g.deficit} • {g.offTake}
                </div>
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>

      {/* ─── Detailed Critical Stock Table ─── */}
      <Card className="border-border">
        <Card.Header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-danger" />
              Critical Stock Inventory Records
            </h3>
            <p className="text-xs text-muted">
              Complete batch traceability records. Take action to transfer stock or dispatch locally.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={filterSeverity === "critical" ? "danger" : "secondary"}
              onPress={() => setFilterSeverity("critical")}
              className="text-xs font-semibold"
            >
              Critical Only &lt;30d ({criticalBatches.length})
            </Button>
            <Button
              size="sm"
              variant={filterSeverity === "all_aged" ? "primary" : "secondary"}
              onPress={() => setFilterSeverity("all_aged")}
              className="text-xs font-semibold"
            >
              All Expiring &lt;60d ({criticalBatches.length + warningBatches.length})
            </Button>
          </div>
        </Card.Header>

        <Card.Content className="p-0">
          {displayedBatches.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-success/10 text-success mx-auto flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-foreground">No Critical Expiring Stock Detected</h4>
              <p className="text-xs text-muted max-w-md mx-auto">
                All foodgrain batches currently stored in State Buffer Godown Unit-4 have healthy expiry buffers (&gt;60 days remaining).
              </p>
            </div>
          ) : (
            <Table>
              <Table.ScrollContainer>
                <Table.Content>
                  <Table.Header>
                    <Table.Column isRowHeader>BATCH &amp; COMMODITY</Table.Column>
                    <Table.Column>BAY</Table.Column>
                    <Table.Column>STOCK AGE</Table.Column>
                    <Table.Column>LIFESPAN &amp; EXPIRY</Table.Column>
                    <Table.Column>AVAILABLE / RECEIVED</Table.Column>
                    <Table.Column>MOISTURE</Table.Column>
                    <Table.Column>STATUS</Table.Column>
                    <Table.Column>ACTIONS</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {displayedBatches.map((batch) => {
                      const ageDays = getBatchAgeDays(batch.receiptDate);
                      const expiryStyle = getExpiryGapColor(batch.expiryDate);
                      const daysLeft = formatDaysLeft(batch.expiryDate);

                      return (
                        <Table.Row key={batch.id}>
                          {/* Batch ID & Commodity */}
                          <Table.Cell>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-primary">
                                   {batch.id}
                                </span>
                                <span className="font-semibold text-xs text-foreground">
                                  {batch.commodity}
                                </span>
                              </div>
                              <div className="text-[11px] text-muted truncate max-w-[200px]" title={batch.supplier}>
                                {batch.supplier}
                              </div>
                            </div>
                          </Table.Cell>

                          {/* Bay */}
                          <Table.Cell>
                            <Chip size="sm" variant="soft" color="default" className="font-bold">
                              {formatBayCode(batch.bayLocation)}
                            </Chip>
                          </Table.Cell>

                          {/* Dynamic Stock Age Badge (matching Inward Stock) */}
                          <Table.Cell>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold shadow-xs ${expiryStyle.bg} ${expiryStyle.text}`}
                              title={`Expiry Date: ${batch.expiryDate} (${expiryStyle.daysLeft} days remaining)`}
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{ageDays} Days</span>
                              <span className="text-[10px] opacity-90 font-medium">({expiryStyle.daysLeft <= 0 ? "Expired" : `${expiryStyle.daysLeft}d left`})</span>
                            </span>
                          </Table.Cell>

                          {/* Lifespan & Expiry */}
                          <Table.Cell>
                            <div className="space-y-1 min-w-[140px]">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-muted flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {daysLeft}
                                </span>
                                <span className={`font-bold font-mono text-[10px] ${expiryStyle.daysLeft < 30 ? "text-danger" : "text-warning"}`}>
                                  {expiryStyle.daysLeft < 30 ? "Critical (<30d)" : "Expiring Soon"}
                                </span>
                              </div>
                              <div className="w-full bg-muted/20 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${expiryStyle.bg}`}
                                  style={{ width: `${Math.min(100, Math.max(10, ((60 - expiryStyle.daysLeft) / 60) * 100))}%` }}
                                />
                              </div>
                              <div className="text-[10px] text-muted">
                                Exp: {batch.expiryDate}
                              </div>
                            </div>
                          </Table.Cell>

                          {/* Available / Received */}
                          <Table.Cell>
                            <div className="font-mono text-xs">
                              <span className="font-bold text-foreground">
                                {batch.remainingQty} Q
                              </span>
                              <span className="text-muted"> / {batch.receivedQty} Q</span>
                            </div>
                          </Table.Cell>

                          {/* Moisture Content */}
                          <Table.Cell>
                            <div className="flex items-center gap-1 text-xs">
                              <Thermometer className="w-3.5 h-3.5 text-muted" />
                              <span
                                className={
                                  batch.moisturePct > 12.5
                                    ? "text-danger font-bold"
                                    : "text-foreground font-medium"
                                }
                              >
                                {batch.moisturePct}%
                              </span>
                            </div>
                          </Table.Cell>

                          {/* Status */}
                          <Table.Cell>
                            <Chip
                              size="sm"
                              color={
                                batch.status === "Eligible"
                                  ? "success"
                                  : batch.status === "Under Fumigation"
                                  ? "warning"
                                  : "danger"
                              }
                              variant="soft"
                              className="text-[10px] font-bold"
                            >
                              {batch.status}
                            </Chip>
                          </Table.Cell>

                          {/* Actions */}
                          <Table.Cell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="danger"
                                className="font-bold text-xs"
                                onPress={() => handleOpenTransferModal([batch])}
                              >
                                <Send className="w-3.5 h-3.5 mr-1" />
                                Transfer
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="text-xs"
                                onPress={() => onSelectCommodityForDispatch(batch.commodity, batch.id)}
                              >
                                Dispatch
                                <ArrowRight className="w-3.5 h-3.5 ml-1" />
                              </Button>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )}
        </Card.Content>
      </Card>

      {/* ─── Critical Stock Transfer Modal ─── */}
      <CriticalStockTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        criticalBatches={selectedBatchesForTransfer}
      />
    </div>
  );
}
