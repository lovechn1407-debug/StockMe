import { useState, useEffect, useRef, useMemo } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Card,
  Button,
  Chip,
  Label,
  Modal,
} from "@heroui/react";
import {
  Scan,
  Camera,
  CameraOff,
  SwitchCamera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Truck,
  ArrowLeft,
  RefreshCw,
  Search,
  ExternalLink,
  Volume2,
  VolumeX,
  QrCode,
  Building2,
  Boxes,
  Check,
  CheckSquare,
  Sparkles,
  Info,
  Hash,
} from "lucide-react";
import type { DeliveryChallan, Batch } from "../types";
import { updateChallanLoadingStatus } from "../lib/db";
import { ChallanModal } from "./ChallanModal";

interface LoaderVerificationPortalProps {
  challans: DeliveryChallan[];
  batches: Batch[];
  onBackToDashboard: () => void;
  onOpenGateScanner?: () => void;
}

interface ScannedSackEvent {
  id: string;
  sackId: string;       // e.g. "BATCH-WHT-101_001"
  batchId: string;      // e.g. "BATCH-WHT-101"
  serialNumber: string; // e.g. "001"
  bayLocation: string;  // e.g. "BAY-01"
  timestamp: number;
}

export function LoaderVerificationPortal({
  challans,
  batches,
  onBackToDashboard,
  onOpenGateScanner,
}: LoaderVerificationPortalProps) {
  // Navigation / Tab states
  const [activeTab, setActiveTab] = useState<"camera" | "manual" | "upload">("camera");
  const [scannerStarted, setScannerStarted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [manualCode, setManualCode] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Active Challan state
  const [activeChallan, setActiveChallan] = useState<DeliveryChallan | null>(null);
  const [viewingChallanModal, setViewingChallanModal] = useState<DeliveryChallan | null>(null);

  // Scanned sacks state: unique sacks verified for the active challan
  const [scannedSacks, setScannedSacks] = useState<ScannedSackEvent[]>([]);

  // Scan Alert Feedback
  const [feedback, setFeedback] = useState<{
    type: "SUCCESS" | "DUPLICATE" | "WRONG_BATCH" | "OVER_QUOTA" | "LOCKED_STACK" | "INVALID_FORMAT" | "INFO";
    title: string;
    message: string;
    scannedRaw?: string;
  } | null>(null);

  // Sign-off Modal state
  const [isSignOffModalOpen, setIsSignOffModalOpen] = useState(false);
  const [supervisorName, setSupervisorName] = useState("Ramu - Loader Gang 2");
  const [isSubmittingSignOff, setIsSubmittingSignOff] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Active Challans that are pending or in progress
  const pendingLoadingChallans = useMemo(() => {
    return challans.filter((c) => c.loadingStatus !== "LOADED");
  }, [challans]);

  // Derived set of all unique sack IDs already scanned for active challan
  const scannedSackIds = useMemo(() => {
    return scannedSacks.map((s) => s.sackId.toUpperCase());
  }, [scannedSacks]);

  // Verified bags tally per batch (strictly derived from unique valid sack scans)
  const verifiedBags = useMemo(() => {
    const map: Record<string, number> = {};
    if (activeChallan) {
      activeChallan.batches.forEach((b) => {
        map[b.batchId] = 0;
      });
    }
    scannedSacks.forEach((s) => {
      map[s.batchId] = (map[s.batchId] || 0) + 1;
    });
    return map;
  }, [activeChallan, scannedSacks]);

  // Total required bags across all batches in active challan
  const totalRequiredBags = useMemo(() => {
    if (!activeChallan) return 0;
    return Math.round(activeChallan.totalQuantity * 2);
  }, [activeChallan]);

  // Total currently verified bags
  const totalVerifiedBags = useMemo(() => {
    return scannedSacks.length;
  }, [scannedSacks]);

  // Is active challan 100% loaded?
  const isFullyLoaded = totalRequiredBags > 0 && totalVerifiedBags >= totalRequiredBags;

  // Audio synthesizer helper (Web Audio API)
  const playSound = (type: "success" | "error" | "warning") => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "success") {
        // High double chime
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08); // A5
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.28);
      } else if (type === "warning") {
        // Low chirp
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else {
        // Loud error buzzer (sawtooth wave)
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(160, audioCtx.currentTime);
        osc.frequency.setValueAtTime(110, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.45);
      }
    } catch {
      // Audio not supported or blocked
    }
  };

  // Safe scanner cleanup
  const stopAndClearScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn("Scanner cleanup note:", e);
      }
      html5QrCodeRef.current = null;
      setScannerStarted(false);
    }
  };

  // Camera initialization with container safety
  const startCamera = async (mode: "environment" | "user" = facingMode) => {
    setCameraError(null);
    try {
      await stopAndClearScanner();

      const containerId = "loader-qr-reader";
      const container = document.getElementById(containerId);
      if (!container) {
        setTimeout(() => startCamera(mode), 150);
        return;
      }

      // Explicitly disable native BarcodeDetector to avoid browser crashes and undefined errors
      const scanner = new Html5Qrcode(containerId, {
        verbose: false,
        useBarCodeDetectorIfSupported: false,
      });
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: mode },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          processDecodedText(decodedText);
        },
        () => {
          // ignore scan frame errors
        }
      );

      setScannerStarted(true);
    } catch (err: any) {
      console.warn("Camera start note:", err);
      const isDenied =
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError" ||
        err?.message?.toLowerCase().includes("permission");

      if (isDenied) {
        setCameraError(
          "Camera permission denied. Please allow camera access in browser settings or use manual input."
        );
      } else {
        setCameraError(err?.message || "Camera access requires HTTPS or localhost.");
      }
      setScannerStarted(false);
    }
  };

  // Request Camera Permission via direct user gesture
  const requestCameraPermission = async (mode: "environment" | "user" = facingMode) => {
    setCameraError(null);
    setIsRequestingPermission(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("mediaDevices API not supported.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode === "environment" ? { ideal: "environment" } : "user" },
      });
      stream.getTracks().forEach((t) => t.stop());

      await startCamera(mode);
    } catch (err: any) {
      setCameraError(err?.message || "Camera access was denied.");
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // Toggle Camera Facing Mode
  const handleToggleFacingMode = async () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    if (scannerStarted) {
      await startCamera(nextMode);
    }
  };

  // Select Challan and load stored sack history
  const handleSelectChallan = async (c: DeliveryChallan) => {
    await stopAndClearScanner();
    setActiveChallan(c);

    // Load persisted scanned sacks for this challan
    try {
      const saved = localStorage.getItem(`stockme_loader_sacks_${c.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setScannedSacks(parsed);
        } else {
          setScannedSacks([]);
        }
      } else if (c.verifiedBagsByBatch) {
        // If DB has bag tallies but no raw sack list, seed initial serials
        const generatedSacks: ScannedSackEvent[] = [];
        Object.entries(c.verifiedBagsByBatch).forEach(([batchId, count]) => {
          const item = c.batches.find((b) => b.batchId === batchId);
          for (let i = 1; i <= count; i++) {
            const pad = String(i).padStart(3, "0");
            generatedSacks.push({
              id: `SEEDED-${batchId}-${pad}`,
              sackId: `${batchId}_${pad}`,
              batchId,
              serialNumber: pad,
              bayLocation: item?.bayLocation || "BAY-01",
              timestamp: Date.now() - (count - i) * 10000,
            });
          }
        });
        setScannedSacks(generatedSacks);
      } else {
        setScannedSacks([]);
      }
    } catch {
      setScannedSacks([]);
    }

    setFeedback({
      type: "INFO",
      title: "Challan Loaded Successfully",
      message: `Consignment for ${c.fpsName} ready for sack verification. Sacks must be scanned using unique QR code "BATCHID_Serialnumber". Authorized batches: ${c.batches.map((b) => b.batchId).join(", ")}.`,
    });

    if (activeTab === "camera") {
      setTimeout(() => startCamera(facingMode), 200);
    }
  };

  // Persist scanned sacks to localStorage whenever updated
  useEffect(() => {
    if (activeChallan) {
      try {
        localStorage.setItem(
          `stockme_loader_sacks_${activeChallan.id}`,
          JSON.stringify(scannedSacks)
        );
      } catch (e) {
        console.warn("Storage save note:", e);
      }
    }
  }, [scannedSacks, activeChallan]);

  // Switch challan back
  const handleSwitchChallan = async () => {
    await stopAndClearScanner();
    setActiveChallan(null);
    setScannedSacks([]);
    setFeedback(null);
    if (activeTab === "camera") {
      setTimeout(() => startCamera(facingMode), 200);
    }
  };

  // Process any scanned text (Challan QR or Sack QR)
  const processDecodedText = (decodedText: string) => {
    const raw = decodedText.trim();
    if (!raw) return;

    // SCENARIO 1: No Challan Selected Yet -> Look up Challan
    if (!activeChallan) {
      lookupAndSelectChallan(raw);
      return;
    }

    // SCENARIO 2: Challan Active -> Decode Sack QR in "BATCHID_Serialnumber" format
    verifyScannedSack(raw);
  };

  // Lookup Challan by QR / ID / Number
  const lookupAndSelectChallan = (raw: string) => {
    let targetChallanNo = raw;
    let targetQrId = "";

    try {
      const parsed = JSON.parse(raw);
      if (parsed.qrId) targetQrId = String(parsed.qrId).trim();
      if (parsed.challanNo) targetChallanNo = String(parsed.challanNo).trim();
      else if (parsed.dc) targetChallanNo = String(parsed.dc).trim();
      else if (parsed.id) targetChallanNo = String(parsed.id).trim();
    } catch {
      const qrMatch = raw.match(/QR[- ]?([A-Za-z0-9-]+)/i);
      if (qrMatch) targetQrId = `QR-${qrMatch[1]}`;
      const challanMatch = raw.match(/(?:DC|CHL|TRCHL)-\d{4}-\d+/i);
      if (challanMatch) targetChallanNo = challanMatch[0];
    }

    const cleanRaw = raw.toLowerCase();
    const cleanChallan = targetChallanNo.toLowerCase();
    const cleanQr = targetQrId.toLowerCase();
    const rawDigits = raw.replace(/\D/g, "");

    const found = challans.find((c) => {
      const cQr = (c.qrId || `QR-${c.challanNumber.replace(/\D/g, "")}`).toLowerCase();
      const cQrDigits = cQr.replace(/\D/g, "");
      const cChallan = c.challanNumber.toLowerCase();
      const cId = c.id.toLowerCase();
      const cDigits = c.challanNumber.replace(/\D/g, "");

      if (cleanQr && (cQr === cleanQr || cQr.includes(cleanQr) || cleanQr.includes(cQr))) {
        return true;
      }
      if (cleanChallan && (cChallan === cleanChallan || cId === cleanChallan || cChallan.includes(cleanChallan))) {
        return true;
      }
      if (cleanRaw && (cQr === cleanRaw || cChallan === cleanRaw || cId === cleanRaw)) {
        return true;
      }
      if (rawDigits.length >= 3) {
        if (
          cDigits === rawDigits ||
          cDigits.endsWith(rawDigits) ||
          cQrDigits === rawDigits ||
          cQrDigits.endsWith(rawDigits)
        ) {
          return true;
        }
      }
      return false;
    });

    if (found) {
      playSound("success");
      handleSelectChallan(found);
    } else {
      playSound("error");
      setFeedback({
        type: "WRONG_BATCH",
        title: "Challan Not Found",
        message: `No active delivery challan matches scanned code "${raw}". Please scan the QR code printed on Form PDS-DC-04 or enter a valid Challan / QR ID.`,
        scannedRaw: raw,
      });
    }
  };

  // Verify scanned individual sack in "BATCHID_Serialnumber" format
  const verifyScannedSack = (raw: string) => {
    if (!activeChallan) return;

    let rawSackId = raw.trim();
    let scannedBatchId = "";
    let scannedSerial = "";

    // 1. Try parsing JSON payload if present
    try {
      const parsed = JSON.parse(rawSackId);
      if (parsed.sackId) rawSackId = String(parsed.sackId).trim();
      else if (parsed.qrId) rawSackId = String(parsed.qrId).trim();
      else if (parsed.id) rawSackId = String(parsed.id).trim();

      if (parsed.batchId) scannedBatchId = String(parsed.batchId).trim().toUpperCase();
      if (parsed.serial || parsed.serialNumber) scannedSerial = String(parsed.serial || parsed.serialNumber).trim();
    } catch {
      // not JSON, continue with raw string
    }

    // Check if user scanned another Challan QR while in active consignment
    const isAnotherChallan = challans.some(
      (c) =>
        c.challanNumber.toLowerCase() === rawSackId.toLowerCase() ||
        (c.qrId && c.qrId.toLowerCase() === rawSackId.toLowerCase())
    );
    if (isAnotherChallan) {
      lookupAndSelectChallan(rawSackId);
      return;
    }

    // 2. Parse "BATCHID_Serialnumber"
    const underscoreIndex = rawSackId.lastIndexOf("_");
    if (underscoreIndex > 0) {
      scannedBatchId = rawSackId.substring(0, underscoreIndex).trim().toUpperCase();
      scannedSerial = rawSackId.substring(underscoreIndex + 1).trim();
    } else {
      // If user scanned something without an underscore (e.g. raw BATCH-WHT-101):
      const matchedAllocated = activeChallan.batches.find(
        (b) => b.batchId.toUpperCase() === rawSackId.toUpperCase()
      );
      if (matchedAllocated) {
        playSound("error");
        setFeedback({
          type: "INVALID_FORMAT",
          title: "INDIVIDUAL SACK QR REQUIRED",
          message: `Scanned code "${rawSackId}" is a Stack Card ID. To prevent unverified loading, physical sacks must each carry a serialized QR code formatted as "BATCHID_Serialnumber" (e.g. "${rawSackId}_001"). Please scan the individual sack label.`,
          scannedRaw: rawSackId,
        });
        return;
      }

      playSound("error");
      setFeedback({
        type: "INVALID_FORMAT",
        title: "UNRECOGNIZED SACK QR FORMAT",
        message: `Scanned code "${rawSackId}" is invalid. Every grain sack must carry a unique QR code formatted as "BATCHID_Serialnumber" (e.g. "${activeChallan.batches[0]?.batchId || "BATCH-WHT-101"}_001").`,
        scannedRaw: rawSackId,
      });
      return;
    }

    const canonicalSackId = `${scannedBatchId}_${scannedSerial}`.toUpperCase();

    // ─── VALIDATION 1: DUPLICATE SACK DETECTION ───
    if (scannedSackIds.includes(canonicalSackId)) {
      playSound("error");
      if (navigator.vibrate) navigator.vibrate([250, 100, 250]);
      setFeedback({
        type: "DUPLICATE",
        title: "DUPLICATE SACK DETECTED — REJECTED!",
        message: `Sack QR [${canonicalSackId}] (Serial #${scannedSerial}) has ALREADY been scanned and loaded into this consignment! Every sack can only be loaded once. Double-loading this bag is strictly blocked.`,
        scannedRaw: canonicalSackId,
      });
      return;
    }

    // ─── VALIDATION 2: MULTI-BATCH MATCHING IN ACTIVE CHALLAN ───
    const allocatedBatch = activeChallan.batches.find(
      (b) => b.batchId.toUpperCase() === scannedBatchId.toUpperCase()
    );

    if (!allocatedBatch) {
      playSound("error");
      if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
      const foundInDepot = batches.find((b) => b.id.toUpperCase() === scannedBatchId.toUpperCase());
      const depotInfo = foundInDepot
        ? ` (${foundInDepot.commodity} at ${foundInDepot.bayLocation})`
        : "";

      setFeedback({
        type: "WRONG_BATCH",
        title: "WRONG BATCH SACK REJECTED!",
        message: `Sack [${canonicalSackId}] belongs to Batch [${scannedBatchId}]${depotInfo}, which is NOT authorized for Challan #${activeChallan.challanNumber}! Authorized batches for this truck: ${activeChallan.batches
          .map((b) => `${b.batchId} (${b.bayLocation})`)
          .join(", ")}.`,
        scannedRaw: canonicalSackId,
      });
      return;
    }

    // ─── VALIDATION 3: FUMIGATION / QUALITY LOCK ───
    const liveBatch = batches.find(
      (b) => b.id.toUpperCase() === allocatedBatch.batchId.toUpperCase()
    );
    if (
      liveBatch &&
      (liveBatch.status === "Under Fumigation" || liveBatch.status === "Quality Hold")
    ) {
      playSound("error");
      setFeedback({
        type: "LOCKED_STACK",
        title: "STACK LOCKED — DO NOT LOAD",
        message: `Stack [${allocatedBatch.batchId}] is currently marked as [${liveBatch.status}]. Emergency halt: Notify the Godown Quality Inspector immediately.`,
        scannedRaw: canonicalSackId,
      });
      return;
    }

    // ─── VALIDATION 4: SPECIFIC BATCH QUOTA CEILING ───
    const maxBagsForThisBatch = Math.round(allocatedBatch.dispatchedQty * 2);
    const currentBagsForThisBatch = verifiedBags[allocatedBatch.batchId] || 0;

    if (currentBagsForThisBatch >= maxBagsForThisBatch) {
      playSound("warning");
      setFeedback({
        type: "OVER_QUOTA",
        title: "BATCH QUOTA ALREADY FULFILLED!",
        message: `Batch [${allocatedBatch.batchId}] has already reached its full authorized quota of ${maxBagsForThisBatch} bags (${allocatedBatch.dispatchedQty} Q). Extra sacks from this stack are rejected.`,
        scannedRaw: canonicalSackId,
      });
      return;
    }

    // ─── VALIDATION 5: ACCEPT UNIQUE SACK ───
    const newEvent: ScannedSackEvent = {
      id: `SACK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sackId: canonicalSackId,
      batchId: allocatedBatch.batchId,
      serialNumber: scannedSerial,
      bayLocation: allocatedBatch.bayLocation,
      timestamp: Date.now(),
    };

    setScannedSacks((prev) => [newEvent, ...prev]);

    playSound("success");
    if (navigator.vibrate) navigator.vibrate(60);

    const newBatchTotal = currentBagsForThisBatch + 1;
    const isThisBatchComplete = newBatchTotal >= maxBagsForThisBatch;

    setFeedback({
      type: "SUCCESS",
      title: "Sack Verified & Loaded!",
      message: `Verified Sack #${scannedSerial} [${canonicalSackId}] from Stack ${allocatedBatch.batchId} (${allocatedBatch.bayLocation}). Batch Progress: ${newBatchTotal} / ${maxBagsForThisBatch} bags.${isThisBatchComplete ? " (Stack Quota Complete!)" : ""}`,
      scannedRaw: canonicalSackId,
    });

    // Auto-update loading status in database to IN_PROGRESS if pending
    if (activeChallan.loadingStatus === "PENDING") {
      updateChallanLoadingStatus(activeChallan.id, "IN_PROGRESS", supervisorName).catch(console.warn);
      activeChallan.loadingStatus = "IN_PROGRESS";
    }
  };

  // Handle Image File Upload Scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("loader-qr-reader", {
          verbose: false,
          useBarCodeDetectorIfSupported: false,
        });
      }
      const decoded = await html5QrCodeRef.current.scanFile(file, true);
      processDecodedText(decoded);
    } catch {
      playSound("error");
      setFeedback({
        type: "WRONG_BATCH",
        title: "Could Not Read QR Image",
        message: "No valid QR pattern found in uploaded image. Please ensure photo is clear and well-lit.",
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Submit Final Loading Sign-Off
  const handleConfirmSignOff = async () => {
    if (!activeChallan) return;
    setIsSubmittingSignOff(true);

    const supervisor = supervisorName.trim() || "Loader Lead";

    try {
      // 1. Immediately update local state optimistically
      activeChallan.loadingStatus = "LOADED";
      activeChallan.loadingSupervisor = supervisor;
      activeChallan.loadingCompletedTimestamp = Date.now();
      activeChallan.verifiedBagsByBatch = verifiedBags;

      // 2. Persist to database with timeout protection
      try {
        await Promise.race([
          updateChallanLoadingStatus(
            activeChallan.id,
            "LOADED",
            supervisor,
            verifiedBags
          ),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
      } catch (dbErr) {
        console.warn("DB update background note:", dbErr);
      }

      setIsSignOffModalOpen(false);
      playSound("success");
      setFeedback({
        type: "SUCCESS",
        title: "Consignment Loading Verified & Signed Off!",
        message: `Official loading certificate issued. Truck ${activeChallan.vehicleNumber || "consignee vehicle"} is authorized to proceed to Godown Exit Gate for security exit pass clearance.`,
      });
    } catch (err) {
      console.error("Sign-off error:", err);
      setIsSignOffModalOpen(false);
      setFeedback({
        type: "WRONG_BATCH",
        title: "Sign-Off Completed with Local Cache",
        message: "Loading recorded. Check connection for central server sync.",
      });
    } finally {
      setIsSubmittingSignOff(false);
    }
  };

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      stopAndClearScanner();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-20 lg:pb-8">
      {/* ─── Top Navigation Header ─── */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-3 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onPress={onBackToDashboard}
            className="text-slate-300 hover:text-white cursor-pointer px-2 sm:px-3 text-xs"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>

          <div className="h-5 w-px bg-slate-800" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-xs sm:text-sm md:text-base font-black tracking-tight text-white uppercase truncate">
                  Loader Verification
                </h1>
                <Chip size="sm" color="warning" variant="soft" className="font-bold text-[9px] sm:text-[10px] hidden sm:inline-flex">
                  Loading Dock
                </Chip>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate hidden md:block">
                ePDS Serialized Sack Verification • Loading Stage
              </p>
            </div>
          </div>
        </div>

        {/* Right utility buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onOpenGateScanner && (
            <Button
              variant="secondary"
              size="sm"
              onPress={onOpenGateScanner}
              className="text-xs font-semibold cursor-pointer border-slate-700 hidden lg:flex items-center"
            >
              <Scan className="w-3.5 h-3.5 mr-1" />
              Gate Scanner (/scan)
            </Button>
          )}

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={soundEnabled ? "Mute audio alarms" : "Enable audio alarms"}
            aria-label="Toggle sound alarms"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>
      </header>

      {/* ─── Main Content Container ─── */}
      <main className="flex-1 p-3 sm:p-4 md:p-6 max-w-6xl w-full mx-auto space-y-4 sm:space-y-6">
        {/* Visual / Audio Feedback Banner */}
        {feedback && (
          <div
            className={`p-3.5 sm:p-4 rounded-xl border flex items-start justify-between gap-3 shadow-lg animate-in fade-in zoom-in-95 duration-150 ${
              feedback.type === "SUCCESS"
                ? "bg-emerald-950/70 border-emerald-500/60 text-emerald-200"
                : feedback.type === "DUPLICATE"
                ? "bg-rose-950/90 border-rose-500/80 text-rose-100 ring-2 ring-rose-500/40"
                : feedback.type === "WRONG_BATCH" || feedback.type === "LOCKED_STACK"
                ? "bg-red-950/80 border-red-500/70 text-red-100 ring-2 ring-red-500/30"
                : feedback.type === "OVER_QUOTA"
                ? "bg-amber-950/70 border-amber-500/60 text-amber-200"
                : "bg-slate-900 border-slate-800 text-slate-200"
            }`}
          >
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className="mt-0.5 shrink-0">
                {feedback.type === "SUCCESS" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : feedback.type === "DUPLICATE" ? (
                  <ShieldAlert className="w-6 h-6 text-rose-400 animate-bounce" />
                ) : feedback.type === "WRONG_BATCH" || feedback.type === "LOCKED_STACK" ? (
                  <ShieldAlert className="w-6 h-6 text-red-400 animate-bounce" />
                ) : feedback.type === "OVER_QUOTA" ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                ) : (
                  <Info className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-xs sm:text-sm text-white uppercase tracking-wide">
                  {feedback.title}
                </h4>
                <p className="text-xs leading-relaxed opacity-95">{feedback.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* ─── CASE A: NO CHALLAN SELECTED ─── */}
        {!activeChallan ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
            {/* Left Scanner Column */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="p-4 sm:p-5 md:p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                    Step 1 of 2 • Scan Delivery Challan
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Scan Challan QR Code on Truck Pass
                  </h2>
                  <p className="text-xs text-slate-400">
                    Scan the QR Code printed on Form PDS-DC-04 to open authorized consignee details and batch quotas.
                  </p>
                </div>

                {/* Sub-tab selection */}
                <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("camera");
                      setTimeout(() => startCamera(facingMode), 200);
                    }}
                    className={`flex-1 py-2 font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeTab === "camera"
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Live Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("manual")}
                    className={`flex-1 py-2 font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeTab === "manual"
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Enter QR / Challan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("upload")}
                    className={`flex-1 py-2 font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeTab === "upload"
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </button>
                </div>

                {/* Live Camera View */}
                {activeTab === "camera" && (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[4/3] sm:aspect-video flex items-center justify-center w-full">
                    <div id="loader-qr-reader" className="w-full h-full" />

                    {/* Camera Control overlay */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
                      <button
                        type="button"
                        onClick={handleToggleFacingMode}
                        className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white backdrop-blur border border-slate-700 shadow-md cursor-pointer"
                        title="Switch camera"
                      >
                        <SwitchCamera className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => requestCameraPermission(facingMode)}
                        className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white backdrop-blur border border-slate-700 shadow-md cursor-pointer"
                        title="Retry camera"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${isRequestingPermission ? "animate-spin" : ""}`}
                        />
                      </button>
                    </div>

                    {cameraError && (
                      <div className="absolute inset-0 bg-slate-950/95 p-4 sm:p-6 flex flex-col items-center justify-center text-center space-y-2 sm:space-y-3 z-10">
                        <CameraOff className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400" />
                        <p className="text-xs text-slate-300 max-w-sm">{cameraError}</p>
                        <Button
                          size="sm"
                          variant="primary"
                          onPress={() => requestCameraPermission(facingMode)}
                          className="font-bold cursor-pointer text-xs"
                        >
                          Allow / Retry Camera
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Input Tab */}
                {activeTab === "manual" && (
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <Label className="text-xs font-semibold text-slate-300">
                      Challan QR ID or Challan Number
                    </Label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. QR-1004 or DC-2026-1004"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && manualCode.trim()) {
                            processDecodedText(manualCode);
                          }
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                      <Button
                        variant="primary"
                        className="font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm cursor-pointer"
                        isDisabled={!manualCode.trim()}
                        onPress={() => processDecodedText(manualCode)}
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                )}

                {/* File Upload Tab */}
                {activeTab === "upload" && (
                  <div className="p-6 sm:p-8 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs text-slate-300">
                      Upload photo or screenshot of the Delivery Challan QR
                    </p>
                    <Button
                      variant="primary"
                      onPress={() => fileInputRef.current?.click()}
                      className="font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer text-xs"
                    >
                      Choose Photo
                    </Button>
                  </div>
                )}
              </Card>
            </div>

            {/* Right Column: Pending Challans List for Quick Access */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="p-4 sm:p-5 md:p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-white">Challans Pending Loading</h3>
                    <p className="text-[11px] text-slate-400">Click any challan to begin sack verification</p>
                  </div>
                  <Chip size="sm" color="warning" variant="soft" className="font-bold text-[10px]">
                    {pendingLoadingChallans.length} Ready
                  </Chip>
                </div>

                <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                  {pendingLoadingChallans.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      All issued challans have been loaded and verified!
                    </div>
                  ) : (
                    pendingLoadingChallans.map((c) => {
                      const bags = Math.round(c.totalQuantity * 2);
                      const qrId = c.qrId || `QR-${c.challanNumber.replace(/\D/g, "")}`;
                      return (
                        <div
                          key={c.id}
                          onClick={() => handleSelectChallan(c)}
                          className="p-3 sm:p-3.5 rounded-xl border border-slate-800 hover:border-amber-400/50 bg-slate-950 hover:bg-slate-900 transition-all cursor-pointer group space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-black text-amber-400 group-hover:underline">
                                {c.challanNumber}
                              </span>
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                {qrId}
                              </span>
                            </div>
                            <Chip
                              size="sm"
                              color={c.loadingStatus === "IN_PROGRESS" ? "warning" : "default"}
                              variant="soft"
                              className="font-bold text-[9px] sm:text-[10px]"
                            >
                              {c.loadingStatus === "IN_PROGRESS" ? "In Progress" : "Pending"}
                            </Chip>
                          </div>

                          <div className="text-xs font-semibold text-white truncate">
                            {c.fpsName}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                            <span>
                              {c.commodity} • {bags} Bags ({c.totalQuantity} Q)
                            </span>
                            <span className="font-mono text-slate-300">
                              {c.vehicleNumber || "DL-1LM-4402"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>
          </div>
        ) : (
          /* ─── CASE B: ACTIVE CHALLAN SACK SCANNING DESK ─── */
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-150">
            {/* Consignment Banner */}
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-lg sm:text-xl font-black text-white">
                    {activeChallan.challanNumber}
                  </span>
                  <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <QrCode className="w-3 h-3" />
                    {activeChallan.qrId || `QR-${activeChallan.challanNumber.replace(/\D/g, "")}`}
                  </span>
                  <Chip
                    size="sm"
                    color={activeChallan.loadingStatus === "LOADED" ? "success" : "warning"}
                    variant="primary"
                    className="font-bold text-[10px]"
                  >
                    {activeChallan.loadingStatus === "LOADED"
                      ? "VERIFIED LOADED"
                      : "LOADING IN PROGRESS"}
                  </Chip>
                </div>

                <div className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-1.5 truncate">
                  <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">
                    Consignee: {activeChallan.fpsName} ({activeChallan.fpsId})
                  </span>
                </div>

                <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3 sm:gap-4 pt-0.5">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                    Vehicle:{" "}
                    <strong className="text-white font-mono">
                      {activeChallan.vehicleNumber || "DL-1LM-4402"}
                    </strong>
                  </span>
                  <span>
                    Driver: <strong className="text-white">{activeChallan.driverName || "Mohan Lal"}</strong>
                  </span>
                  <span>
                    Commodity: <strong className="text-white">{activeChallan.commodity}</strong>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => setViewingChallanModal(activeChallan)}
                  className="text-xs font-semibold cursor-pointer border-slate-700"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  View Challan
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={handleSwitchChallan}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Switch Challan
                </Button>
              </div>
            </div>

            {/* Total Consignment Progress Bar */}
            <Card className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-amber-400" />
                  Total Consignment Loading Progress
                </span>
                <span className="font-mono text-xs sm:text-sm font-black text-white">
                  {totalVerifiedBags} / {totalRequiredBags} Bags{" "}
                  <span className="text-slate-400 font-normal">
                    (
                    {Math.round(
                      totalRequiredBags > 0 ? (totalVerifiedBags / totalRequiredBags) * 100 : 0
                    )}
                    %)
                  </span>
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isFullyLoaded
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                      : "bg-gradient-to-r from-amber-500 to-amber-400"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      totalRequiredBags > 0 ? (totalVerifiedBags / totalRequiredBags) * 100 : 0
                    )}%`,
                  }}
                />
              </div>
            </Card>

            {/* Dual Column: Scanner + Allocated Stacks Tally */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
              {/* Left Column: Sack Camera Scanner & Hardware Input */}
              <div className="lg:col-span-5 space-y-4">
                <Card className="p-4 sm:p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-3 sm:space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                      Step 2 • Scan Physical Sack QR
                    </span>
                    <h3 className="font-bold text-xs sm:text-sm text-white">
                      Scan Individual Grain Sack
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-400 leading-snug">
                      Each sack carries a unique serialized QR formatted as{" "}
                      <strong className="text-amber-400 font-mono">BATCHID_Serialnumber</strong>.
                      Duplicate sack scans are strictly rejected.
                    </p>
                  </div>

                  {/* Camera Window */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[4/3] sm:aspect-video flex items-center justify-center w-full">
                    <div id="loader-qr-reader" className="w-full h-full" />

                    <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 z-10">
                      <button
                        type="button"
                        onClick={handleToggleFacingMode}
                        className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white backdrop-blur border border-slate-700 shadow-md cursor-pointer"
                        title="Switch camera"
                      >
                        <SwitchCamera className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => requestCameraPermission(facingMode)}
                        className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white backdrop-blur border border-slate-700 shadow-md cursor-pointer"
                        title="Retry camera"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${isRequestingPermission ? "animate-spin" : ""}`}
                        />
                      </button>
                    </div>

                    {cameraError && (
                      <div className="absolute inset-0 bg-slate-950/95 p-4 flex flex-col items-center justify-center text-center space-y-2 z-10">
                        <CameraOff className="w-6 h-6 text-amber-400" />
                        <p className="text-[11px] text-slate-300">{cameraError}</p>
                        <Button
                          size="sm"
                          variant="primary"
                          onPress={() => requestCameraPermission(facingMode)}
                          className="font-bold text-xs"
                        >
                          Retry Camera
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Hardware Scanner / Keyboard Input box */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-800">
                    <Label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                      <span>2D Scanner / Sack QR ID Entry</span>
                      <span className="text-[10px] text-slate-500 font-mono">Format: BATCHID_Serial</span>
                    </Label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. BATCH-WHT-101_001"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && manualCode.trim()) {
                            processDecodedText(manualCode);
                            setManualCode("");
                          }
                        }}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                      <Button
                        size="sm"
                        variant="primary"
                        className="font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs shrink-0 cursor-pointer"
                        isDisabled={!manualCode.trim()}
                        onPress={() => {
                          processDecodedText(manualCode);
                          setManualCode("");
                        }}
                      >
                        Verify Sack
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Scanned Bag Activity History */}
                <Card className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-2">
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                    <span className="font-bold text-slate-300">Verified Sacks Activity Log</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {scannedSacks.length} sacks loaded
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {scannedSacks.length === 0 ? (
                      <div className="text-[11px] text-slate-500 py-4 text-center">
                        No sacks scanned yet. Scan sack QR to record loading.
                      </div>
                    ) : (
                      scannedSacks.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950 text-[11px]"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="font-mono font-black text-amber-400">
                              #{item.serialNumber}
                            </span>
                            <span className="font-mono text-slate-200 truncate">{item.sackId}</span>
                            <span className="text-[10px] text-slate-500">({item.bayLocation})</span>
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {new Date(item.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>

              {/* Right Column: Authorized Physical Stacks Breakdown (Multi-Batch) */}
              <div className="lg:col-span-7 space-y-4">
                <Card className="p-4 sm:p-5 md:p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm text-white">
                        Authorized Consignment Batches ({activeChallan.batches.length})
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Scan individual sacks matching each batch quota
                      </p>
                    </div>
                    <Chip size="sm" color="accent" variant="soft" className="font-bold text-[10px]">
                      Strict QR Only
                    </Chip>
                  </div>

                  {/* List of Allocated Batches in this Challan */}
                  <div className="space-y-3.5">
                    {activeChallan.batches.map((item) => {
                      const maxBags = Math.round(item.dispatchedQty * 2);
                      const current = verifiedBags[item.batchId] || 0;
                      const isStackComplete = current >= maxBags;
                      const pct = maxBags > 0 ? Math.round((current / maxBags) * 100) : 0;
                      const liveBatch = batches.find((b) => b.id === item.batchId);
                      const batchSacks = scannedSacks.filter((s) => s.batchId === item.batchId);

                      return (
                        <div
                          key={item.batchId}
                          className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                            isStackComplete
                              ? "bg-emerald-950/20 border-emerald-500/40"
                              : "bg-slate-950 border-slate-800 hover:border-slate-700"
                          } space-y-3`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm sm:text-base font-black text-white">
                                  {item.batchId}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-slate-800 font-semibold text-xs text-amber-400 border border-slate-700">
                                  {item.bayLocation}
                                </span>
                                {isStackComplete && (
                                  <Chip
                                    size="sm"
                                    color="success"
                                    variant="primary"
                                    className="text-[9px] sm:text-[10px] font-bold"
                                  >
                                    QUOTA FULFILLED
                                  </Chip>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                Storage Age:{" "}
                                <strong className="text-slate-300">{item.batchAgeDays} Days</strong> •
                                Status:{" "}
                                <span className="text-emerald-400 font-semibold">
                                  {liveBatch?.status || "Eligible"}
                                </span>
                              </div>
                            </div>

                            {/* Tally Counters (Read-Only from Scans) */}
                            <div className="text-right shrink-0">
                              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block">
                                Verified Sacks
                              </span>
                              <div className="font-mono text-lg sm:text-xl font-black text-white">
                                {current} / {maxBags}
                              </div>
                            </div>
                          </div>

                          {/* Progress Meter */}
                          <div className="space-y-1">
                            <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isStackComplete ? "bg-emerald-500" : "bg-amber-500"
                                }`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>{pct}% loaded</span>
                              <span>Quota: {item.dispatchedQty} Quintals</span>
                            </div>
                          </div>

                          {/* Scanned Sacks Badge Chips for this batch */}
                          <div className="pt-1.5 border-t border-slate-800/80">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                              <span className="font-semibold flex items-center gap-1">
                                <Hash className="w-3 h-3 text-amber-400" />
                                Scanned Sack Serials ({batchSacks.length}):
                              </span>
                              <span>Target: {maxBags}</span>
                            </div>
                            {batchSacks.length === 0 ? (
                              <div className="text-[10px] text-slate-600 italic">
                                No sacks registered yet for this stack.
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-0.5">
                                {batchSacks.map((s) => (
                                  <span
                                    key={s.id}
                                    className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5"
                                  >
                                    <Check className="w-2.5 h-2.5" />
                                    #{s.serialNumber}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sign-Off Desktop Action Button */}
                  <div className="pt-3 border-t border-slate-800 hidden lg:flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Final Loading Verification
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {isFullyLoaded
                          ? "All allocated sacks physically verified by QR code. Consignment ready for gate exit clearance."
                          : `Please scan remaining ${totalRequiredBags - totalVerifiedBags} bag(s) to complete loading verification.`}
                      </p>
                    </div>

                    <Button
                      variant="primary"
                      isDisabled={!isFullyLoaded}
                      onPress={() => setIsSignOffModalOpen(true)}
                      className={`font-bold text-xs cursor-pointer ${
                        isFullyLoaded
                          ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
                          : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                      }`}
                    >
                      <CheckSquare className="w-4 h-4 mr-1.5" />
                      Complete & Sign Off
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── Mobile Sticky Loading Bar ─── */}
      {activeChallan && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-slate-900/95 border-t border-slate-800 backdrop-blur z-30 lg:hidden flex items-center justify-between gap-3 shadow-2xl">
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400">Loading Progress</div>
            <div className="font-mono text-xs sm:text-sm font-black text-white truncate">
              {totalVerifiedBags} / {totalRequiredBags} Bags (
              {Math.round(totalRequiredBags > 0 ? (totalVerifiedBags / totalRequiredBags) * 100 : 0)}%)
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            isDisabled={!isFullyLoaded}
            onPress={() => setIsSignOffModalOpen(true)}
            className={`font-bold text-xs shrink-0 cursor-pointer ${
              isFullyLoaded
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md animate-pulse"
                : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 mr-1" />
            {isFullyLoaded ? "Sign-off & Complete" : `${totalRequiredBags - totalVerifiedBags} Left`}
          </Button>
        </div>
      )}

      {/* ─── Sign-Off Modal ─── */}
      <Modal
        isOpen={isSignOffModalOpen}
        onOpenChange={(open) => {
          if (!open) setIsSignOffModalOpen(false);
        }}
      >
        <Modal.Backdrop className="backdrop-blur-sm z-50 p-4">
          <Modal.Container size="sm" className="max-w-md w-full">
            <Modal.Dialog className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4">
              <Modal.Header className="p-0 border-none">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    ePDS Statutory Clearance
                  </span>
                  <Modal.Heading className="text-lg font-bold text-white">
                    Confirm Consignment Loading
                  </Modal.Heading>
                  <p className="text-xs text-slate-400">
                    Certify that all {totalVerifiedBags} serialized sacks have been physically verified and loaded into Truck{" "}
                    <strong className="text-white font-mono">{activeChallan?.vehicleNumber || "consignee vehicle"}</strong>.
                  </p>
                </div>
              </Modal.Header>

              <Modal.Body className="p-0 space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Challan Number:</span>
                    <span className="font-mono font-bold text-white">{activeChallan?.challanNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Consignee:</span>
                    <span className="font-semibold text-slate-200">{activeChallan?.fpsName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Sacks Verified:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {totalVerifiedBags} Bags ({activeChallan?.totalQuantity} Q)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Allocated Batches:</span>
                    <span className="font-mono text-slate-300">
                      {activeChallan?.batches.map((b) => b.batchId).join(", ")}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">
                    Loading Supervisor / Gang Lead Name
                  </Label>
                  <input
                    type="text"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    placeholder="e.g. Ramu - Gang 2"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </Modal.Body>

              <Modal.Footer className="p-0 border-none flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSignOffModalOpen(false)}
                  disabled={isSubmittingSignOff}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSignOff}
                  disabled={isSubmittingSignOff || !supervisorName.trim()}
                  className="px-4 py-2 rounded-lg font-bold text-xs bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  {isSubmittingSignOff ? "Certifying..." : "Certify & Complete Loading"}
                </button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ─── A4 Challan Modal View ─── */}
      {viewingChallanModal && (
        <ChallanModal
          challan={viewingChallanModal}
          isOpen={true}
          onClose={() => setViewingChallanModal(null)}
        />
      )}
    </div>
  );
}
