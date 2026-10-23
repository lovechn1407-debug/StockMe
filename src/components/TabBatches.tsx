import {
  Card,
  Table,
  Button,
  Chip,
  Meter,
  TextField,
  Label,
  Input,
  NumberField,
  Modal,
  Tooltip,
} from "@heroui/react";
import {
  PlusCircle,
  QrCode,
  ShieldAlert,
  Scale,
  Calendar,
  Layers,
} from "lucide-react";
import { useState } from "react";
import type { Batch, CommodityType } from "../types";
import { COMMODITIES, BAY_LOCATIONS } from "../types";
import {
  getBatchAgeDays,
  addInwardBatch,
  formatBayCode,
  getExpiryGapColor,
  getExpiryGapDays,
} from "../lib/db";
import { QRModal } from "./QRModal";
import { FumigationModal } from "./FumigationModal";
import { DriageModal } from "./DriageModal";

interface TabBatchesProps {
  batches: Batch[];
  onToggleStatus: (batchId: string, newStatus: Batch["status"], note: string) => Promise<void>;
  onLogDriage: (batchId: string, currentQty: number, deductQty: number, reason: string) => Promise<void>;
}

interface BatchActionButtonsProps {
  batch: Batch;
  onQR: (batch: Batch) => void;
  onFumigate: (batch: Batch) => void;
  onDriage: (batch: Batch) => void;
}

function BatchActionButtons({
  batch,
  onQR,
  onFumigate,
  onDriage,
}: BatchActionButtonsProps) {
  const isEligible = batch.status === "Eligible";
  const isDepleted = Number(batch.remainingQty || 0) <= 0;

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      {/* 1. View Sack QRs & Passport Print Button */}
      <Tooltip delay={50} closeDelay={50}>
        <Tooltip.Trigger className="inline-flex">
          <button
            type="button"
            onClick={() => onQR(batch)}
            className="w-8 h-8 rounded-full border border-border/80 bg-surface hover:bg-muted/40 text-foreground flex items-center justify-center p-0 transition-all duration-150 hover:scale-110 active:scale-95 shadow-2xs cursor-pointer focus:outline-none"
            aria-label="View Sack QRs & Passport Print"
          >
            <QrCode className="w-4 h-4 shrink-0 block m-auto" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content showArrow className="text-xs font-semibold px-2.5 py-1 bg-slate-900 text-white rounded-md shadow-lg">
          View Sack QRs &amp; Passport Print
        </Tooltip.Content>
      </Tooltip>

      {/* 2. Lock / Release Button */}
      <Tooltip delay={50} closeDelay={50}>
        <Tooltip.Trigger className="inline-flex">
          <button
            type="button"
            onClick={() => onFumigate(batch)}
            className={`w-8 h-8 rounded-full border flex items-center justify-center p-0 transition-all duration-150 hover:scale-110 active:scale-95 shadow-2xs cursor-pointer focus:outline-none ${
              isEligible
                ? "border-border/80 bg-surface hover:bg-muted/40 text-foreground"
                : "border-primary/50 bg-primary text-primary-foreground shadow-xs"
            }`}
            aria-label={isEligible ? "Lock for Fumigation" : "Release Lock"}
          >
            <ShieldAlert className="w-4 h-4 shrink-0 block m-auto" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content showArrow className="text-xs font-semibold px-2.5 py-1 bg-slate-900 text-white rounded-md shadow-lg">
          {isEligible ? "Lock for Fumigation" : "Release Fumigation Lock"}
        </Tooltip.Content>
      </Tooltip>

      {/* 3. Spillage / Driage deduction Button */}
      <Tooltip delay={50} closeDelay={50}>
        <Tooltip.Trigger className="inline-flex">
          <button
            type="button"
            disabled={isDepleted}
            onClick={() => !isDepleted && onDriage(batch)}
            className={`w-8 h-8 rounded-full border flex items-center justify-center p-0 transition-all duration-150 shadow-2xs focus:outline-none ${
              isDepleted
                ? "border-border/40 bg-muted/20 text-muted/40 cursor-not-allowed"
                : "border-border/80 bg-surface hover:bg-muted/40 text-foreground hover:scale-110 active:scale-95 cursor-pointer"
            }`}
            aria-label={isDepleted ? "Stock Depleted" : "Log Driage Deduction"}
          >
            <Scale className="w-4 h-4 shrink-0 block m-auto" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content showArrow className="text-xs font-semibold px-2.5 py-1 bg-slate-900 text-white rounded-md shadow-lg">
          {isDepleted ? "Stock Depleted (0 Q)" : "Log Driage Deduction"}
        </Tooltip.Content>
      </Tooltip>
    </div>
  );
}

export function TabBatches({ batches, onToggleStatus, onLogDriage }: TabBatchesProps) {
  // Modal states
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [selectedBatchForQR, setSelectedBatchForQR] = useState<Batch | null>(null);
  const [selectedBatchForFumigation, setSelectedBatchForFumigation] = useState<Batch | null>(null);
  const [selectedBatchForDriage, setSelectedBatchForDriage] = useState<Batch | null>(null);

  // Filter states
  const [commodityFilter, setCommodityFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Inward Form States
  const [formCommodity, setFormCommodity] = useState<CommodityType>("Wheat");
  const [formSupplier, setFormSupplier] = useState<string>("");
  const [formReceiptDate, setFormReceiptDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [formExpiryDate, setFormExpiryDate] = useState<string>(
    new Date(Date.now() + 300 * 86400000).toISOString().split("T")[0]
  );
  // Helper to match bay location string to canonical BAY_LOCATIONS
  const matchBay = (batchBay: string, canonicalBay: string): boolean => {
    if (!batchBay || !canonicalBay) return false;
    const bTrim = batchBay.trim().toLowerCase();
    const cTrim = canonicalBay.trim().toLowerCase();
    if (bTrim === cTrim) return true;
    const bClean = bTrim.replace(/[^a-z0-9]/g, "");
    const cClean = cTrim.replace(/[^a-z0-9]/g, "");
    if (bClean === cClean) return true;
    if (cClean === "baya1" && (bClean === "bay1" || bClean === "1" || bClean === "bay01")) {
      return true;
    }
    return false;
  };

  const BAY_MAX_CAPACITY = 250;
  const bayOccupancyMap: Record<string, number> = {};
  BAY_LOCATIONS.forEach((bay) => {
    bayOccupancyMap[bay] = 0;
  });
  batches.forEach((b) => {
    const rem = Number(b.remainingQty) || 0;
    if (rem > 0) {
      const canonical = BAY_LOCATIONS.find((target) => matchBay(b.bayLocation, target));
      if (canonical) {
        bayOccupancyMap[canonical] = (bayOccupancyMap[canonical] || 0) + rem;
      }
    }
  });

  const [formQty, setFormQty] = useState<number>(100);
  const [formBay, setFormBay] = useState<string>("Bay A-1");
  const [formMoisture, setFormMoisture] = useState<number>(11.5);
  const [isSubmittingInward, setIsSubmittingInward] = useState(false);

  const selectedBayOccupancy = bayOccupancyMap[formBay] || 0;
  const selectedBayAvailable = Math.max(0, BAY_MAX_CAPACITY - selectedBayOccupancy);
  const isSelectedBayFull = selectedBayAvailable <= 0;
  const isOverCapacity = formQty > selectedBayAvailable;

  const handleOpenInwardModal = () => {
    // Pick the first bay that still has free space
    const firstFreeBay =
      BAY_LOCATIONS.find((b) => (bayOccupancyMap[b] || 0) < BAY_MAX_CAPACITY) || BAY_LOCATIONS[0];
    setFormBay(firstFreeBay);
    const free = Math.max(0, BAY_MAX_CAPACITY - (bayOccupancyMap[firstFreeBay] || 0));
    setFormQty(Math.min(100, Math.max(1, free)));
    setIsInwardModalOpen(true);
  };

  // Generate unique Batch ID
  const generateBatchId = (commodity: CommodityType): string => {
    const code = commodity.substring(0, 3).toUpperCase();
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `BATCH-${code}-${randomSuffix}`;
  };

  const handleInwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupplier || formQty <= 0) return;

    // Strict Bay Capacity Enforcement (250 Q Limit)
    if (formQty > selectedBayAvailable) {
      alert(
        `Capacity Limit Exceeded: ${formBay} only has ${selectedBayAvailable} Q of available space (Max 250 Q per bay). You cannot add ${formQty} Q here.`
      );
      return;
    }

    setIsSubmittingInward(true);
    try {
      const newBatchId = generateBatchId(formCommodity);
      const newBatch: Batch = {
        id: newBatchId,
        commodity: formCommodity,
        supplier: formSupplier,
        receiptDate: formReceiptDate,
        expiryDate: formExpiryDate,
        receivedQty: Number(formQty) || 0,
        remainingQty: Number(formQty) || 0,
        bayLocation: formBay,
        moisturePct: Number(formMoisture) || 0,
        status: "Eligible",
        stackCardNumber: `SC-${newBatchId}`,
        createdAt: Date.now(),
      };

      await addInwardBatch(newBatch);
      setIsInwardModalOpen(false);
      // Reset form
      setFormSupplier("");
      setFormQty(100);
    } finally {
      setIsSubmittingInward(false);
    }
  };

  // Only display active batches with positive remaining balance (exclude depleted/finished stock)
  const activeBatches = batches.filter(
    (b) => Number(b.remainingQty || 0) > 0 && b.status !== "Depleted"
  );

  // Filter batches
  const filteredBatches = activeBatches.filter((b) => {
    const matchesCommodity = commodityFilter === "All" || b.commodity === commodityFilter;
    const matchesStatus = statusFilter === "All" || b.status === statusFilter;
    return matchesCommodity && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Inward Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Inward Stock & Master Batch Inventory
          </h2>
          <p className="text-xs text-muted">
            Complete traceability of every physical stack in the godown with live remaining balance, stack cards, and moisture checks.
          </p>
        </div>

        <Button
          variant="primary"
          onPress={handleOpenInwardModal}
          className="font-semibold"
        >
          <PlusCircle className="w-4 h-4 mr-1.5" />
          Receive Inward Consignment
        </Button>
      </div>

      {/* Filter Controls */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-muted uppercase">Filters:</span>

            {/* Commodity Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted">Commodity:</span>
              <select
                value={commodityFilter}
                onChange={(e) => setCommodityFilter(e.target.value)}
                className="text-xs font-medium bg-surface border border-border rounded px-2.5 py-1.5 text-foreground focus:outline-none"
              >
                <option value="All">All Commodities ({activeBatches.length})</option>
                {COMMODITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-medium bg-surface border border-border rounded px-2.5 py-1.5 text-foreground focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Eligible">Eligible</option>
                <option value="Under Fumigation">Under Fumigation</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-muted">
            Showing <strong>{filteredBatches.length}</strong> of {activeBatches.length} Total Batches
          </div>
        </div>
      </Card>

      {/* Master Batch Inventory Table */}
      <Card>
        <Card.Content className="p-0">
          <Table>
            <Table.ScrollContainer className="overflow-x-auto">
              <Table.Content className="min-w-[1020px]">
                <Table.Header>
                  <Table.Column isRowHeader className="whitespace-nowrap">Batch ID</Table.Column>
                  <Table.Column className="whitespace-nowrap">Commodity</Table.Column>
                  <Table.Column className="whitespace-nowrap">Supplier Depot</Table.Column>
                  <Table.Column className="whitespace-nowrap">Receipt Date</Table.Column>
                  <Table.Column className="whitespace-nowrap">Stock Age</Table.Column>
                  <Table.Column className="whitespace-nowrap">Bay</Table.Column>
                  <Table.Column className="whitespace-nowrap">Received</Table.Column>
                  <Table.Column className="whitespace-nowrap">Remaining Balance</Table.Column>
                  <Table.Column className="whitespace-nowrap">Status</Table.Column>
                  <Table.Column className="whitespace-nowrap w-[140px]">Actions</Table.Column>
                </Table.Header>
                <Table.Body>
                  {filteredBatches.map((batch) => {
                    const ageDays = getBatchAgeDays(batch.receiptDate);
                    const remainingPct =
                      batch.receivedQty > 0
                        ? Math.round((batch.remainingQty / batch.receivedQty) * 100)
                        : 0;

                    return (
                      <Table.Row key={batch.id}>
                        <Table.Cell className="font-mono font-bold text-xs text-primary whitespace-nowrap">
                          {batch.id}
                        </Table.Cell>

                        <Table.Cell className="font-semibold text-foreground whitespace-nowrap">
                          {batch.commodity}
                        </Table.Cell>

                        <Table.Cell className="text-xs text-muted max-w-[200px] truncate whitespace-nowrap">
                          <span title={batch.supplier}>{batch.supplier}</span>
                        </Table.Cell>

                        <Table.Cell className="text-xs font-medium text-foreground whitespace-nowrap">
                          {batch.receiptDate}
                        </Table.Cell>

                        <Table.Cell className="whitespace-nowrap">
                          {(() => {
                            const expiryStyle = getExpiryGapColor(batch.expiryDate);
                            return (
                              <Tooltip delay={50} closeDelay={50}>
                                <Tooltip.Trigger className="inline-flex">
                                  <Chip
                                    size="sm"
                                    className="whitespace-nowrap cursor-help font-semibold"
                                    color={expiryStyle.color}
                                    variant="soft"
                                  >
                                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                                    {ageDays} Days
                                  </Chip>
                                </Tooltip.Trigger>
                                <Tooltip.Content showArrow className="text-xs px-2.5 py-1.5 bg-slate-900 text-white rounded-md shadow-lg space-y-0.5">
                                  <div className="font-bold">Expiry Gap: {expiryStyle.daysLeft} Days</div>
                                  <div className="text-slate-300">Expiry Date: {batch.expiryDate}</div>
                                  <div className="text-slate-300">Status: {expiryStyle.label}</div>
                                </Tooltip.Content>
                              </Tooltip>
                            );
                          })()}
                        </Table.Cell>

                        <Table.Cell className="whitespace-nowrap">
                          <Chip size="sm" variant="soft" color="default" className="whitespace-nowrap font-bold">
                            {formatBayCode(batch.bayLocation)}
                          </Chip>
                        </Table.Cell>

                        <Table.Cell className="text-xs font-medium text-muted whitespace-nowrap">
                          {batch.receivedQty} Q
                        </Table.Cell>

                        <Table.Cell className="min-w-[140px] whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold whitespace-nowrap">
                              <span>{batch.remainingQty} Q</span>
                              <span className="text-muted">{remainingPct}%</span>
                            </div>
                            <Meter
                              value={remainingPct}
                              minValue={0}
                              maxValue={100}
                              color={
                                remainingPct === 0
                                  ? "default"
                                  : remainingPct < 25
                                  ? "danger"
                                  : remainingPct < 50
                                  ? "warning"
                                  : "accent"
                              }
                            >
                              <Meter.Track>
                                <Meter.Fill />
                              </Meter.Track>
                            </Meter>
                          </div>
                        </Table.Cell>

                        <Table.Cell className="whitespace-nowrap">
                          <Chip
                            size="sm"
                            className="whitespace-nowrap"
                            color={
                              batch.status === "Eligible"
                                ? "success"
                                : batch.status === "Under Fumigation"
                                ? "warning"
                                : batch.status === "Quality Hold"
                                ? "danger"
                                : "default"
                            }
                            variant="soft"
                          >
                            {batch.status}
                          </Chip>
                        </Table.Cell>

                        <Table.Cell className="whitespace-nowrap w-[140px]">
                          <BatchActionButtons
                            batch={batch}
                            onQR={setSelectedBatchForQR}
                            onFumigate={setSelectedBatchForFumigation}
                            onDriage={setSelectedBatchForDriage}
                          />
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

      {/* Inward Consignment Modal */}
      <Modal isOpen={isInwardModalOpen} onOpenChange={setIsInwardModalOpen}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog>
              <form onSubmit={handleInwardSubmit}>
                <Modal.Header>
                  <div className="flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-primary" />
                    <Modal.Heading className="text-lg font-bold">
                      Add New Inward Stock Consignment
                    </Modal.Heading>
                  </div>
                  <Modal.CloseTrigger />
                </Modal.Header>

                <Modal.Body className="space-y-4">
                  <p className="text-xs text-muted">
                    Record inward consignment arriving from FCI railheads, state procurement agencies, or buffer godowns.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Commodity Type */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-foreground">Commodity Type</Label>
                      <select
                        value={formCommodity}
                        onChange={(e) => setFormCommodity(e.target.value as CommodityType)}
                        className="w-full text-sm font-medium bg-surface border border-border rounded-md px-3 py-2 text-foreground focus:outline-none"
                      >
                        {COMMODITIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Godown Bay Location */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-foreground">
                        Assigned Godown Bay (Ceiling: 250 Q)
                      </Label>
                      <select
                        value={formBay}
                        onChange={(e) => {
                          const newBay = e.target.value;
                          setFormBay(newBay);
                          const free = Math.max(0, BAY_MAX_CAPACITY - (bayOccupancyMap[newBay] || 0));
                          if (formQty > free && free > 0) {
                            setFormQty(free);
                          }
                        }}
                        className="w-full text-sm font-medium bg-surface border border-border rounded-md px-3 py-2 text-foreground focus:outline-none"
                      >
                        {BAY_LOCATIONS.map((b) => {
                          const occ = bayOccupancyMap[b] || 0;
                          const free = Math.max(0, BAY_MAX_CAPACITY - occ);
                          const isFull = free <= 0;
                          return (
                            <option key={b} value={b} disabled={isFull}>
                              {formatBayCode(b)} {isFull ? "— [FULL 250/250 Q]" : `— [${occ}/250 Q (${free} Q free)]`}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Live Bay Capacity Status Indicator */}
                  <div className="rounded-md border border-border/80 p-2.5 bg-muted/10 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted font-medium">Bay Space ({formatBayCode(formBay)}):</span>
                      <span
                        className={
                          isOverCapacity || isSelectedBayFull
                            ? "text-danger font-bold"
                            : "text-foreground font-semibold"
                        }
                      >
                        {selectedBayOccupancy} Q stored • {selectedBayAvailable} Q free (250 Q max)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-default-200 overflow-hidden flex">
                      <div
                        className="bg-primary h-full transition-all"
                        style={{
                          width: `${Math.min(100, (selectedBayOccupancy / BAY_MAX_CAPACITY) * 100)}%`,
                        }}
                        title={`Already stored: ${selectedBayOccupancy} Q`}
                      />
                      {formQty > 0 && selectedBayAvailable > 0 && (
                        <div
                          className={`h-full transition-all ${
                            isOverCapacity ? "bg-danger" : "bg-success"
                          }`}
                          style={{
                            width: `${Math.min(
                              100 - (selectedBayOccupancy / BAY_MAX_CAPACITY) * 100,
                              (formQty / BAY_MAX_CAPACITY) * 100
                            )}%`,
                          }}
                          title={`New consignment: ${formQty} Q`}
                        />
                      )}
                    </div>
                  </div>

                  {/* Over-capacity Warning Alert */}
                  {isOverCapacity && (
                    <div className="p-3 rounded-md bg-danger/10 border border-danger/30 text-danger text-xs space-y-1">
                      <strong>⚠️ Bay Capacity Limit Exceeded:</strong>
                      <p>
                        {formBay} only has <strong>{selectedBayAvailable} Q</strong> of free space remaining (Statutory warehouse ceiling: 250 Q per bay). You cannot add {formQty} Q. Please lower quantity to {selectedBayAvailable} Q or choose an available bay.
                      </p>
                    </div>
                  )}

                  {/* Supplier Name */}
                  <TextField
                    value={formSupplier}
                    onChange={setFormSupplier}
                    isRequired
                    fullWidth
                  >
                    <Label>Supplier Agency / Depot Name</Label>
                    <Input placeholder="e.g. FCI Sangrur Silo / NAFED Bikaner Buffer" />
                  </TextField>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Quantity Received */}
                    <NumberField
                      value={formQty}
                      onChange={(val) => setFormQty(Number(val) || 0)}
                      minValue={1}
                      maxValue={selectedBayAvailable > 0 ? selectedBayAvailable : 250}
                    >
                      <Label>
                        Quantity Received (Max {selectedBayAvailable} Q)
                      </Label>
                      <NumberField.Group>
                        <NumberField.DecrementButton />
                        <NumberField.Input />
                        <NumberField.IncrementButton />
                      </NumberField.Group>
                    </NumberField>

                    {/* Moisture % */}
                    <NumberField
                      value={formMoisture}
                      onChange={(val) => setFormMoisture(Number(val) || 0)}
                      minValue={0}
                      maxValue={20}
                    >
                      <Label>Moisture Content (%)</Label>
                      <NumberField.Group>
                        <NumberField.DecrementButton />
                        <NumberField.Input />
                        <NumberField.IncrementButton />
                      </NumberField.Group>
                    </NumberField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Receipt Date */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-foreground">Receipt Date</Label>
                      <input
                        type="date"
                        value={formReceiptDate}
                        onChange={(e) => setFormReceiptDate(e.target.value)}
                        className="w-full text-sm font-medium bg-surface border border-border rounded-md px-3 py-2 text-foreground focus:outline-none"
                      />
                    </div>

                    {/* Expiry / Best Before Date */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-foreground">Best Before / Expiry Date</Label>
                      <input
                        type="date"
                        value={formExpiryDate}
                        onChange={(e) => setFormExpiryDate(e.target.value)}
                        className="w-full text-sm font-medium bg-surface border border-border rounded-md px-3 py-2 text-foreground focus:outline-none"
                      />
                    </div>
                  </div>
                </Modal.Body>

                <Modal.Footer className="flex justify-between">
                  <Button
                    variant="secondary"
                    onPress={() => setIsInwardModalOpen(false)}
                    isDisabled={isSubmittingInward}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    isDisabled={isSubmittingInward || isOverCapacity || selectedBayAvailable <= 0}
                  >
                    {isSubmittingInward ? "Registering Batch..." : "Save Inward Batch to Firebase"}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* QR Stack Card Modal */}
      <QRModal
        batch={selectedBatchForQR}
        isOpen={Boolean(selectedBatchForQR)}
        onClose={() => setSelectedBatchForQR(null)}
      />

      {/* Fumigation Toggle Modal */}
      <FumigationModal
        batch={selectedBatchForFumigation}
        isOpen={Boolean(selectedBatchForFumigation)}
        onClose={() => setSelectedBatchForFumigation(null)}
        onToggleStatus={onToggleStatus}
      />

      {/* Spillage / Driage Modal */}
      <DriageModal
        batch={selectedBatchForDriage}
        isOpen={Boolean(selectedBatchForDriage)}
        onClose={() => setSelectedBatchForDriage(null)}
        onSubmit={onLogDriage}
      />
    </div>
  );
}
