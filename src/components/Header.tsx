import { Button, Chip, Separator } from "@heroui/react";
import { RotateCcw, Database, ThermometerSun, ShieldCheck, Warehouse, AlertOctagon, UserCheck } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  onResetDemo: () => Promise<void>;
  isResetting: boolean;
  monsoonSimActive: boolean;
  criticalBatchesCount?: number;
  onOpenCriticalTab?: () => void;
  officerName?: string;
  onOpenSettingsTab?: () => void;
}

export function Header({
  onResetDemo,
  isResetting,
  monsoonSimActive,
  criticalBatchesCount = 0,
  onOpenCriticalTab,
  officerName,
  onOpenSettingsTab,
}: HeaderProps) {
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleReset = async () => {
    await onResetDemo();
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3000);
  };

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-40 h-16 shrink-0">
      <div className="w-full h-full px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Left: Branding & iPDS badge */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
            <Warehouse className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
                FoodStock
              </h1>
              <Chip size="sm" color="accent" variant="soft" className="text-[10px] hidden sm:inline-flex">
                iPDS Godown FIFO
              </Chip>
            </div>
            <p className="text-[11px] text-muted truncate hidden sm:block">
              Department of Food &amp; Public Distribution • State Buffer Godown Unit-4
            </p>
          </div>
        </div>

        {/* Right: Environmental chips & Actions (strictly single row, no wrapping) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Live Firebase Sync Chip */}
          <Chip
            size="sm"
            color="success"
            variant="soft"
            className="flex items-center gap-1"
          >
            <Database className="w-3.5 h-3.5 inline mr-1 text-success shrink-0" />
            <span className="hidden sm:inline">Firebase Realtime Live</span>
            <span className="sm:hidden">Live</span>
          </Chip>

          {/* Godown Humidity & Temp Chip */}
          <Chip
            size="sm"
            color={monsoonSimActive ? "warning" : "default"}
            variant="soft"
            className="hidden md:inline-flex"
          >
            <ThermometerSun className="w-3.5 h-3.5 inline mr-1 shrink-0" />
            <span>{monsoonSimActive ? "31°C | 84% RH" : "28°C | 58% RH"}</span>
            <span className="hidden xl:inline">{monsoonSimActive ? " (Monsoon)" : " (Optimal)"}</span>
          </Chip>

          {/* Active Godown Officer Chip */}
          {officerName && (
            <Chip
              size="sm"
              color="accent"
              variant="soft"
              className="hidden xl:inline-flex cursor-pointer transition-opacity hover:opacity-80"
              onClick={onOpenSettingsTab}
              title={`Active Authorized Officer: ${officerName} — Click to manage in Settings`}
            >
              <UserCheck className="w-3.5 h-3.5 inline mr-1 text-accent shrink-0" />
              <span>Officer: <strong>{officerName}</strong></span>
            </Chip>
          )}

          {/* Critical Stock Alert Icon Button */}
          <button
            type="button"
            onClick={onOpenCriticalTab}
            title={
              criticalBatchesCount > 0
                ? `${criticalBatchesCount} Critical Batches require urgent action — Click to open Critical Stock Info Tab`
                : "Critical Stock Monitor — Click to view Critical Info Tab"
            }
            className={`relative inline-flex items-center justify-center p-2 rounded-lg border transition-all cursor-pointer shadow-xs hover:scale-105 shrink-0 ${
              criticalBatchesCount > 0
                ? "bg-danger/10 hover:bg-danger/20 text-danger border-danger/30"
                : "bg-surface hover:bg-muted/10 text-muted border-border"
            }`}
            aria-label="Critical Stock Alerts"
          >
            <AlertOctagon
              className={`w-4 h-4 ${criticalBatchesCount > 0 ? "text-danger animate-pulse" : "text-muted"}`}
            />
            {criticalBatchesCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-danger text-white text-[10px] font-black rounded-full h-4.5 min-w-4.5 px-1 flex items-center justify-center shadow-md animate-bounce ring-2 ring-surface">
                {criticalBatchesCount}
              </span>
            )}
          </button>

          <Separator orientation="vertical" className="h-5 hidden sm:block" />



          {/* Reset Demo Data Button */}
          <Button
            variant="secondary"
            size="sm"
            onPress={handleReset}
            isDisabled={isResetting}
            className="font-medium text-xs shrink-0"
          >
            <RotateCcw className={`w-3.5 h-3.5 sm:mr-1.5 ${isResetting ? "animate-spin" : ""}`} />
            <span className="hidden lg:inline">
              {isResetting ? "Resetting..." : resetSuccess ? "Demo Data Reset!" : "Reset Demo Data"}
            </span>
            <span className="lg:hidden">
              {isResetting ? "..." : resetSuccess ? "Reset" : "Reset"}
            </span>
          </Button>

          {/* Official Seal / Compliance Chip */}
          <Chip size="sm" color="default" variant="soft" className="hidden 2xl:inline-flex shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-primary" />
            FIFO Mandate: Active
          </Chip>
        </div>
      </div>
    </header>
  );
}
