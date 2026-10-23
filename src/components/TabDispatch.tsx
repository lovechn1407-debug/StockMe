import {
  Card,
  Table,
  Button,
  Chip,
  NumberField,
  Label,
  TextField,
  Input,
  Alert,
  Switch,
} from "@heroui/react";
import {
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Truck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Check,
  Layers,
  Warehouse,
  Info,
  ChevronRight,
  SlidersHorizontal,
  Box,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import type {
  Batch,
  FairPriceShop,
  DeliveryChallan,
  CommodityType,
  FIFOException,
  DispatchedBatchItem,
} from "../types";
import { COMMODITIES } from "../types";
import { getBatchAgeDays, issueDeliveryChallan } from "../lib/db";
import { ExceptionModal } from "./ExceptionModal";
import { ChallanModal } from "./ChallanModal";

interface TabDispatchProps {
  batches: Batch[];
  shops: FairPriceShop[];
  selectedCommodity: CommodityType;
  setSelectedCommodity: (c: CommodityType) => void;
  preselectedBatchId?: string | null;
  onClearPreselectedBatch?: () => void;
  onDispatchSuccess?: (
    newChallan: DeliveryChallan,
    updatedBatches: Batch[],
    exception?: FIFOException
  ) => void;
}

export function TabDispatch({
  batches,
  shops,
  selectedCommodity,
  setSelectedCommodity,
  preselectedBatchId,
  onClearPreselectedBatch,
  onDispatchSuccess,
}: TabDispatchProps) {
  // Step 1 states
  const [selectedShopId, setSelectedShopId] = useState<string>(shops[0]?.id || "FPS-101");
  const [requiredQty, setRequiredQty] = useState<number>(100);

  // Vehicle & Driver
  const [vehicleNumber, setVehicleNumber] = useState<string>("DL-1LM-4402");
  const [driverName, setDriverName] = useState<string>("Mohan Lal");

  // Step 3 states: Manual Override
  const [isManualOverride, setIsManualOverride] = useState<boolean>(Boolean(preselectedBatchId));
  const [manualBatchId, setManualBatchId] = useState<string>(preselectedBatchId || "");
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [exceptionData, setExceptionData] = useState<{
    reason: FIFOException["reason"];
    remarks: string;
    officerName: string;
  } | null>(null);

  // Challan Modal result
  const [issuedChallan, setIssuedChallan] = useState<DeliveryChallan | null>(null);
  const [isSubmittingDispatch, setIsSubmittingDispatch] = useState<boolean>(false);

  // Preselected batch integration (e.g. from Dashboard or Bay Layout)
  useEffect(() => {
    if (preselectedBatchId) {
      const target = batches.find((b) => b.id === preselectedBatchId);
      if (target) {
        setSelectedCommodity(target.commodity);
        setIsManualOverride(true);
        setManualBatchId(target.id);
      }
    }
  }, [preselectedBatchId, batches]);

  // Reset manual batch if selected commodity changes and batch does not match
  useEffect(() => {
    if (manualBatchId) {
      const b = batches.find((x) => x.id === manualBatchId);
      if (b && b.commodity !== selectedCommodity) {
        setManualBatchId("");
        setExceptionData(null);
      }
    }
  }, [selectedCommodity, manualBatchId, batches]);

  // Find selected shop
  const selectedShop = shops.find((s) => s.id === selectedShopId) || shops[0];

  // Eligible batches for the chosen commodity sorted oldest first (strictly FIFO)
  const eligibleBatches = useMemo(() => {
    return batches
      .filter((b) => b.commodity === selectedCommodity && b.status === "Eligible" && b.remainingQty > 0)
      .sort((a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime());
  }, [batches, selectedCommodity]);

  // All available batches with stock for manual override (including Eligible or other active stacks)
  const availableBatchesForManual = useMemo(() => {
    return batches
      .filter((b) => b.commodity === selectedCommodity && b.remainingQty > 0 && b.status !== "Depleted")
      .sort((a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime());
  }, [batches, selectedCommodity]);

  const totalEligibleStock = eligibleBatches.reduce((acc, b) => acc + b.remainingQty, 0);

  // Automatic FIFO Split calculation
  const fifoRecommendation = useMemo(() => {
    if (requiredQty <= 0 || eligibleBatches.length === 0) return [];

    let remainingNeeded = requiredQty;
    const plan: Array<{
      batch: Batch;
      availableBefore: number;
      takeQty: number;
      remainingAfter: number;
      ageDays: number;
    }> = [];

    for (const b of eligibleBatches) {
      if (remainingNeeded <= 0) break;
      const take = Math.min(b.remainingQty, remainingNeeded);
      plan.push({
        batch: b,
        availableBefore: b.remainingQty,
        takeQty: take,
        remainingAfter: b.remainingQty - take,
        ageDays: getBatchAgeDays(b.receiptDate),
      });
      remainingNeeded -= take;
    }

    return plan;
  }, [eligibleBatches, requiredQty]);

  // Is FIFO recommendation sufficient?
  const totalRecommendedQty = fifoRecommendation.reduce((sum, item) => sum + item.takeQty, 0);
  const isShortage = totalRecommendedQty < requiredQty;

  // Selected manual batch
  const manualBatch = batches.find((b) => b.id === manualBatchId);
  const oldestEligible = eligibleBatches[0];

  // Check if manual selection violates strict FIFO (i.e. older eligible grain exists)
  const isViolatingFifo = useMemo(() => {
    if (!isManualOverride || !manualBatch || !oldestEligible) return false;
    return manualBatch.id !== oldestEligible.id && oldestEligible.remainingQty > 0;
  }, [isManualOverride, manualBatch, oldestEligible]);

  // Handle Dispatch confirmation
  const handleConfirmDispatch = async () => {
    if (requiredQty <= 0) return;

    // Check if exception required but not yet signed
    if (isViolatingFifo && !exceptionData) {
      setIsExceptionModalOpen(true);
      return;
    }

    setIsSubmittingDispatch(true);
    try {
      let dispatchItems: DispatchedBatchItem[] = [];
      let isFifoCompliant = true;

      if (isManualOverride && manualBatch) {
        isFifoCompliant = !isViolatingFifo;
        const take = Math.min(manualBatch.remainingQty, requiredQty);
        dispatchItems = [
          {
            batchId: manualBatch.id,
            bayLocation: manualBatch.bayLocation,
            dispatchedQty: take,
            batchAgeDays: getBatchAgeDays(manualBatch.receiptDate),
          },
        ];
      } else {
        dispatchItems = fifoRecommendation.map((item) => ({
          batchId: item.batch.id,
          bayLocation: item.batch.bayLocation,
          dispatchedQty: item.takeQty,
          batchAgeDays: item.ageDays,
        }));
      }

      const totalDispatched = dispatchItems.reduce((acc, i) => acc + i.dispatchedQty, 0);
      const challanId = `DC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newChallan: DeliveryChallan = {
        id: challanId,
        challanNumber: challanId,
        fpsId: selectedShop.id,
        fpsName: selectedShop.name,
        commodity: selectedCommodity,
        totalQuantity: totalDispatched,
        dispatchDate: new Date().toISOString().split("T")[0],
        isFifoCompliant,
        batches: dispatchItems,
        vehicleNumber,
        driverName,
        gateStatus: "PENDING_EXIT",
        createdAt: Date.now(),
        ...(exceptionData && {
          exceptionReason: exceptionData.reason,
          exceptionRemarks: exceptionData.remarks,
          approvingOfficer: exceptionData.officerName,
        }),
      };

      // 1. Calculate updated batches with deducted stock
      const updatedBatches = batches.map((b) => {
        const item = dispatchItems.find((d) => d.batchId === b.id);
        if (!item) return b;
        const newQty = Math.max(0, b.remainingQty - item.dispatchedQty);
        return {
          ...b,
          remainingQty: newQty,
          status: (newQty === 0 ? "Depleted" : b.status) as Batch["status"],
        };
      });

      // 2. Prepare exception record if override
      let excRecord: FIFOException | undefined;
      if (exceptionData) {
        excRecord = {
          id: `EXC-${Date.now()}`,
          batchId: dispatchItems[0]?.batchId || "N/A",
          commodity: selectedCommodity,
          fpsId: selectedShop.id,
          fpsName: selectedShop.name,
          quantity: totalDispatched,
          reason: exceptionData.reason,
          remarks: exceptionData.remarks,
          officerName: exceptionData.officerName,
          timestamp: Date.now(),
        };
      }

      // 3. Immediately trigger optimistic dashboard update!
      if (onDispatchSuccess) {
        onDispatchSuccess(newChallan, updatedBatches, excRecord);
      }

      // 4. Persist to Firebase Realtime Database
      await issueDeliveryChallan(
        newChallan,
        exceptionData
          ? {
              reason: exceptionData.reason,
              remarks: exceptionData.remarks,
              officerName: exceptionData.officerName,
            }
          : undefined
      );

      setIssuedChallan(newChallan);
      // Reset override & exception states
      setExceptionData(null);
      setIsManualOverride(false);
      setManualBatchId("");
      if (onClearPreselectedBatch) {
        onClearPreselectedBatch();
      }
    } catch (err) {
      console.error("Dispatch issuance failed:", err);
    } finally {
      setIsSubmittingDispatch(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-foreground">
          Smart FIFO Allocation Engine &amp; Delivery Challan Dispatch
        </h2>
        <p className="text-xs text-muted">
          Linear, zero-error stock allocation. Slices multi-batch orders automatically oldest-first or enables manual grain stock selection with statutory audit trails.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Step 1 & Configuration */}
        <div className="space-y-4">
          <Card className="p-4 space-y-4">
            <Card.Header className="p-0 pb-2 border-b border-border">
              <Card.Title className="text-base font-bold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold">
                  1
                </span>
                Order Indent &amp; Consignee Shop
              </Card.Title>
            </Card.Header>

            <Card.Content className="p-0 space-y-3">
              {/* FPS Consignee Selection */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">
                  Select Fair Price Shop (Consignee)
                </Label>
                <select
                  value={selectedShopId}
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  className="w-full text-xs font-medium bg-surface border border-border rounded-md px-3 py-2 text-foreground focus:outline-none"
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
                {selectedShop && (
                  <p className="text-[11px] text-muted">
                    Dealer: {selectedShop.dealerName} • License: {selectedShop.licenseNo} • Active Cards: {selectedShop.activeCards}
                  </p>
                )}
              </div>

              {/* Commodity Selection */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">Commodity</Label>
                <select
                  value={selectedCommodity}
                  onChange={(e) => setSelectedCommodity(e.target.value as CommodityType)}
                  className="w-full text-xs font-medium bg-surface border border-border rounded-md px-3 py-2 text-foreground focus:outline-none"
                >
                  {COMMODITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <div className="flex justify-between text-[11px] text-muted">
                  <span>Available Eligible Stock:</span>
                  <strong className="text-foreground">{totalEligibleStock} Quintals</strong>
                </div>
              </div>

              {/* Required Quantity */}
              <NumberField
                value={requiredQty}
                onChange={(val) => setRequiredQty(Number(val) || 0)}
                minValue={1}
                maxValue={totalEligibleStock || 500}
              >
                <Label>Required Indent Quantity (in Quintals)</Label>
                <NumberField.Group>
                  <NumberField.DecrementButton />
                  <NumberField.Input />
                  <NumberField.IncrementButton />
                </NumberField.Group>
              </NumberField>

              {/* Transport Vehicle info */}
              <div className="pt-2 border-t border-border space-y-3">
                <TextField
                  value={vehicleNumber}
                  onChange={setVehicleNumber}
                  fullWidth
                >
                  <Label>Transport Truck / Vehicle No.</Label>
                  <Input placeholder="e.g. DL-1LM-4402" />
                </TextField>

                <TextField
                  value={driverName}
                  onChange={setDriverName}
                  fullWidth
                >
                  <Label>Authorized Driver Name</Label>
                  <Input placeholder="e.g. Mohan Lal" />
                </TextField>
              </div>
            </Card.Content>
          </Card>

          {/* Step 3: Manual Batch Override Toggle & Visual Grain Stock Picker */}
          <Card className="p-4 space-y-3 border-2 border-primary/20">
            {/* Header toggle bar */}
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => {
                const nextVal = !isManualOverride;
                setIsManualOverride(nextVal);
                if (nextVal && !manualBatchId && availableBatchesForManual.length > 0) {
                  // Default to first available batch
                  setManualBatchId(availableBatchesForManual[0].id);
                }
              }}
            >
              <div className="pr-2">
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-bold text-foreground">
                    Manual Batch Override (Bypass FIFO)
                  </h4>
                </div>
                <p className="text-[11px] text-muted">
                  Select specific grain stock batch manually
                </p>
              </div>
              <Switch
                isSelected={isManualOverride}
                onChange={(val) => {
                  const nextVal = typeof val === "boolean" ? val : !isManualOverride;
                  setIsManualOverride(nextVal);
                  if (nextVal && !manualBatchId && availableBatchesForManual.length > 0) {
                    setManualBatchId(availableBatchesForManual[0].id);
                  }
                }}
              >
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
            </div>

            {/* Manual Override Active Controls */}
            {isManualOverride && (
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <Box className="w-3.5 h-3.5 text-primary" />
                    Select Grain Stock Batch ({availableBatchesForManual.length} available)
                  </span>
                  {manualBatch && (
                    <Chip size="sm" color="accent" variant="soft" className="font-mono text-[10px]">
                      {manualBatch.id}
                    </Chip>
                  )}
                </div>

                {/* Dropdown Quick Selector */}
                <select
                  value={manualBatchId}
                  onChange={(e) => setManualBatchId(e.target.value)}
                  className="w-full text-xs font-medium bg-surface border border-border rounded-md px-3 py-2 text-foreground focus:outline-none"
                >
                  <option value="">-- Choose Grain Stock Batch --</option>
                  {availableBatchesForManual.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id} ({b.remainingQty} Q in {b.bayLocation}, {getBatchAgeDays(b.receiptDate)}d old)
                    </option>
                  ))}
                </select>

                {/* Visual Selectable Grain Stock Cards */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {availableBatchesForManual.map((b) => {
                    const isSelected = manualBatchId === b.id;
                    const isOldest = oldestEligible?.id === b.id;
                    const ageDays = getBatchAgeDays(b.receiptDate);

                    return (
                      <div
                        key={b.id}
                        onClick={() => setManualBatchId(b.id)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary"
                            : "bg-surface hover:bg-muted/10 border-border hover:border-border/80"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "border-primary bg-primary text-white"
                                  : "border-border bg-surface"
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5" />}
                            </span>
                            <span className="font-mono font-bold text-foreground truncate">
                              {b.id}
                            </span>
                          </div>
                          {isOldest ? (
                            <Chip size="sm" color="success" variant="soft" className="text-[10px]">
                              Oldest (FIFO Priority)
                            </Chip>
                          ) : (
                            <Chip size="sm" color="warning" variant="soft" className="text-[10px]">
                              Alternative Stack
                            </Chip>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted pl-5">
                          <span>
                            {b.bayLocation} • {b.supplier.split(" ")[0]}
                          </span>
                          <span className="font-semibold text-foreground">
                            {b.remainingQty} Q available
                          </span>
                        </div>
                        <div className="pl-5 text-[10px] text-muted flex items-center justify-between pt-0.5">
                          <span>Age: {ageDays} days ({b.receiptDate})</span>
                          <span>Moisture: {b.moisturePct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Stack Details & Allocation Notice */}
                {manualBatch && (
                  <div className="p-2.5 rounded-lg bg-surface border border-border text-xs space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted">Selected Stack Remaining:</span>
                      <strong className="text-foreground">{manualBatch.remainingQty} Quintals</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted">Dispatch Allocation:</span>
                      <strong className="text-primary font-mono">
                        {Math.min(manualBatch.remainingQty, requiredQty)} Quintals
                      </strong>
                    </div>
                    {manualBatch.remainingQty < requiredQty && (
                      <p className="text-[10px] text-warning pt-0.5">
                        ⚠️ Note: This stack has less than the requested {requiredQty} Q. Allocation is capped at {manualBatch.remainingQty} Q.
                      </p>
                    )}
                  </div>
                )}

                {/* Statutory FIFO Exception Notice & Sign Off Form */}
                {isViolatingFifo && oldestEligible && (
                  <Alert status="danger" className="rounded-xl">
                    <Alert.Indicator>
                      <AlertTriangle className="w-4 h-4 text-danger" />
                    </Alert.Indicator>
                    <Alert.Content>
                      <Alert.Title className="text-xs font-bold">
                        FIFO Compliance Override Notice
                      </Alert.Title>
                      <Alert.Description className="text-xs space-y-2">
                        <p className="text-[11px]">
                          Older stack <strong>{oldestEligible.id}</strong> ({getBatchAgeDays(oldestEligible.receiptDate)}d old in {oldestEligible.bayLocation}) is currently active.
                          Bypassing older stock requires statutory officer exception approval (Form PDS-EX-02).
                        </p>

                        {!exceptionData ? (
                          <Button
                            size="sm"
                            variant="danger"
                            className="font-bold text-xs w-full shadow-xs cursor-pointer mt-1"
                            onPress={() => setIsExceptionModalOpen(true)}
                          >
                            <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                            Sign &amp; Approve FIFO Exception Form
                          </Button>
                        ) : (
                          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="text-xs font-semibold truncate">
                                Approved: <strong>{exceptionData.officerName}</strong> ({exceptionData.reason})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsExceptionModalOpen(true)}
                              className="text-[11px] underline font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer shrink-0 ml-2"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Step 2 & Dispatch Plan Preview */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 space-y-4">
            <Card.Header className="p-0 pb-2 border-b border-border flex items-center justify-between">
              <Card.Title className="text-base font-bold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold">
                  2
                </span>
                {isManualOverride
                  ? "Manual Grain Stock Allocation Plan (Bypass Active)"
                  : "Automatic FIFO Allocation Recommendation"}
              </Card.Title>

              {isManualOverride ? (
                <Chip size="sm" color="warning" variant="soft">
                  <ShieldAlert className="w-3.5 h-3.5 inline mr-1 text-warning" />
                  Manual Selection Active
                </Chip>
              ) : (
                <Chip size="sm" color="success" variant="soft">
                  <Sparkles className="w-3.5 h-3.5 inline mr-1 text-success" />
                  Smart FIFO Auto-Split Active
                </Chip>
              )}
            </Card.Header>

            <Card.Content className="p-0 space-y-4">
              {!isManualOverride && isShortage && (
                <Alert status="warning">
                  <Alert.Indicator>
                    <AlertTriangle className="w-4 h-4 text-warning" />
                  </Alert.Indicator>
                  <Alert.Content>
                    <Alert.Title className="font-bold">Insufficient Eligible Stock</Alert.Title>
                    <Alert.Description>
                      You requested {requiredQty} Q of {selectedCommodity}, but only {totalEligibleStock} Q is currently eligible in godown storage. Allocation will fulfill up to {totalEligibleStock} Q.
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              )}

              {/* Recommendation Table */}
              <div>
                <Table>
                  <Table.ScrollContainer>
                    <Table.Content>
                      <Table.Header>
                        <Table.Column isRowHeader>Allocation Sequence</Table.Column>
                        <Table.Column>Batch ID</Table.Column>
                        <Table.Column>Receipt Date &amp; Age</Table.Column>
                        <Table.Column>Location</Table.Column>
                        <Table.Column>Available Before</Table.Column>
                        <Table.Column>Dispatch Allocation</Table.Column>
                        <Table.Column>Remaining After</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {isManualOverride && manualBatch ? (
                          <Table.Row key={manualBatch.id}>
                            <Table.Cell>
                              <Chip size="sm" color="warning" variant="soft">
                                Manual Selection
                              </Chip>
                            </Table.Cell>
                            <Table.Cell className="font-mono font-bold text-xs text-primary">
                              {manualBatch.id}
                            </Table.Cell>
                            <Table.Cell className="text-xs">
                              {manualBatch.receiptDate} ({getBatchAgeDays(manualBatch.receiptDate)} Days)
                            </Table.Cell>
                            <Table.Cell>
                              <Chip size="sm" variant="soft" color="default">
                                {manualBatch.bayLocation}
                              </Chip>
                            </Table.Cell>
                            <Table.Cell className="font-medium text-xs">
                              {manualBatch.remainingQty} Q
                            </Table.Cell>
                            <Table.Cell className="font-bold text-sm text-foreground bg-primary/10">
                              {Math.min(manualBatch.remainingQty, requiredQty)} Quintals
                            </Table.Cell>
                            <Table.Cell className="text-xs text-muted">
                              {Math.max(0, manualBatch.remainingQty - requiredQty) === 0 ? (
                                <span className="text-danger font-semibold">0 Q (Depleted)</span>
                              ) : (
                                <span>{Math.max(0, manualBatch.remainingQty - requiredQty)} Q</span>
                              )}
                            </Table.Cell>
                          </Table.Row>
                        ) : fifoRecommendation.length > 0 ? (
                          fifoRecommendation.map((item, idx) => (
                            <Table.Row key={item.batch.id}>
                              <Table.Cell>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-xs">
                                    Split #{idx + 1}
                                  </span>
                                  {idx === 0 && (
                                    <Chip size="sm" color="accent" variant="soft">
                                      Oldest Batch
                                    </Chip>
                                  )}
                                </div>
                              </Table.Cell>

                              <Table.Cell className="font-mono font-bold text-xs text-primary">
                                {item.batch.id}
                              </Table.Cell>

                              <Table.Cell className="text-xs">
                                {item.batch.receiptDate}{" "}
                                <span className="font-semibold text-warning">
                                  ({item.ageDays} Days old)
                                </span>
                              </Table.Cell>

                              <Table.Cell>
                                <Chip size="sm" variant="soft" color="default">
                                  {item.batch.bayLocation}
                                </Chip>
                              </Table.Cell>

                              <Table.Cell className="font-medium text-xs">
                                {item.availableBefore} Q
                              </Table.Cell>

                              <Table.Cell className="font-bold text-sm text-foreground bg-primary/5">
                                {item.takeQty} Quintals
                              </Table.Cell>

                              <Table.Cell className="text-xs text-muted">
                                {item.remainingAfter === 0 ? (
                                  <span className="text-danger font-semibold">0 Q (Depleted)</span>
                                ) : (
                                  <span>{item.remainingAfter} Q</span>
                                )}
                              </Table.Cell>
                            </Table.Row>
                          ))
                        ) : (
                          <Table.Row>
                            <Table.Cell className="text-muted text-xs">
                              {isManualOverride ? "Please select a grain batch on the left" : "No batches available"}
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
              </div>

              {/* Total allocation highlight */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-surface border border-border">
                <div>
                  <div className="text-xs text-muted">Total Net Allocation:</div>
                  <div className="text-2xl font-bold text-foreground">
                    {isManualOverride && manualBatch
                      ? Math.min(manualBatch.remainingQty, requiredQty)
                      : totalRecommendedQty}{" "}
                    <span className="text-sm font-normal text-muted">Quintals of {selectedCommodity}</span>
                  </div>
                  <div className="text-[11px] text-muted">
                    Allocated to {selectedShop?.name}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant={isViolatingFifo && !exceptionData ? "danger" : "primary"}
                    size="lg"
                    isDisabled={
                      (isManualOverride && !manualBatch) ||
                      (!isManualOverride && fifoRecommendation.length === 0) ||
                      requiredQty <= 0 ||
                      isSubmittingDispatch
                    }
                    onPress={handleConfirmDispatch}
                    className="font-bold shadow-md cursor-pointer hover:scale-102 transition-transform"
                  >
                    {isViolatingFifo && !exceptionData ? (
                      <>
                        <ShieldAlert className="w-5 h-5 mr-1.5" />
                        Sign Exception &amp; Confirm Dispatch
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-5 h-5 mr-1.5" />
                        {isSubmittingDispatch
                          ? "Issuing Challan & Deducting Stock..."
                          : "Confirm & Issue Delivery Challan"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>

      {/* Exception Approval Modal */}
      {isViolatingFifo && oldestEligible && manualBatch && (
        <ExceptionModal
          isOpen={isExceptionModalOpen}
          onClose={() => setIsExceptionModalOpen(false)}
          onApprove={(data) => {
            setExceptionData(data);
            setIsExceptionModalOpen(false);
          }}
          olderBatchId={oldestEligible.id}
          olderBatchAge={getBatchAgeDays(oldestEligible.receiptDate)}
          chosenBatchId={manualBatch.id}
          chosenBatchAge={getBatchAgeDays(manualBatch.receiptDate)}
        />
      )}

      {/* Official Delivery Challan Modal */}
      <ChallanModal
        challan={issuedChallan}
        isOpen={Boolean(issuedChallan)}
        onClose={() => setIssuedChallan(null)}
      />
    </div>
  );
}
