import {
  Card,
  Chip,
  Meter,
  Button,
  Drawer,
  Separator,
} from "@heroui/react";
import {
  Layers,
  Calendar,
  QrCode,
  ShieldAlert,
  Scale,
  ArrowRight,
  Warehouse,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import type { Batch, CommodityType } from "../types";
import { BAY_LOCATIONS } from "../types";
import { getBatchAgeDays, formatDaysLeft, formatBayCode } from "../lib/db";
import { QRModal } from "./QRModal";
import { FumigationModal } from "./FumigationModal";
import { DriageModal } from "./DriageModal";

// Color themes for each grain / commodity
export const COMMODITY_THEMES: Record<
  CommodityType,
  {
    name: string;
    dot: string;
    bg: string;
    border: string;
    text: string;
    barColor: string;
  }
> = {
  Wheat: {
    name: "Wheat",
    dot: "#f59e0b",
    bg: "#fef3c7",
    border: "#fcd34d",
    text: "#b45309",
    barColor: "#f59e0b",
  },
  Rice: {
    name: "Rice",
    dot: "#10b981",
    bg: "#d1fae5",
    border: "#a7f3d0",
    text: "#047857",
    barColor: "#10b981",
  },
  Sugar: {
    name: "Sugar",
    dot: "#0ea5e9",
    bg: "#e0f2fe",
    border: "#bae6fd",
    text: "#0369a1",
    barColor: "#0ea5e9",
  },
  Salt: {
    name: "Salt",
    dot: "#64748b",
    bg: "#f1f5f9",
    border: "#cbd5e1",
    text: "#334155",
    barColor: "#64748b",
  },
  "Edible Oil": {
    name: "Edible Oil",
    dot: "#f97316",
    bg: "#ffedd5",
    border: "#fed7aa",
    text: "#c2410c",
    barColor: "#f97316",
  },
  "Chana Dal": {
    name: "Chana Dal",
    dot: "#eab308",
    bg: "#fef9c3",
    border: "#fef08a",
    text: "#854d0e",
    barColor: "#eab308",
  },
  "Tuvar Dal": {
    name: "Tuvar Dal",
    dot: "#f43f5e",
    bg: "#ffe4e6",
    border: "#fecdd3",
    text: "#be123c",
    barColor: "#f43f5e",
  },
};

export const getCommodityTheme = (comm: string) => {
  return (
    COMMODITY_THEMES[comm as CommodityType] || {
      name: comm,
      dot: "#6366f1",
      bg: "#e0e7ff",
      border: "#c7d2fe",
      text: "#4338ca",
      barColor: "#6366f1",
    }
  );
};

interface TabBaysProps {
  batches: Batch[];
  onSelectCommodityForDispatch: (commodity: CommodityType, batchId?: string) => void;
  onToggleStatus: (batchId: string, newStatus: Batch["status"], note: string) => Promise<void>;
  onLogDriage: (batchId: string, currentQty: number, deductQty: number, reason: string) => Promise<void>;
}

export function TabBays({
  batches,
  onSelectCommodityForDispatch,
  onToggleStatus,
  onLogDriage,
}: TabBaysProps) {
  const [selectedBay, setSelectedBay] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modal states for actions from Drawer
  const [qrBatch, setQrBatch] = useState<Batch | null>(null);
  const [fumigationBatch, setFumigationBatch] = useState<Batch | null>(null);
  const [driageBatch, setDriageBatch] = useState<Batch | null>(null);

  // Helper to match bay location string to canonical BAY_LOCATIONS
  const matchBay = (batchBay: string, canonicalBay: string): boolean => {
    if (!batchBay || !canonicalBay) return false;
    const bTrim = batchBay.trim().toLowerCase();
    const cTrim = canonicalBay.trim().toLowerCase();
    if (bTrim === cTrim) return true;

    const bClean = bTrim.replace(/[^a-z0-9]/g, "");
    const cClean = cTrim.replace(/[^a-z0-9]/g, "");
    if (bClean === cClean) return true;

    // Support "Bay 1", "Bay A1", "1" mapping to "Bay A-1"
    if (cClean === "baya1" && (bClean === "bay1" || bClean === "1" || bClean === "bay01")) {
      return true;
    }
    return false;
  };

  // Group ALL active batches by bay location (summing all batches in that bay)
  const bayMap: Record<string, Batch[]> = {};
  BAY_LOCATIONS.forEach((bay) => {
    bayMap[bay] = [];
  });

  batches.forEach((b) => {
    const rem = Number(b.remainingQty) || 0;
    if (rem > 0) {
      const canonical = BAY_LOCATIONS.find((target) => matchBay(b.bayLocation, target));
      if (canonical) {
        bayMap[canonical].push(b);
      } else {
        if (!bayMap[b.bayLocation]) {
          bayMap[b.bayLocation] = [];
        }
        bayMap[b.bayLocation].push(b);
      }
    }
  });

  // Identify next FIFO picks across commodities
  const nextFifoBatchIds = new Set<string>();
  const activeBatches = batches.filter((b) => b.status === "Eligible" && (Number(b.remainingQty) || 0) > 0);
  const groupedByCommodity: Record<string, Batch[]> = {};
  activeBatches.forEach((b) => {
    if (!groupedByCommodity[b.commodity]) groupedByCommodity[b.commodity] = [];
    groupedByCommodity[b.commodity].push(b);
  });
  Object.values(groupedByCommodity).forEach((list) => {
    list.sort((a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime());
    if (list[0]) {
      nextFifoBatchIds.add(list[0].id);
    }
  });

  const selectedBayBatches = selectedBay ? bayMap[selectedBay] || [] : [];
  const selectedBayTotalQty = selectedBayBatches.reduce(
    (sum, b) => sum + (Number(b.remainingQty) || 0),
    0
  );
  const selectedBayReceivedQty = selectedBayBatches.reduce(
    (sum, b) => sum + (Number(b.receivedQty) || 0),
    0
  );
  const selectedBayOccupancyPct = Math.min(100, Math.round((selectedBayTotalQty / 250) * 100));

  // Commodity breakdown for selected bay
  const selectedBayBreakdown = (() => {
    const map: Record<
      string,
      { commodity: CommodityType; totalQty: number; count: number; earliestExpiry: string }
    > = {};
    selectedBayBatches.forEach((b) => {
      const q = Number(b.remainingQty) || 0;
      if (!map[b.commodity]) {
        map[b.commodity] = {
          commodity: b.commodity,
          totalQty: 0,
          count: 0,
          earliestExpiry: b.expiryDate || "—",
        };
      }
      map[b.commodity].totalQty += q;
      map[b.commodity].count += 1;
      if (
        b.expiryDate &&
        (!map[b.commodity].earliestExpiry ||
          map[b.commodity].earliestExpiry === "—" ||
          b.expiryDate < map[b.commodity].earliestExpiry)
      ) {
        map[b.commodity].earliestExpiry = b.expiryDate;
      }
    });
    return Object.values(map).sort((a, b) => b.totalQty - a.totalQty);
  })();
  const selectedBayCapacityBase = Math.max(250, selectedBayTotalQty);

  const handleOpenBayDrawer = (bay: string) => {
    setSelectedBay(bay);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Physical Godown Bay Layout & Stack Map
          </h2>
          <p className="text-xs text-muted">
            12 Physical Warehouse Bays (Wing A & Wing B). Click any bay to inspect stack status, print bag QR cards, or lock under fumigation cover.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Chip size="sm" color="accent" variant="soft">
            <Sparkles className="w-3.5 h-3.5 inline mr-1 text-primary" />
            Next FIFO Pick
          </Chip>
          <Chip size="sm" color="warning" variant="soft">
            Old Stock &gt;60 Days
          </Chip>
          <Chip size="sm" color="danger" variant="soft">
            Critical &gt;90 Days
          </Chip>
        </div>
      </div>

      {/* 12 Bay Grid (3 boxes per row as requested) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {BAY_LOCATIONS.map((bay) => {
          const bayBatches = bayMap[bay] || [];
          const totalRemainingQty = bayBatches.reduce(
            (sum, b) => sum + (Number(b.remainingQty) || 0),
            0
          );
          const batchCount = bayBatches.length;
          const isEmpty = batchCount === 0 || totalRemainingQty <= 0;

          // Assumes 250 Q max capacity per bay
          const bayMaxCapacity = 250;
          const occupancyPct = Math.round((totalRemainingQty / bayMaxCapacity) * 100);
          const capacityBase = Math.max(bayMaxCapacity, totalRemainingQty);

          // Group by commodity for table breakdown & colors
          const commMap: Record<
            string,
            {
              commodity: CommodityType;
              totalQty: number;
              count: number;
              earliestExpiry: string;
            }
          > = {};
          bayBatches.forEach((b) => {
            const q = Number(b.remainingQty) || 0;
            if (!commMap[b.commodity]) {
              commMap[b.commodity] = {
                commodity: b.commodity,
                totalQty: 0,
                count: 0,
                earliestExpiry: b.expiryDate || "—",
              };
            }
            commMap[b.commodity].totalQty += q;
            commMap[b.commodity].count += 1;
            if (
              b.expiryDate &&
              (!commMap[b.commodity].earliestExpiry ||
                commMap[b.commodity].earliestExpiry === "—" ||
                b.expiryDate < commMap[b.commodity].earliestExpiry)
            ) {
              commMap[b.commodity].earliestExpiry = b.expiryDate;
            }
          });
          const commodityBreakdown = Object.values(commMap).sort((a, b) => b.totalQty - a.totalQty);

          // Oldest batch & days
          const oldestBatch =
            bayBatches.length > 0
              ? [...bayBatches].sort(
                  (a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime()
                )[0]
              : null;
          const oldestAgeDays = oldestBatch ? getBatchAgeDays(oldestBatch.receiptDate) : 0;

          // Flags
          const hasFumigation = bayBatches.some((b) => b.status === "Under Fumigation");
          const hasNextFifo = bayBatches.some((b) => nextFifoBatchIds.has(b.id));

          // Determine status chip
          let chipLabel = "Empty";
          let chipColor: "default" | "accent" | "warning" | "danger" | "success" = "default";

          if (isEmpty) {
            chipLabel = "Empty";
            chipColor = "default";
          } else if (hasFumigation) {
            chipLabel = "Fumigation Lock";
            chipColor = "warning";
          } else if (hasNextFifo) {
            chipLabel = "Next FIFO Pick";
            chipColor = "accent";
          } else if (oldestAgeDays >= 90) {
            chipLabel = "Old Stock >90 Days";
            chipColor = "danger";
          } else if (oldestAgeDays >= 60) {
            chipLabel = "Old Stock >60 Days";
            chipColor = "warning";
          } else {
            chipLabel = "Active Stock";
            chipColor = "success";
          }

          return (
            <Card
              key={bay}
              className={`p-4 cursor-pointer transition-all hover:border-primary/50 shadow-xs hover:shadow-md ${
                hasNextFifo ? "ring-2 ring-primary/40 bg-primary/5" : ""
              }`}
              onClick={() => handleOpenBayDrawer(bay)}
            >
              <Card.Header className="flex justify-between items-start pb-2">
                <div>
                  <Card.Title className="text-base font-bold text-foreground flex items-center gap-1.5">
                    <Warehouse className="w-4 h-4 text-primary" />
                    {formatBayCode(bay)}
                  </Card.Title>
                  <Card.Description className="text-xs text-muted">
                    {isEmpty
                      ? "Unallocated"
                      : batchCount === 1
                      ? bayBatches[0].id
                      : `${batchCount} Stacks (${totalRemainingQty} Q)`}
                  </Card.Description>
                </div>
                <Chip size="sm" color={chipColor} variant="soft">
                  {chipLabel}
                </Chip>
              </Card.Header>

              <Card.Content className="pt-2 space-y-3">
                {!isEmpty ? (
                  <>
                    {/* Minimal Table Structure (Clean Inter font, no font-mono, whitespace-nowrap) */}
                    <div className="w-full overflow-hidden rounded-md border border-border/80 bg-surface/50">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border/70 bg-muted/20 text-xs font-semibold text-foreground">
                            <th className="py-2 px-3 text-foreground font-semibold whitespace-nowrap">Grain</th>
                            <th className="py-2 px-3 text-foreground font-semibold text-right whitespace-nowrap">Qty</th>
                            <th className="py-2 px-3 text-foreground font-semibold text-center whitespace-nowrap">Stack</th>
                            <th className="py-2 px-3 text-foreground font-semibold text-right whitespace-nowrap">Expiry</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {commodityBreakdown.map((item) => (
                            <tr key={item.commodity} className="text-foreground hover:bg-muted/10 transition-colors">
                              <td className="py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                                {item.commodity}
                              </td>
                              <td className="py-2 px-3 font-bold text-foreground text-right whitespace-nowrap">
                                {item.totalQty} Q
                              </td>
                              <td className="py-2 px-3 text-foreground text-center text-xs whitespace-nowrap">
                                {item.count} {item.count === 1 ? "stack" : "stacks"}
                              </td>
                              <td
                                className="py-2 px-3 text-foreground text-right text-xs font-medium whitespace-nowrap"
                                title={item.earliestExpiry}
                              >
                                {formatDaysLeft(item.earliestExpiry)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Multi-Color Segmented Progress Bar */}
                    <div className="space-y-2 pt-1 border-t border-border/40">
                      <div className="flex justify-between items-center text-xs whitespace-nowrap">
                        <span className="text-muted font-medium whitespace-nowrap">Total Bay Balance:</span>
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="text-foreground text-base font-bold whitespace-nowrap">
                            {totalRemainingQty} Q
                          </span>
                          <span className="text-muted text-xs whitespace-nowrap">
                            / {bayMaxCapacity} Q
                          </span>
                          {totalRemainingQty > bayMaxCapacity && (
                            <span className="text-[10px] font-bold text-danger bg-danger/10 px-1.5 py-0.5 rounded border border-danger/30 whitespace-nowrap ml-1">
                              Over Limit
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Multi-Color Progress Track */}
                      <div
                        className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200/80 shadow-inner"
                        title={commodityBreakdown
                          .map(
                            (c) =>
                              `${c.commodity}: ${c.totalQty} Q (${Math.round(
                                (c.totalQty / totalRemainingQty) * 100
                              )}%)`
                          )
                          .join(" | ")}
                      >
                        {commodityBreakdown.map((item) => {
                          const theme = getCommodityTheme(item.commodity);
                          const widthPct = (item.totalQty / capacityBase) * 100;

                          return (
                            <div
                              key={item.commodity}
                              className="h-full relative transition-all duration-300 hover:opacity-90 border-r border-white/40 last:border-r-0"
                              style={{
                                width: `${widthPct}%`,
                                backgroundColor: theme.barColor,
                              }}
                              title={`${item.commodity}: ${item.totalQty} Q (${Math.round(
                                (item.totalQty / totalRemainingQty) * 100
                              )}%)`}
                            />
                          );
                        })}
                      </div>

                      {/* Grain and color legend below progress bar */}
                      <div className="flex justify-between items-center pt-1.5 text-xs">
                        <div className="space-y-1">
                          {commodityBreakdown.map((item) => {
                            const theme = getCommodityTheme(item.commodity);
                            const pctOfBay = Math.round((item.totalQty / totalRemainingQty) * 100);
                            return (
                              <div
                                key={item.commodity}
                                className="flex items-center gap-2 text-xs text-foreground whitespace-nowrap"
                              >
                                <span
                                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                                  style={{ backgroundColor: theme.barColor }}
                                />
                                <span className="whitespace-nowrap">
                                  {item.commodity}:{" "}
                                  <span className="font-semibold">{item.totalQty}Q</span>{" "}
                                  <span className="text-muted text-[11px]">({pctOfBay}%)</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-right font-bold text-foreground text-sm self-center whitespace-nowrap pl-3">
                          {occupancyPct}%
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-5 text-center text-xs text-muted">
                    Bay available for new inward consignment
                  </div>
                )}
              </Card.Content>
            </Card>
          );
        })}
      </div>

      {/* Native HeroUI Drawer for Bay Details */}
      <Drawer isOpen={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <Drawer.Backdrop>
          <Drawer.Content placement="right">
            <Drawer.Dialog>
              <Drawer.Header>
                <div className="flex items-center gap-2">
                  <Warehouse className="w-5 h-5 text-primary" />
                  <Drawer.Heading className="text-lg font-bold">
                    Bay {formatBayCode(selectedBay)}: Detailed Stack Inspection
                  </Drawer.Heading>
                </div>
                <Drawer.CloseTrigger />
              </Drawer.Header>

              <Drawer.Body className="space-y-5">
                {selectedBayBatches.length > 0 ? (
                  <>
                    {/* Bay Aggregate Summary Card */}
                    <div className="p-4 rounded-lg bg-surface border border-border space-y-3 text-xs">
                      <div className="flex justify-between border-b border-border/50 pb-2">
                        <span className="text-muted">Bay Location:</span>
                        <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                          <Warehouse className="w-4 h-4 text-primary" />
                          {formatBayCode(selectedBay)}
                        </span>
                      </div>

                      <div className="flex justify-between border-b border-border/50 pb-2">
                        <span className="text-muted">Total Bay Balance:</span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-bold text-foreground text-base">
                            {selectedBayTotalQty} Q
                          </span>
                          <span className="text-muted text-xs font-normal">
                            (of {selectedBayReceivedQty} Q initial)
                          </span>
                          {selectedBayTotalQty > 250 && (
                            <span className="text-[10px] font-bold text-danger bg-danger/10 px-1.5 py-0.5 rounded border border-danger/30 ml-1">
                              Over Limit
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between border-b border-border/50 pb-2">
                        <span className="text-muted">Total Stacks / Batches:</span>
                        <span className="font-bold text-primary">
                          {selectedBayBatches.length} Active {selectedBayBatches.length === 1 ? "Stack" : "Stacks"}
                        </span>
                      </div>

                      {/* Minimal Table in Drawer Summary (Black Text, Zero Colored Boxes) */}
                      <div className="space-y-1.5 border-b border-border/50 pb-2.5">
                        <span className="text-muted block text-[11px] font-semibold uppercase tracking-wider">
                          Stored Grains Breakdown:
                        </span>
                        <div className="w-full overflow-hidden rounded-md border border-border/80 bg-surface">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-border/70 bg-muted/20 text-xs font-semibold text-foreground">
                                <th className="py-2 px-3 text-foreground font-semibold whitespace-nowrap">Grain</th>
                                <th className="py-2 px-3 text-foreground font-semibold text-right whitespace-nowrap">Qty</th>
                                <th className="py-2 px-3 text-foreground font-semibold text-center whitespace-nowrap">Stack</th>
                                <th className="py-2 px-3 text-foreground font-semibold text-right whitespace-nowrap">Expiry</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {selectedBayBreakdown.map((item) => (
                                <tr key={item.commodity} className="text-foreground hover:bg-muted/10 transition-colors">
                                  <td className="py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                                    {item.commodity}
                                  </td>
                                  <td className="py-2 px-3 font-bold text-foreground text-right whitespace-nowrap">
                                    {item.totalQty} Q
                                  </td>
                                  <td className="py-2 px-3 text-foreground text-center text-xs whitespace-nowrap">
                                    {item.count} {item.count === 1 ? "stack" : "stacks"}
                                  </td>
                                  <td
                                    className="py-2 px-3 text-foreground text-right text-xs font-medium whitespace-nowrap"
                                    title={item.earliestExpiry}
                                  >
                                    {formatDaysLeft(item.earliestExpiry)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Multi-Color Progress Bar in Drawer */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted font-medium">Bay Capacity Utilization:</span>
                          <span className="font-semibold text-foreground">
                            {selectedBayOccupancyPct}% (250 Q Max)
                          </span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200/80 shadow-inner">
                          {selectedBayBreakdown.map((item) => {
                            const theme = getCommodityTheme(item.commodity);
                            const widthPct = (item.totalQty / selectedBayCapacityBase) * 100;
                            return (
                              <div
                                key={item.commodity}
                                className="h-full border-r border-white/40 last:border-r-0"
                                style={{
                                  width: `${widthPct}%`,
                                  backgroundColor: theme.barColor,
                                }}
                                title={`${item.commodity}: ${item.totalQty} Q`}
                              />
                            );
                          })}
                        </div>

                        {/* Show grain color swatches below drawer bar */}
                        <div className="flex items-center gap-2.5 flex-wrap pt-0.5 text-[11px]">
                          {selectedBayBreakdown.map((item) => {
                            const theme = getCommodityTheme(item.commodity);
                            const pct = Math.round((item.totalQty / selectedBayTotalQty) * 100);
                            return (
                              <span key={item.commodity} className="inline-flex items-center gap-1 font-medium text-foreground">
                                <span
                                  className="w-2 h-2 rounded-full inline-block"
                                  style={{ backgroundColor: theme.barColor }}
                                />
                                {item.commodity}: {item.totalQty}Q ({pct}%)
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Individual Stack Cards inside this Bay */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                        Batches Stored in Bay {formatBayCode(selectedBay)} ({selectedBayBatches.length})
                      </h4>

                      {selectedBayBatches.map((batch, idx) => {
                        const batchAge = getBatchAgeDays(batch.receiptDate);
                        const isBatchFifo = nextFifoBatchIds.has(batch.id);
                        const batchTheme = getCommodityTheme(batch.commodity);

                        return (
                          <div
                            key={batch.id}
                            className="p-4 rounded-lg bg-surface border border-border space-y-3 text-xs hover:border-primary/40 transition-colors"
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-border/50">
                              <div>
                                <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                                  Stack #{idx + 1}
                                </span>
                                <h5 className="font-mono font-bold text-sm text-primary">
                                  {batch.id}
                                </h5>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {isBatchFifo && (
                                  <Chip size="sm" color="accent" variant="soft">
                                    Next FIFO
                                  </Chip>
                                )}
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
                                >
                                  {batch.status}
                                </Chip>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted block text-[11px]">Commodity:</span>
                                <div
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border mt-0.5"
                                  style={{
                                    backgroundColor: batchTheme.bg,
                                    borderColor: batchTheme.border,
                                    color: batchTheme.text,
                                  }}
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: batchTheme.dot }}
                                  />
                                  {batch.commodity}
                                </div>
                              </div>
                              <div>
                                <span className="text-muted block text-[11px]">Remaining:</span>
                                <span className="font-bold text-foreground text-sm">
                                  {batch.remainingQty} Q{" "}
                                  <span className="text-muted text-[10px] font-normal">
                                    / {batch.receivedQty} Q
                                  </span>
                                </span>
                              </div>
                              <div>
                                <span className="text-muted block text-[11px]">Receipt Date:</span>
                                <span className="font-medium text-foreground">
                                  {batch.receiptDate} ({batchAge} Days)
                                </span>
                              </div>
                              <div>
                                <span className="text-muted block text-[11px]">Moisture:</span>
                                <span className="font-medium text-foreground">{batch.moisturePct}%</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-muted block text-[11px]">Supplier:</span>
                                <span className="font-medium text-foreground">{batch.supplier}</span>
                              </div>
                            </div>

                            {/* Batch-specific Action Buttons */}
                            <div className="pt-2 border-t border-border/50 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="primary"
                                className="flex-1"
                                onPress={() => {
                                  setIsDrawerOpen(false);
                                  onSelectCommodityForDispatch(batch.commodity, batch.id);
                                }}
                              >
                                <ArrowRight className="w-3.5 h-3.5 mr-1" />
                                Dispatch {batch.commodity}
                              </Button>

                              <Button
                                size="sm"
                                variant="secondary"
                                onPress={() => setQrBatch(batch)}
                                className="cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5 mr-1" />
                                Sack QRs
                              </Button>

                              <Button
                                size="sm"
                                variant="secondary"
                                onPress={() => setFumigationBatch(batch)}
                              >
                                <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                                Fumigate
                              </Button>

                              <Button
                                size="sm"
                                variant="secondary"
                                onPress={() => setDriageBatch(batch)}
                              >
                                <Scale className="w-3.5 h-3.5 mr-1" />
                                Driage
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-muted text-sm">
                    This bay is currently empty.
                  </div>
                )}
              </Drawer.Body>

              <Drawer.Footer>
                <Button variant="secondary" onPress={() => setIsDrawerOpen(false)}>
                  Close
                </Button>
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>

      {/* QR Stack Card Modal */}
      <QRModal
        batch={qrBatch}
        isOpen={Boolean(qrBatch)}
        onClose={() => setQrBatch(null)}
      />

      {/* Fumigation Toggle Modal */}
      <FumigationModal
        batch={fumigationBatch}
        isOpen={Boolean(fumigationBatch)}
        onClose={() => setFumigationBatch(null)}
        onToggleStatus={onToggleStatus}
      />

      {/* Spillage / Driage Modal */}
      <DriageModal
        batch={driageBatch}
        isOpen={Boolean(driageBatch)}
        onClose={() => setDriageBatch(null)}
        onSubmit={onLogDriage}
      />
    </div>
  );
}
