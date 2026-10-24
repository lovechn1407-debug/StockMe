import { useState, useEffect } from "react";
import { Tabs, Card, Chip, Alert, Button } from "@heroui/react";
import {
  LayoutDashboard,
  Boxes,
  Truck,
  Warehouse,
  FileSpreadsheet,
  AlertTriangle,
  AlertOctagon,
  PanelLeftClose,
  PanelLeftOpen,
  FileCheck2,
  Scan,
  Settings,
} from "lucide-react";
import { ref, onValue } from "firebase/database";
import { db } from "./lib/firebase";
import type {
  Batch,
  DeliveryChallan,
  FairPriceShop,
  FIFOException,
  AuditLog,
  CommodityType,
} from "./types";
import {
  autoSeedIfEmpty,
  forceResetDemoData,
  getInitialBatches,
  INITIAL_SHOPS,
  getInitialChallans,
  getInitialExceptions,
  getInitialAuditLogs,
  updateBatchStatus,
  logDriageAdjustment,
  getBatchAgeDays,
  getExpiryGapDays,
} from "./lib/db";
import {
  getStoredCommodities,
  saveStoredCommodities,
  getStoredOfficerName,
  saveStoredOfficerName,
  getStoredOfficerDesignation,
  saveStoredOfficerDesignation,
  getStoredGodownName,
  saveStoredGodownName,
} from "./lib/settings";
import { Header } from "./components/Header";
import { TabDashboard } from "./components/TabDashboard";
import { TabBatches } from "./components/TabBatches";
import { TabDispatch } from "./components/TabDispatch";
import { TabBays } from "./components/TabBays";
import { TabAudit } from "./components/TabAudit";
import { TabCriticalStock } from "./components/TabCriticalStock";
import { TabGeneratedChallans } from "./components/TabGeneratedChallans";
import { TabSettings } from "./components/TabSettings";
import { GatePassScanner } from "./components/GatePassScanner";
import { LoaderVerificationPortal } from "./components/LoaderVerificationPortal";

export default function App() {
  // Direct /scan URL route support
  const [isScannerRoute, setIsScannerRoute] = useState<boolean>(() => {
    return (
      window.location.pathname === "/scan" ||
      window.location.pathname.startsWith("/scan") ||
      window.location.hash === "#scan" ||
      new URLSearchParams(window.location.search).get("route") === "scan"
    );
  });

  // Direct /loader URL route support
  const [isLoaderRoute, setIsLoaderRoute] = useState<boolean>(() => {
    return (
      window.location.pathname === "/loader" ||
      window.location.pathname.startsWith("/loader") ||
      window.location.hash === "#loader" ||
      new URLSearchParams(window.location.search).get("route") === "loader"
    );
  });

  useEffect(() => {
    const handlePopState = () => {
      setIsScannerRoute(
        window.location.pathname === "/scan" ||
        window.location.pathname.startsWith("/scan") ||
        window.location.hash === "#scan" ||
        new URLSearchParams(window.location.search).get("route") === "scan"
      );
      setIsLoaderRoute(
        window.location.pathname === "/loader" ||
        window.location.pathname.startsWith("/loader") ||
        window.location.hash === "#loader" ||
        new URLSearchParams(window.location.search).get("route") === "loader"
      );
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleOpenScanner = () => {
    window.history.pushState({}, "", "/scan");
    setIsScannerRoute(true);
    setIsLoaderRoute(false);
  };

  const handleOpenLoader = () => {
    window.history.pushState({}, "", "/loader");
    setIsLoaderRoute(true);
    setIsScannerRoute(false);
  };

  const handleBackToDashboard = () => {
    window.history.pushState({}, "", "/");
    setIsScannerRoute(false);
    setIsLoaderRoute(false);
  };

  // Navigation State (Main Tabs)
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Sidebar expand/collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Environmental Simulator State (Monsoon Humidity)
  const [monsoonSimActive, setMonsoonSimActive] = useState<boolean>(false);

  // Selected Commodity for Quick Dispatch
  const [selectedCommodityForDispatch, setSelectedCommodityForDispatch] =
    useState<CommodityType>("Wheat");

  // Realtime Data State with immediate realistic defaults
  const [batches, setBatches] = useState<Batch[]>(() =>
    Object.values(getInitialBatches())
  );
  const [challans, setChallans] = useState<DeliveryChallan[]>(() =>
    Object.values(getInitialChallans())
  );
  const [shops, setShops] = useState<FairPriceShop[]>(INITIAL_SHOPS);
  const [exceptions, setExceptions] = useState<FIFOException[]>(() =>
    Object.values(getInitialExceptions())
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() =>
    Object.values(getInitialAuditLogs())
  );

  const [isResetting, setIsResetting] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  // 1. Auto-seed if empty and subscribe to live Firebase Realtime Database
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupDb = async () => {
      try {
        await autoSeedIfEmpty();

        const rootRef = ref(db, "foodstock_ipds");
        unsubscribe = onValue(
          rootRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const val = snapshot.val();

              if (val.batches) {
                setBatches(Object.values(val.batches));
              }
              if (val.challans) {
                setChallans(Object.values(val.challans));
              }
              if (val.fpsShops) {
                setShops(Object.values(val.fpsShops));
              }
              if (val.exceptions) {
                setExceptions(Object.values(val.exceptions));
              }
              if (val.auditLogs) {
                setAuditLogs(Object.values(val.auditLogs));
              }
            }
          },
          (err) => {
            console.warn("Firebase RTDB listener note:", err);
            setFirebaseError(err.message);
          }
        );
      } catch (err: any) {
        console.warn("Auto-seed error:", err);
      }
    };

    setupDb();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Critical Batches: Present to Expiry gap < 30 days (consistent with Inward Stock calculation)
  const criticalBatches = batches.filter((b) => {
    if (Number(b.remainingQty || 0) <= 0 || b.status === "Depleted") return false;
    const daysToExpiry = getExpiryGapDays(b.expiryDate);
    return daysToExpiry < 30;
  });

  // Pre-selected batch ID for manual override (from Dashboard or Bay Layout)
  const [preselectedBatchForDispatch, setPreselectedBatchForDispatch] = useState<string | null>(null);

  // Quick action from Dashboard or Bays to jump straight into Dispatch tab
  const handleSelectCommodityForDispatch = (commodity: CommodityType, batchId?: string) => {
    setSelectedCommodityForDispatch(commodity);
    if (batchId) {
      setPreselectedBatchForDispatch(batchId);
    }
    setActiveTab("dispatch");
  };

  // Immediate optimistic state update when a dispatch is executed
  const handleDispatchSuccess = (
    newChallan: DeliveryChallan,
    updatedBatches: Batch[],
    newException?: FIFOException
  ) => {
    // 1. Immediately update local batches so dashboard stock and bay layouts drop instantly!
    setBatches(updatedBatches);
    // 2. Prepend new challan so generated challans count increments and list shows it
    setChallans((prev) => [newChallan, ...prev.filter((c) => c.id !== newChallan.id)]);
    // 3. Prepend exception if override was approved
    if (newException) {
      setExceptions((prev) => [newException, ...prev]);
    }
    // 4. Prepend audit log
    const newLog: AuditLog = {
      id: `LOG-${Date.now()}`,
      action: newChallan.isFifoCompliant ? "DISPATCH_FIFO" : "DISPATCH_OVERRIDE",
      description: `Issued DC ${newChallan.challanNumber} to ${newChallan.fpsName} for ${newChallan.totalQuantity} Q ${newChallan.commodity}. ${
        newChallan.isFifoCompliant
          ? "Strict FIFO multi-batch compliant."
          : `FIFO Override: ${newException?.reason || "Manual batch override approved."}`
      }`,
      commodity: newChallan.commodity,
      quantity: newChallan.totalQuantity,
      performedBy: newException?.officerName || "Godown Dispatch Desk",
      timestamp: Date.now(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Reset Demo Data
  const handleResetDemoData = async () => {
    setIsResetting(true);
    try {
      await forceResetDemoData();
    } finally {
      setIsResetting(false);
    }
  };

  // Settings & Configuration State (Master Commodities & Godown Officer)
  const [commodities, setCommodities] = useState<string[]>(() => getStoredCommodities());
  const [officerName, setOfficerName] = useState<string>(() => getStoredOfficerName());
  const [officerDesignation, setOfficerDesignation] = useState<string>(() => getStoredOfficerDesignation());
  const [godownName, setGodownName] = useState<string>(() => getStoredGodownName());

  const handleAddCommodity = (newComm: string): boolean => {
    if (!newComm.trim()) return false;
    const trimmed = newComm.trim();
    if (commodities.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return false;
    const updated = [...commodities, trimmed];
    setCommodities(updated);
    saveStoredCommodities(updated);
    return true;
  };

  const handleDeleteCommodity = (commToDelete: string) => {
    const updated = commodities.filter(
      (c) => c.toLowerCase() !== commToDelete.toLowerCase()
    );
    setCommodities(updated);
    saveStoredCommodities(updated);
  };

  const handleUpdateOfficer = (
    name: string,
    designation: string,
    godown: string
  ) => {
    setOfficerName(name);
    setOfficerDesignation(designation);
    setGodownName(godown);
    saveStoredOfficerName(name);
    saveStoredOfficerDesignation(designation);
    saveStoredGodownName(godown);
  };

  // Standalone Gate Pass Scanner Route (/scan)
  if (isScannerRoute) {
    return (
      <GatePassScanner
        challans={challans}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  // Standalone Loader Verification Route (/loader)
  if (isLoaderRoute) {
    return (
      <LoaderVerificationPortal
        challans={challans}
        batches={batches}
        onBackToDashboard={handleBackToDashboard}
        onOpenGateScanner={handleOpenScanner}
      />
    );
  }

  return (
    <div className="h-screen max-h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col font-sans">
      {/* Top Header Bar */}
      <Header
        onResetDemo={handleResetDemoData}
        isResetting={isResetting}
        monsoonSimActive={monsoonSimActive}
        criticalBatchesCount={criticalBatches.length}
        onOpenCriticalTab={() => setActiveTab("critical")}
        officerName={officerName}
        onOpenSettingsTab={() => setActiveTab("settings")}
      />

      {/* Main Layout: Fixed Sidebar and Independent Scrollable Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as string)}
          orientation="vertical"
          className="flex-1 flex w-full h-full overflow-hidden min-h-0"
        >
          {/* Left Side Tab Menu (Fixed at Position, Never Scrolls with Page) */}
          <aside
            data-collapsed={isSidebarCollapsed ? "true" : undefined}
            className={`h-full max-h-full border-r border-border bg-surface flex flex-col shrink-0 overflow-y-auto select-none transition-all duration-200 sticky top-0 ${
              isSidebarCollapsed ? "w-16 sidebar-collapsed" : "w-64"
            }`}
          >
            {/* Collapse / Expand Toggle Button */}
            <div
              className={`p-3 border-b border-border flex items-center ${
                isSidebarCollapsed ? "justify-center" : "justify-between"
              }`}
            >
              {!isSidebarCollapsed && (
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Menu
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                onPress={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                aria-label={isSidebarCollapsed ? "Expand Tab Menu" : "Collapse Tab Menu"}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-foreground" />
                ) : (
                  <PanelLeftClose className="w-4 h-4 text-foreground" />
                )}
              </Button>
            </div>

            {/* HeroUI Tab List */}
            <Tabs.List className="flex flex-col w-full flex-1 p-0 gap-0 !rounded-none">
              {/* Tab 1: Dashboard Overview */}
              <Tabs.Tab
                id="dashboard"
                className={`w-full cursor-pointer transition-colors !rounded-none border-0 select-none ${
                  activeTab === "dashboard"
                    ? "!bg-blue-600 !text-white active-menu-tab"
                    : "hover:bg-muted/10 text-muted hover:text-foreground"
                } ${
                  isSidebarCollapsed
                    ? "h-12 !min-w-0 !p-0 flex items-center justify-center mx-auto"
                    : "flex items-center justify-between px-4 py-3 text-left"
                }`}
              >
                <div
                  className={`flex items-center ${
                    isSidebarCollapsed ? "justify-center w-full h-full" : "gap-3 min-w-0"
                  }`}
                  title="Dashboard Overview"
                >
                  <LayoutDashboard
                    className={`w-5 h-5 shrink-0 block m-auto ${
                      activeTab === "dashboard" ? "!text-white stroke-white" : ""
                    }`}
                  />
                  {!isSidebarCollapsed && (
                    <span
                      className={`text-xs truncate ${
                        activeTab === "dashboard" ? "!text-white font-bold" : "font-semibold text-foreground"
                      }`}
                    >
                      Dashboard Overview
                    </span>
                  )}
                </div>
              </Tabs.Tab>

              {/* Tab 2: Critical Stock */}
              <Tabs.Tab
                id="critical"
                className={`w-full cursor-pointer transition-colors !rounded-none border-0 select-none ${
                  activeTab === "critical"
                    ? "!bg-blue-600 !text-white active-menu-tab"
                    : criticalBatches.length > 0
                    ? "text-danger hover:bg-danger/10"
                    : "hover:bg-muted/10 text-muted hover:text-foreground"
                } ${
                  isSidebarCollapsed
                    ? "h-12 !min-w-0 !p-0 flex items-center justify-center mx-auto"
                    : "flex items-center justify-between px-4 py-3 text-left"
                }`}
              >
                <div
                  className={`flex items-center ${
                    isSidebarCollapsed ? "justify-center w-full h-full relative" : "gap-3 min-w-0"
                  }`}
                  title="Critical Stock & Reallocation"
                >
                  <AlertOctagon
                    className={`w-5 h-5 shrink-0 block m-auto ${
                      activeTab === "critical"
                        ? "!text-white stroke-white"
                        : criticalBatches.length > 0
                        ? "animate-pulse text-danger"
                        : ""
                    }`}
                  />
                  {!isSidebarCollapsed && (
                    <span
                      className={`text-xs truncate ${
                        activeTab === "critical"
                          ? "!text-white font-bold"
                          : criticalBatches.length > 0
                          ? "text-danger font-bold"
                          : "font-semibold text-foreground"
                      }`}
                    >
                      Critical Stock
                    </span>
                  )}
                  {isSidebarCollapsed && criticalBatches.length > 0 && activeTab !== "critical" && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger ring-2 ring-surface" />
                  )}
                </div>
                {!isSidebarCollapsed && criticalBatches.length > 0 && (
                  <Chip
                    size="sm"
                    variant={activeTab === "critical" ? "primary" : "primary"}
                    color="danger"
                    className={`text-[10px] font-bold ${
                      activeTab === "critical" ? "!bg-white/20 !text-white border-0" : ""
                    }`}
                  >
                    {criticalBatches.length}
                  </Chip>
                )}
              </Tabs.Tab>

              {/* Tab 3: Inward Stock & Batches */}
              <Tabs.Tab
                id="batches"
                className={`w-full cursor-pointer transition-colors !rounded-none border-0 select-none ${
                  activeTab === "batches"
                    ? "!bg-blue-600 !text-white active-menu-tab"
                    : "hover:bg-muted/10 text-muted hover:text-foreground"
                } ${
                  isSidebarCollapsed
                    ? "h-12 !min-w-0 !p-0 flex items-center justify-center mx-auto"
                    : "flex items-center justify-between px-4 py-3 text-left"
                }`}
              >
                <div
                  className={`flex items-center ${
                    isSidebarCollapsed ? "justify-center w-full h-full" : "gap-3 min-w-0"
                  }`}
                  title="Inward Stock & Batches"
                >
                  <Boxes
                    className={`w-5 h-5 shrink-0 block m-auto ${
                      activeTab === "batches" ? "!text-white stroke-white" : ""
                    }`}
                  />
                  {!isSidebarCollapsed && (
                    <span
                      className={`text-xs truncate ${
                        activeTab === "batches" ? "!text-white font-bold" : "font-semibold text-foreground"
                      }`}
                    >
                      Inward Stock &amp; Batches
                    </span>
                  )}
                </div>
                {!isSidebarCollapsed && (
                  <Chip
                    size="sm"
                    variant="soft"
                    color="default"
                    className={`text-[10px] ${
                      activeTab === "batches" ? "!bg-white/20 !text-white border-0 font-bold" : ""
                    }`}
                  >
                    {batches.filter((b) => Number(b.remainingQty || 0) > 0 && b.status !== "Depleted").length}
                  </Chip>
                )}
              </Tabs.Tab>

              {/* Tab 4: Dispatch (Smart FIFO) */}
              <Tabs.Tab
                id="dispatch"
                className={`w-full cursor-pointer transition-colors !rounded-none border-0 select-none ${
                  activeTab === "dispatch"
                    ? "!bg-blue-600 !text-white active-menu-tab"
                    : "hover:bg-muted/10 text-muted hover:text-foreground"
                } ${
                  isSidebarCollapsed
                    ? "h-12 !min-w-0 !p-0 flex items-center justify-center mx-auto"
                    : "flex items-center justify-between px-4 py-3 text-left"
                }`}
              >
                <div
                  className={`flex items-center ${
                    isSidebarCollapsed ? "justify-center w-full h-full" : "gap-3 min-w-0"
                  }`}
                  title="Dispatch (Smart FIFO)"
                >
                  <Truck
                    className={`w-5 h-5 shrink-0 block m-auto ${
                      activeTab === "dispatch" ? "!text-white stroke-white" : "text-primary"
                    }`}
                  />
                  {!isSidebarCollapsed && (
                    <span
                      className={`text-xs truncate ${
                        activeTab === "dispatch" ? "!text-white font-bold" : "font-semibold text-primary"
                      }`}
                    >
                      Dispatch (FIFO)
                    </span>
                  )}
                </div>
                {!isSidebarCollapsed && (
                  <Chip
                    size="sm"
                    variant="soft"
                    color="accent"
                    className={`text-[10px] ${
                      activeTab === "dispatch" ? "!bg-white/20 !text-white border-0 font-bold" : ""
                    }`}
                  >
                    Auto-Split
                  </Chip>
                )}
              </Tabs.Tab>

              {/* Tab 5: Generated Challans */}
              <Tabs.Tab
                id="challans"
                className={`w-full cursor-pointer transition-colors !rounded-none border-0 select-none ${
                  activeTab === "challans"
                    ? "!bg-blue-600 !text-white active-menu-tab"
                    : "hover:bg-muted/10 text-muted hover:text-foreground"
                } ${
                  isSidebarCollapsed
                    ? "h-12 !min-w-0 !p-0 flex items-center justify-center mx-auto"
                    : "flex items-center justify-between px-4 py-3 text-left"
                }`}
              >
                <div
                  className={`flex items-center ${
                    isSidebarCollapsed ? "justify-center w-full h-full" : "gap-3 min-w-0"
                  }`}
                  title="Generated Challans"
                >
                  <FileCheck2
                    className={`w-5 h-5 shrink-0 block m-auto ${
                      activeTab === "challans" ? "!text-white stroke-white" : ""
                    }`}
                  />
                  {!isSidebarCollapsed && (
                    <span
                      className={`text-xs truncate ${
                        activeTab === "challans" ? "!text-white font-bold" : "font-semibold text-foreground"
                      }`}
                    >
                      Generated Challans
                    </span>
                  )}
                </div>
                {!isSidebarCollapsed && (
                  <Chip
                    size="sm"
                    variant="soft"
                    color="default"
                    className={`text-[10px] font-bold ${
                      activeTab === "challans" ? "!bg-white/20 !text-white border-0" : ""
                    }`}
                  >
                    {challans.length}
                  </Chip>
                )}
              </Tabs.Tab>

              {/* Tab 6: Godown Bay Layout */}
              <Tabs.Tab
                id="bays"
                className={`w-full cursor-pointer transition-colors !rounded-none border-0 select-none ${
                  activeTab === "bays"
                    ? "!bg-blue-600 !text-white active-menu-tab"
                    : "hover:bg-muted/10 text-muted hover:text-foreground"
                } ${
                  isSidebarCollapsed
                    ? "h-12 !min-w-0 !p-0 flex items-center justify-center mx-auto"
                    : "flex items-center justify-between px-4 py-3 text-left"
                }`}
              >
                <div
                  className={`flex items-center ${
                    isSidebarCollapsed ? "justify-center w-full h-full" : "gap-3 min-w-0"
                  }`}
                  title="Godown Bay Layout"
                >
                  <Warehouse
                    className={`w-5 h-5 shrink-0 block m-auto ${
                      activeTab === "bays" ? "!text-white stroke-white" : ""
                    }`}
                  />
                  {!isSidebarCollapsed && (
                    <span
                      className={`text-xs truncate ${
                        activeTab === "bays" ? "!text-white font-bold" : "font-semibold text-foreground"
                      }`}
                    >
                      Godown Bay Layout
                    </span>
                  )}
                </div>
                {!isSidebarCollapsed && (
                  <Chip
                    size="sm"
                    variant="soft"
                    color="default"
                    className={`text-[10px] ${
                      activeTab === "bays" ? "!bg-white/20 !text-white border-0 font-bold" : ""
                    }`}
                  >
                    12 Bays
                  </Chip>
                )}
              </Tabs.Tab>

              {/* Tab 7: Traceability & Audit */}
              <Tabs.Tab
                id="audit"
                className={`w-full cursor-pointer transition-colors !rounded-none border-0 select-none ${
                  activeTab === "audit"
                    ? "!bg-blue-600 !text-white active-menu-tab"
                    : "hover:bg-muted/10 text-muted hover:text-foreground"
                } ${
                  isSidebarCollapsed
                    ? "h-12 !min-w-0 !p-0 flex items-center justify-center mx-auto"
                    : "flex items-center justify-between px-4 py-3 text-left"
                }`}
              >
                <div
                  className={`flex items-center ${
                    isSidebarCollapsed ? "justify-center w-full h-full" : "gap-3 min-w-0"
                  }`}
                  title="Traceability & Audit"
                >
                  <FileSpreadsheet
                    className={`w-5 h-5 shrink-0 block m-auto ${
                      activeTab === "audit" ? "!text-white stroke-white" : ""
                    }`}
                  />
                  {!isSidebarCollapsed && (
                    <span
                      className={`text-xs truncate ${
                        activeTab === "audit" ? "!text-white font-bold" : "font-semibold text-foreground"
                      }`}
                    >
                      Traceability &amp; Audit
                    </span>
                  )}
                </div>
              </Tabs.Tab>

              {/* Tab 8: System Settings */}
              <Tabs.Tab
                id="settings"
                className={`w-full cursor-pointer transition-colors !rounded-none border-0 select-none ${
                  activeTab === "settings"
                    ? "!bg-blue-600 !text-white active-menu-tab"
                    : "hover:bg-muted/10 text-muted hover:text-foreground"
                } ${
                  isSidebarCollapsed
                    ? "h-12 !min-w-0 !p-0 flex items-center justify-center mx-auto"
                    : "flex items-center justify-between px-4 py-3 text-left"
                }`}
              >
                <div
                  className={`flex items-center ${
                    isSidebarCollapsed ? "justify-center w-full h-full" : "gap-3 min-w-0"
                  }`}
                  title="System Settings"
                >
                  <Settings
                    className={`w-5 h-5 shrink-0 block m-auto ${
                      activeTab === "settings" ? "!text-white stroke-white" : ""
                    }`}
                  />
                  {!isSidebarCollapsed && (
                    <span
                      className={`text-xs truncate ${
                        activeTab === "settings" ? "!text-white font-bold" : "font-semibold text-foreground"
                      }`}
                    >
                      System Settings
                    </span>
                  )}
                </div>
              </Tabs.Tab>
            </Tabs.List>
          </aside>

          {/* Right Side: Main Panels Content */}
          <main className="flex-1 min-w-0 p-6 overflow-y-auto space-y-6">
            {firebaseError && (
              <Alert status="warning">
                <Alert.Indicator>
                  <AlertTriangle className="w-4 h-4 text-warning" />
                </Alert.Indicator>
                <Alert.Content>
                  <Alert.Title className="text-xs font-bold">Network Connection Note</Alert.Title>
                  <Alert.Description className="text-xs">
                    {firebaseError}. Using offline high-speed buffer memory.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            {/* TAB 1: Dashboard Overview */}
            <Tabs.Panel id="dashboard">
              <TabDashboard
                batches={batches}
                challans={challans}
                onSelectCommodityForDispatch={handleSelectCommodityForDispatch}
                monsoonSimActive={monsoonSimActive}
                setMonsoonSimActive={setMonsoonSimActive}
                onOpenCriticalTab={() => setActiveTab("critical")}
                commodities={commodities}
              />
            </Tabs.Panel>

            {/* TAB 2: Critical Stock & Inter-Godown Reallocation */}
            <Tabs.Panel id="critical">
              <TabCriticalStock
                batches={batches}
                onSelectCommodityForDispatch={handleSelectCommodityForDispatch}
              />
            </Tabs.Panel>

            {/* TAB 3: Inward Stock & Batches */}
            <Tabs.Panel id="batches">
              <TabBatches
                batches={batches}
                onToggleStatus={updateBatchStatus}
                onLogDriage={logDriageAdjustment}
                commodities={commodities}
              />
            </Tabs.Panel>

            {/* TAB 4: Dispatch & Delivery Challan (Smart FIFO Engine) */}
            <Tabs.Panel id="dispatch">
              <TabDispatch
                batches={batches}
                shops={shops}
                selectedCommodity={selectedCommodityForDispatch}
                setSelectedCommodity={setSelectedCommodityForDispatch}
                preselectedBatchId={preselectedBatchForDispatch}
                onClearPreselectedBatch={() => setPreselectedBatchForDispatch(null)}
                onDispatchSuccess={handleDispatchSuccess}
                commodities={commodities}
                officerName={officerName}
              />
            </Tabs.Panel>

            {/* TAB 5: Generated Challans */}
            <Tabs.Panel id="challans">
              <TabGeneratedChallans
                challans={challans}
                onOpenScanner={handleOpenScanner}
                commodities={commodities}
                officerName={officerName}
              />
            </Tabs.Panel>

            {/* TAB 6: Godown Bay Layout */}
            <Tabs.Panel id="bays">
              <TabBays
                batches={batches}
                onSelectCommodityForDispatch={handleSelectCommodityForDispatch}
                onToggleStatus={updateBatchStatus}
                onLogDriage={logDriageAdjustment}
              />
            </Tabs.Panel>

            {/* TAB 7: Traceability & Audit History */}
            <Tabs.Panel id="audit">
              <TabAudit
                batches={batches}
                challans={challans}
                shops={shops}
                exceptions={exceptions}
                auditLogs={auditLogs}
              />
            </Tabs.Panel>

            {/* TAB 8: Settings & Master Configuration */}
            <Tabs.Panel id="settings">
              <TabSettings
                batches={batches}
                commodities={commodities}
                onAddCommodity={handleAddCommodity}
                onDeleteCommodity={handleDeleteCommodity}
                officerName={officerName}
                onUpdateOfficer={handleUpdateOfficer}
                officerDesignation={officerDesignation}
                godownName={godownName}
              />
            </Tabs.Panel>
          </main>
        </Tabs>
      </div>

      {/* Fixed Slim Bottom Status Footer */}
      <footer className="border-t border-border bg-surface py-2 text-[11px] text-muted text-center shrink-0 z-30">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-between gap-2">
          <span>
            FoodStock • iPDS Godown Smart Allocation &amp; FIFO Compliance System
          </span>
          <span>
            Ministry of Consumer Affairs, Food &amp; Public Distribution • Govt of India
          </span>
        </div>
      </footer>
    </div>
  );
}
