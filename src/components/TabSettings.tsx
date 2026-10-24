import { useState } from "react";
import {
  Card,
  Button,
  Input,
  Label,
  Separator,
  Chip,
  Table,
  Alert,
} from "@heroui/react";
import {
  UserCheck,
  Wheat,
  Plus,
  Trash2,
  Building2,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Layers,
  FileCheck2,
} from "lucide-react";
import { COMMODITIES, type Batch } from "../types";
import {
  DEFAULT_OFFICER_NAME,
  DEFAULT_OFFICER_DESIGNATION,
  DEFAULT_GODOWN_NAME,
} from "../lib/settings";

interface TabSettingsProps {
  batches: Batch[];
  commodities: string[];
  onAddCommodity: (name: string) => boolean;
  onDeleteCommodity: (name: string) => void;
  officerName: string;
  onUpdateOfficer: (name: string, designation: string, godown: string) => void;
  officerDesignation: string;
  godownName: string;
}

export function TabSettings({
  batches,
  commodities,
  onAddCommodity,
  onDeleteCommodity,
  officerName,
  onUpdateOfficer,
  officerDesignation,
  godownName,
}: TabSettingsProps) {
  // Local editable state
  const [tempOfficerName, setTempOfficerName] = useState(officerName);
  const [tempOfficerDesignation, setTempOfficerDesignation] = useState(officerDesignation);
  const [tempGodownName, setTempGodownName] = useState(godownName);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New commodity input state
  const [newCommodityName, setNewCommodityName] = useState("");
  const [commodityError, setCommodityError] = useState<string | null>(null);
  const [commoditySuccess, setCommoditySuccess] = useState<string | null>(null);

  // Handle saving officer details
  const handleSaveOfficer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tempOfficerName.trim()) return;

    onUpdateOfficer(
      tempOfficerName.trim(),
      tempOfficerDesignation.trim() || DEFAULT_OFFICER_DESIGNATION,
      tempGodownName.trim() || DEFAULT_GODOWN_NAME
    );
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Reset officer form to defaults
  const handleResetOfficerDefaults = () => {
    setTempOfficerName(DEFAULT_OFFICER_NAME);
    setTempOfficerDesignation(DEFAULT_OFFICER_DESIGNATION);
    setTempGodownName(DEFAULT_GODOWN_NAME);
    onUpdateOfficer(
      DEFAULT_OFFICER_NAME,
      DEFAULT_OFFICER_DESIGNATION,
      DEFAULT_GODOWN_NAME
    );
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Handle adding new commodity
  const handleAddCommodity = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newCommodityName.trim();
    setCommodityError(null);
    setCommoditySuccess(null);

    if (!name) {
      setCommodityError("Please enter a commodity name.");
      return;
    }

    // Check if exists case-insensitively
    const exists = commodities.some(
      (c) => c.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      setCommodityError(`Commodity "${name}" already exists in the catalog.`);
      return;
    }

    const added = onAddCommodity(name);
    if (added) {
      setNewCommodityName("");
      setCommoditySuccess(`Successfully registered "${name}" to the master catalog.`);
      setTimeout(() => setCommoditySuccess(null), 4000);
    } else {
      setCommodityError("Failed to register commodity. Please try again.");
    }
  };

  // Quick suggestion chips
  const suggestedCommodities = [
    "Barley",
    "Bajra",
    "Jowar",
    "Mustard Seeds",
    "Moong Dal",
    "Masoor Dal",
    "Ragi",
  ].filter((s) => !commodities.some((c) => c.toLowerCase() === s.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          System Settings &amp; Godown Configuration
        </h2>
        <p className="text-xs text-muted">
          Configure statutory officer credentials, master grain/commodity catalog, and official facility parameters.
        </p>
      </div>

      {/* Grid: Officer Settings & Signature Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Officer Profile Card (2 cols on lg) */}
        <Card className="lg:col-span-2">
          <Card.Header>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                <Card.Title>Authorized Godown Officer Profile</Card.Title>
              </div>
              <Chip size="sm" variant="soft" color="accent">
                Statutory Authority
              </Chip>
            </div>
            <Card.Description>
              This officer profile is certified across Delivery Challans, Gate Security passes, and statutory FIFO exception records.
            </Card.Description>
          </Card.Header>

          <Card.Content>
            <form onSubmit={handleSaveOfficer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Officer Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="officer-name">Authorized Officer Name</Label>
                  <Input
                    id="officer-name"
                    value={tempOfficerName}
                    onChange={(e) => setTempOfficerName(e.target.value)}
                    placeholder="e.g. A. K. Sharma"
                    required
                  />
                  <span className="text-[11px] text-muted">
                    Full name appearing on official seals and dispatch stamps.
                  </span>
                </div>

                {/* Officer Designation */}
                <div className="space-y-1.5">
                  <Label htmlFor="officer-designation">Official Designation / Title</Label>
                  <Input
                    id="officer-designation"
                    value={tempOfficerDesignation}
                    onChange={(e) => setTempOfficerDesignation(e.target.value)}
                    placeholder="e.g. Assistant Godown Officer (AGO)"
                    required
                  />
                  <span className="text-[11px] text-muted">
                    Departmental rank or official supervisory post.
                  </span>
                </div>
              </div>

              {/* Godown Facility Name */}
              <div className="space-y-1.5">
                <Label htmlFor="godown-name">State Godown Facility / Depo Unit</Label>
                <Input
                  id="godown-name"
                  value={tempGodownName}
                  onChange={(e) => setTempGodownName(e.target.value)}
                  placeholder="e.g. State Buffer Godown Unit-4"
                  required
                />
                <span className="text-[11px] text-muted">
                  The certified warehouse unit name printed on all gate documents.
                </span>
              </div>

              {saveSuccess && (
                <Alert status="success">
                  <Alert.Indicator>
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  </Alert.Indicator>
                  <Alert.Content>
                    <Alert.Title className="text-xs font-bold">Officer Profile Updated</Alert.Title>
                    <Alert.Description className="text-xs">
                      Changes have been applied across all Delivery Challans, Gate Passes, and statutory audit registers.
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="font-semibold"
                >
                  <UserCheck className="w-4 h-4 mr-1.5" />
                  Update Officer Across System
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onPress={handleResetOfficerDefaults}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Reset to Default
                </Button>
              </div>
            </form>
          </Card.Content>
        </Card>

        {/* Live Official Signature Stamp Preview Card (1 col on lg) */}
        <Card className="flex flex-col justify-between">
          <Card.Header>
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-primary" />
              <Card.Title className="text-sm">Challan Stamp Preview</Card.Title>
            </div>
            <Card.Description className="text-xs">
              Live rendering of the authorization stamp on printed government manifests.
            </Card.Description>
          </Card.Header>

          <Card.Content className="flex-1 flex flex-col justify-center">
            <div className="p-4 bg-muted/10 rounded-lg border border-border text-center space-y-4">
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted font-medium">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Government of India • ePDS Verification</span>
              </div>

              <div className="py-2">
                <div className="font-serif italic text-lg text-primary tracking-wide border-b border-primary/30 inline-block px-6 pb-1">
                  {tempOfficerName || "Authorized Officer"}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-foreground">
                  {tempOfficerDesignation || "Assistant Godown Officer"}
                </div>
                <div className="text-[11px] text-muted">
                  {tempGodownName || "State Buffer Godown Unit-4"}
                </div>
              </div>

              <Chip size="sm" variant="soft" color="success" className="text-[10px]">
                Statutory Dispatch Clearance Stamp Active
              </Chip>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Master Commodity Management Section */}
      <Card>
        <Card.Header>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full">
            <div className="flex items-center gap-2">
              <Wheat className="w-5 h-5 text-primary" />
              <Card.Title>Master Commodity Catalog</Card.Title>
            </div>
            <Chip size="sm" variant="soft" color="accent">
              {commodities.length} Registered Commodities
            </Chip>
          </div>
          <Card.Description>
            Register new commodities into the godown master catalog. Newly registered commodities immediately become selectable across Inward Consignment receiving, FIFO dispatch engine, stock filters, and analytical charts.
          </Card.Description>
        </Card.Header>

        <Card.Content className="space-y-6">
          {/* Add Commodity Inline Form */}
          <form
            onSubmit={handleAddCommodity}
            className="p-4 bg-muted/5 rounded-lg border border-border space-y-4"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Add New Commodity Type
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-end gap-3">
              <div className="w-full sm:flex-1 space-y-1.5">
                <Label htmlFor="new-commodity-name">Commodity / Grain Name</Label>
                <Input
                  id="new-commodity-name"
                  value={newCommodityName}
                  onChange={(e) => setNewCommodityName(e.target.value)}
                  placeholder="e.g. Bajra (Pearl Millet), Mustard Seeds, Barley..."
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="font-semibold shrink-0"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Register Commodity
              </Button>
            </div>

            {/* Quick Suggestions */}
            {suggestedCommodities.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-muted block">
                  Quick Add Standard Essential Commodities:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedCommodities.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        onAddCommodity(item);
                        setCommoditySuccess(`Registered "${item}" to the catalog.`);
                        setTimeout(() => setCommoditySuccess(null), 3000);
                      }}
                      className="px-2.5 py-1 text-xs rounded-full bg-surface border border-border hover:border-primary hover:text-primary transition-all cursor-pointer shadow-2xs"
                    >
                      + {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {commodityError && (
              <Alert status="danger">
                <Alert.Content>
                  <Alert.Description className="text-xs">{commodityError}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            {commoditySuccess && (
              <Alert status="success">
                <Alert.Content>
                  <Alert.Description className="text-xs">{commoditySuccess}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}
          </form>

          <Separator />

          {/* Master Commodities Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                Active Catalog Commodities ({commodities.length})
              </span>
            </div>

            <Table aria-label="Master Commodities Table">
              <Table.ScrollContainer className="overflow-x-auto">
                <Table.Content>
                  <Table.Header>
                    <Table.Column isRowHeader>Commodity Name</Table.Column>
                    <Table.Column>Catalog Tier</Table.Column>
                    <Table.Column>Active Batches</Table.Column>
                    <Table.Column>Stored Quantity</Table.Column>
                    <Table.Column>System Status</Table.Column>
                    <Table.Column className="text-right">Actions</Table.Column>
                  </Table.Header>

                  <Table.Body>
                    {commodities.map((commodity) => {
                      const isDefaultCore = COMMODITIES.includes(commodity);
                      const matchingBatches = batches.filter(
                        (b) => b.commodity.toLowerCase() === commodity.toLowerCase()
                      );
                      const activeBatchesCount = matchingBatches.filter(
                        (b) => b.remainingQty > 0
                      ).length;
                      const totalStoredQty = matchingBatches.reduce(
                        (sum, b) => sum + (b.remainingQty || 0),
                        0
                      );

                      return (
                        <Table.Row key={commodity}>
                          <Table.Cell>
                            <div className="flex items-center gap-2">
                              <Wheat className="w-4 h-4 text-primary shrink-0" />
                              <span className="font-semibold text-foreground">
                                {commodity}
                              </span>
                            </div>
                          </Table.Cell>

                          <Table.Cell>
                            {isDefaultCore ? (
                              <Chip size="sm" variant="soft" color="accent">
                                Core NFSA Grain
                              </Chip>
                            ) : (
                              <Chip size="sm" variant="soft" color="default">
                                State Buffer Extended
                              </Chip>
                            )}
                          </Table.Cell>

                          <Table.Cell>
                            <span className="font-medium text-foreground">
                              {activeBatchesCount} {activeBatchesCount === 1 ? "Stack" : "Stacks"}
                            </span>
                          </Table.Cell>

                          <Table.Cell>
                            <span className="font-mono font-bold text-foreground">
                              {totalStoredQty.toLocaleString()} Q
                            </span>
                          </Table.Cell>

                          <Table.Cell>
                            <Chip size="sm" variant="soft" color="success">
                              Active in System
                            </Chip>
                          </Table.Cell>

                          <Table.Cell className="text-right">
                            {isDefaultCore ? (
                              <span className="text-xs text-muted italic">
                                Protected Core
                              </span>
                            ) : (
                              <Button
                                variant="danger"
                                size="sm"
                                isIconOnly
                                onPress={() => onDeleteCommodity(commodity)}
                                aria-label={`Remove ${commodity}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
        </Card.Content>
      </Card>

      {/* Statutory Godown Reference Notes Alert */}
      <Alert status="accent">
        <Alert.Indicator>
          <Building2 className="w-4 h-4 text-accent" />
        </Alert.Indicator>
        <Alert.Content>
          <Alert.Title className="text-xs font-bold">
            Realtime System Synchronization
          </Alert.Title>
          <Alert.Description className="text-xs space-y-1">
            <p>
              • <strong>Officer Identity:</strong> All issued Delivery Challans, Gate Security clear passes, and statutory Non-FIFO Exception authorization logs will immediately reflect the designated officer name and title.
            </p>
            <p>
              • <strong>Commodity Dynamic Propagation:</strong> Any newly added commodity is immediately integrated into the Inward Consignment intake workflow, Smart FIFO dispatch allocation, Stack Bay allocations, and the Real-Time Analytical inventory charts.
            </p>
          </Alert.Description>
        </Alert.Content>
      </Alert>
    </div>
  );
}
