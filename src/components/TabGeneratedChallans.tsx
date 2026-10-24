import { useState, useMemo } from "react";
import {
  Card,
  Table,
  Button,
  Chip,
  Input,
  Modal,
} from "@heroui/react";
import {
  FileCheck2,
  Printer,
  QrCode,
  Search,
  Truck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Scan,
  Filter,
  ShieldCheck,
  Package,
} from "lucide-react";
import type { DeliveryChallan, CommodityType } from "../types";
import { COMMODITIES } from "../types";
import { updateChallanGateExit } from "../lib/db";
import { ChallanModal } from "./ChallanModal";

interface TabGeneratedChallansProps {
  challans: DeliveryChallan[];
  onOpenScanner?: () => void;
}

export function TabGeneratedChallans({
  challans,
  onOpenScanner,
}: TabGeneratedChallansProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCommodity, setSelectedCommodity] = useState<string>("ALL");
  const [selectedCompliance, setSelectedCompliance] = useState<"ALL" | "FIFO" | "EXCEPTION">("ALL");
  const [selectedGateStatus, setSelectedGateStatus] = useState<"ALL" | "PENDING" | "CLEARED">("ALL");

  // Selected Challan for Full Official View / Print Modal
  const [selectedChallanForPrint, setSelectedChallanForPrint] = useState<DeliveryChallan | null>(null);

  // Filtered Challans
  const filteredChallans = useMemo(() => {
    return challans
      .filter((c) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchNo = c.challanNumber.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
          const matchFps = c.fpsName.toLowerCase().includes(q) || c.fpsId.toLowerCase().includes(q);
          const matchVehicle = (c.vehicleNumber || "").toLowerCase().includes(q);
          const matchDriver = (c.driverName || "").toLowerCase().includes(q);
          const matchCommodity = c.commodity.toLowerCase().includes(q);
          const cQrId = (c.qrId || `QR-${c.challanNumber.replace(/\D/g, "")}`).toLowerCase();
          const matchQr = cQrId.includes(q);
          if (!matchNo && !matchFps && !matchVehicle && !matchDriver && !matchCommodity && !matchQr) {
            return false;
          }
        }

        // Commodity
        if (selectedCommodity !== "ALL" && c.commodity !== selectedCommodity) {
          return false;
        }

        // Compliance
        if (selectedCompliance === "FIFO" && !c.isFifoCompliant) return false;
        if (selectedCompliance === "EXCEPTION" && c.isFifoCompliant) return false;

        // Gate Status
        const isCleared = c.gateStatus === "CLEARED_EXIT";
        if (selectedGateStatus === "CLEARED" && !isCleared) return false;
        if (selectedGateStatus === "PENDING" && isCleared) return false;

        return true;
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [challans, searchQuery, selectedCommodity, selectedCompliance, selectedGateStatus]);

  // Summary Metrics
  const totalWeight = challans.reduce((sum, c) => sum + (c.totalQuantity || 0), 0);
  const fifoCompliantCount = challans.filter((c) => c.isFifoCompliant).length;
  const fifoRate = challans.length > 0 ? Math.round((fifoCompliantCount / challans.length) * 100) : 100;
  const clearedGateCount = challans.filter((c) => c.gateStatus === "CLEARED_EXIT").length;

  const handleMarkGateClear = async (challan: DeliveryChallan) => {
    try {
      await updateChallanGateExit(challan.id, "Assistant Gate Incharge");
    } catch (err) {
      console.error("Gate exit update error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Top Header & Scanner Shortcut ─── */}
      <div className="p-6 rounded-xl border border-border bg-gradient-to-r from-primary/10 via-primary/5 to-surface flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-sm">
              <FileCheck2 className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Generated Delivery Challans &amp; Gate Passes
                </h2>
                <Chip size="sm" color="accent" variant="soft" className="font-bold text-xs">
                  {challans.length} Challans Issued
                </Chip>
              </div>
              <p className="text-xs text-muted">
                Statutory central register for all ePDS grain dispatches, FPS allocations, vehicle consignments, and gate security exit permits.
              </p>
            </div>
          </div>
        </div>

        {onOpenScanner && (
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              className="font-bold shadow-md hover:scale-102 transition-transform cursor-pointer"
              onPress={onOpenScanner}
            >
              <Scan className="w-4 h-4 mr-2" />
              Open Gate Pass Scanner (/scan)
            </Button>
          </div>
        )}
      </div>

      {/* ─── KPI Metric Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Challans */}
        <Card className="p-4 border border-border bg-surface !rounded-xl">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-muted block mb-1">
                Total Challans Issued
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">{challans.length}</span>
                <span className="text-xs font-semibold text-muted">Dispatches</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-muted pt-2 border-t border-border/50 mt-3">
            Permanent tamper-evident dispatch ledger
          </p>
        </Card>

        {/* Metric 2: Total Dispatched Grain Volume */}
        <Card className="p-4 border border-border bg-surface !rounded-xl">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-muted block mb-1">
                Total Volume Dispatched
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">{totalWeight.toLocaleString()}</span>
                <span className="text-xs font-semibold text-muted">Quintals</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-muted pt-2 border-t border-border/50 mt-3">
            ≈ {Math.round(totalWeight * 2).toLocaleString()} Standard 50kg Bags
          </p>
        </Card>

        {/* Metric 3: FIFO Compliance */}
        <Card className="p-4 border border-border bg-surface !rounded-xl">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-muted block mb-1">
                FIFO Compliance Score
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">{fifoRate}%</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  Target &gt;90%
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-muted pt-2 border-t border-border/50 mt-3">
            {fifoCompliantCount} of {challans.length} compliant with zero food rot rule
          </p>
        </Card>

        {/* Metric 4: Gate Pass Clearances */}
        <Card className="p-4 border border-border bg-surface !rounded-xl">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase font-bold tracking-wider text-muted block mb-1">
                Exit Gate Clearance
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {clearedGateCount} / {challans.length}
                </span>
                <span className="text-xs font-semibold text-muted">Cleared</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-[#087F8C]/10 text-[#087F8C] border border-[#087F8C]/20">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-muted pt-2 border-t border-border/50 mt-3">
            {challans.length - clearedGateCount} Challans currently in exit transit
          </p>
        </Card>
      </div>

      {/* ─── Search & Filters Bar ─── */}
      <Card className="p-4 border border-border bg-surface !rounded-xl space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="md:col-span-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search Challan #, FPS, Vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-xs font-medium text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Commodity Dropdown */}
          <div>
            <select
              value={selectedCommodity}
              onChange={(e) => setSelectedCommodity(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Commodities (7 Types)</option>
              {COMMODITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* FIFO Compliance Filter */}
          <div>
            <select
              value={selectedCompliance}
              onChange={(e) => setSelectedCompliance(e.target.value as any)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Compliance Modes</option>
              <option value="FIFO">Strict FIFO Multi-Batch Only</option>
              <option value="EXCEPTION">Approved Override Exceptions Only</option>
            </select>
          </div>

          {/* Gate Status Filter */}
          <div>
            <select
              value={selectedGateStatus}
              onChange={(e) => setSelectedGateStatus(e.target.value as any)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Gate Clearance Statuses</option>
              <option value="PENDING">Pending Exit Gate (Active)</option>
              <option value="CLEARED">Cleared at Exit Gate</option>
            </select>
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(searchQuery || selectedCommodity !== "ALL" || selectedCompliance !== "ALL" || selectedGateStatus !== "ALL") && (
          <div className="flex items-center gap-2 pt-2 border-t border-border/50 text-xs">
            <span className="text-muted font-medium">Filtering {filteredChallans.length} of {challans.length} challans</span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCommodity("ALL");
                setSelectedCompliance("ALL");
                setSelectedGateStatus("ALL");
              }}
              className="text-xs text-primary font-semibold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </Card>

      {/* ─── Main Challans Inventory Table ─── */}
      <Card className="border border-border bg-surface !rounded-xl overflow-hidden shadow-xs">
        <Table>
          <Table.ScrollContainer>
            <Table.Content>
              <Table.Header>
                <Table.Column isRowHeader>CHALLAN &amp; DATE</Table.Column>
                <Table.Column>CONSIGNEE FAIR PRICE SHOP</Table.Column>
                <Table.Column>COMMODITY &amp; WEIGHT</Table.Column>
                <Table.Column>VEHICLE &amp; DRIVER</Table.Column>
                <Table.Column>FIFO STATUS</Table.Column>
                <Table.Column>GATE SECURITY STATUS</Table.Column>
                <Table.Column>ACTIONS</Table.Column>
              </Table.Header>
              <Table.Body>
                {filteredChallans.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={7} className="text-center py-12">
                      <div className="space-y-2">
                        <FileCheck2 className="w-8 h-8 text-muted mx-auto opacity-50" />
                        <div className="font-bold text-sm text-foreground">No Delivery Challans Found</div>
                        <p className="text-xs text-muted">
                          No generated dispatches match your search or filter selection.
                        </p>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  filteredChallans.map((challan) => {
                    const isCleared = challan.gateStatus === "CLEARED_EXIT";
                    const totalBags = Math.round(challan.totalQuantity * 2);

                    return (
                      <Table.Row key={challan.id} className="hover:bg-muted/10 transition-colors">
                        {/* Challan Number & Date */}
                        <Table.Cell>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setSelectedChallanForPrint(challan)}
                                className="font-mono text-xs font-bold text-primary hover:underline cursor-pointer text-left block"
                              >
                                {challan.challanNumber}
                              </button>
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                {challan.qrId || `QR-${challan.challanNumber.replace(/\D/g, "") || "1001"}`}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-muted" />
                              <span>{challan.dispatchDate}</span>
                            </div>
                          </div>
                        </Table.Cell>

                        {/* Consignee Fair Price Shop */}
                        <Table.Cell>
                          <div className="max-w-[200px]">
                            <div className="text-xs font-semibold text-foreground truncate" title={challan.fpsName}>
                              {challan.fpsName}
                            </div>
                            <span className="text-[11px] text-muted font-mono">Code: {challan.fpsId}</span>
                          </div>
                        </Table.Cell>

                        {/* Commodity & Weight */}
                        <Table.Cell>
                          <div>
                            <span className="font-bold text-xs text-foreground block">{challan.commodity}</span>
                            <div className="text-[11px] text-muted">
                              <strong className="text-foreground">{challan.totalQuantity} Q</strong> ({totalBags} Bags)
                            </div>
                          </div>
                        </Table.Cell>

                        {/* Vehicle & Driver */}
                        <Table.Cell>
                          <div>
                            <span className="font-mono text-xs font-bold text-foreground block">
                              {challan.vehicleNumber || "DL-1LM-4402"}
                            </span>
                            <span className="text-[11px] text-muted truncate max-w-[140px] block" title={challan.driverName}>
                              {challan.driverName || "Mohan Lal"}
                            </span>
                          </div>
                        </Table.Cell>

                        {/* FIFO Compliance */}
                        <Table.Cell>
                          <Chip
                            size="sm"
                            color={challan.isFifoCompliant ? "success" : "warning"}
                            variant="soft"
                            className="font-bold text-[10px]"
                          >
                            {challan.isFifoCompliant ? "Strict FIFO" : "Override Approved"}
                          </Chip>
                        </Table.Cell>

                        {/* Gate Security Status */}
                        <Table.Cell>
                          <div>
                            {isCleared ? (
                              <Chip size="sm" color="success" variant="soft" className="font-bold text-[10px]">
                                <CheckCircle2 className="w-3 h-3 inline mr-1" />
                                Gate Cleared
                              </Chip>
                            ) : (
                              <Chip size="sm" color="warning" variant="soft" className="font-bold text-[10px]">
                                <Clock className="w-3 h-3 inline mr-1" />
                                Pending Exit
                              </Chip>
                            )}
                            <div className="text-[10px] text-muted flex items-center gap-1 mt-1">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  challan.loadingStatus === "LOADED"
                                    ? "bg-emerald-500"
                                    : challan.loadingStatus === "IN_PROGRESS"
                                    ? "bg-amber-500 animate-pulse"
                                    : "bg-slate-400"
                                }`}
                              />
                              <span className="truncate">
                                {challan.loadingStatus === "LOADED"
                                  ? "Loaded"
                                  : challan.loadingStatus === "IN_PROGRESS"
                                  ? "Loading..."
                                  : "Loading Pending"}
                              </span>
                            </div>
                          </div>
                        </Table.Cell>

                        {/* Actions */}
                        <Table.Cell>
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            {/* View / Print Full Official Challan */}
                            <Button
                              size="sm"
                              variant="primary"
                              className="text-xs font-semibold cursor-pointer"
                              onPress={() => setSelectedChallanForPrint(challan)}
                            >
                              <Printer className="w-3.5 h-3.5 mr-1" />
                              Print Challan
                            </Button>

                            {/* Quick Mark Exit button if pending */}
                            {!isCleared && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="text-xs font-bold text-success hover:bg-success/10 cursor-pointer"
                                onPress={() => handleMarkGateClear(challan)}
                              >
                                Clear Gate
                              </Button>
                            )}
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </Card>

      {/* ─── Printable Full Official Challan Modal ─── */}
      {selectedChallanForPrint && (
        <ChallanModal
          challan={selectedChallanForPrint}
          isOpen={Boolean(selectedChallanForPrint)}
          onClose={() => setSelectedChallanForPrint(null)}
          onOpenScanner={onOpenScanner}
        />
      )}
    </div>
  );
}
