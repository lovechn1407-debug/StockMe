import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Card,
  Button,
  Chip,
  Input,
  TextField,
  Label,
} from "@heroui/react";
import {
  Scan,
  Camera,
  CameraOff,
  SwitchCamera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Truck,
  Package,
  Calendar,
  Clock,
  ArrowLeft,
  RefreshCw,
  Search,
  ExternalLink,
  Volume2,
  VolumeX,
  QrCode,
  Building2,
} from "lucide-react";
import type { DeliveryChallan } from "../types";
import { updateChallanGateExit } from "../lib/db";
import { ChallanModal } from "./ChallanModal";

interface GatePassScannerProps {
  challans: DeliveryChallan[];
  onBackToDashboard: () => void;
}

export function GatePassScanner({
  challans,
  onBackToDashboard,
}: GatePassScannerProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "manual" | "upload">("camera");
  const [scannerStarted, setScannerStarted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [manualCode, setManualCode] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Scan Result States
  const [scannedChallan, setScannedChallan] = useState<DeliveryChallan | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [unrecognizedCode, setUnrecognizedCode] = useState<string | null>(null);
  const [isMarkingExit, setIsMarkingExit] = useState(false);
  const [viewingChallanModal, setViewingChallanModal] = useState<DeliveryChallan | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sound chime helper via Web Audio API
  const playSound = (type: "success" | "error") => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "success") {
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Process decoded QR or text (supports JSON payload, QR ID, or Challan Number)
  const processDecodedText = (decodedText: string) => {
    setIsVerifying(true);
    setUnrecognizedCode(null);
    setScannedChallan(null);

    const raw = decodedText.trim();
    let targetChallanNo = raw;
    let targetQrId = "";

    // 1. Check if JSON payload from official Challan QR
    try {
      const parsed = JSON.parse(raw);
      if (parsed.qrId) {
        targetQrId = String(parsed.qrId).trim();
      }
      if (parsed.challanNo) {
        targetChallanNo = String(parsed.challanNo).trim();
      } else if (parsed.dc) {
        targetChallanNo = String(parsed.dc).trim();
      } else if (parsed.id) {
        targetChallanNo = String(parsed.id).trim();
      }
    } catch {
      // 2. Not JSON: check if raw text is or contains a QR ID (e.g. QR-1001, QR-7429, QR1001)
      const qrMatch = raw.match(/QR[- ]?([A-Za-z0-9-]+)/i);
      if (qrMatch) {
        targetQrId = `QR-${qrMatch[1]}`;
      }

      // Check if raw text is or contains a Challan Number (e.g. DC-2026-1001)
      const challanMatch = raw.match(/(?:DC|CHL|TRCHL)-\d{4}-\d+/i);
      if (challanMatch) {
        targetChallanNo = challanMatch[0];
      }
    }

    const cleanRaw = raw.toLowerCase();
    const cleanChallan = targetChallanNo.toLowerCase();
    const cleanQr = targetQrId.toLowerCase();
    const rawDigits = raw.replace(/\D/g, "");

    // 3. Match against available challans
    const found = challans.find((c) => {
      const cQr = (c.qrId || `QR-${c.challanNumber.replace(/\D/g, "")}`).toLowerCase();
      const cQrDigits = cQr.replace(/\D/g, "");
      const cChallan = c.challanNumber.toLowerCase();
      const cId = c.id.toLowerCase();
      const cDigits = c.challanNumber.replace(/\D/g, "");

      // Match by QR ID (direct or normalized)
      if (cleanQr && (cQr === cleanQr || cQr.includes(cleanQr) || cleanQr.includes(cQr))) {
        return true;
      }
      // Match by Challan Number or ID
      if (cleanChallan && (cChallan === cleanChallan || cId === cleanChallan || cChallan.includes(cleanChallan))) {
        return true;
      }
      // Match by raw string
      if (cleanRaw && (cQr === cleanRaw || cChallan === cleanRaw || cId === cleanRaw)) {
        return true;
      }
      // Match by numeric sequence if >= 3 digits (e.g. 1001 or 1002 or 7429)
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
      setScannedChallan(found);
      // Stop camera to conserve resources while displaying verified credentials
      stopCamera();
    } else {
      playSound("error");
      setUnrecognizedCode(raw);
    }
    setIsVerifying(false);
  };

  // Initialize and start live camera scanner
  const startCamera = async (mode: "environment" | "user" = facingMode) => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("gate-pass-reader", {
          verbose: false,
          useBarCodeDetectorIfSupported: false,
        });
      }

      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      await html5QrCodeRef.current.start(
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
      console.warn("Camera start warning:", err);
      const isDenied =
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError" ||
        err?.message?.toLowerCase().includes("permission") ||
        err?.message?.toLowerCase().includes("denied");

      if (isDenied) {
        setCameraError(
          "Camera access permission was dismissed or not granted. Click 'Allow Camera Access' below to trigger the browser permission prompt."
        );
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        setCameraError(
          "No camera hardware detected on this device. You can verify Gate Passes using 'Upload Photo' or 'Manual Search'."
        );
      } else {
        setCameraError(
          err?.message ||
            "Camera access permission required. Click 'Allow Camera Access' below or check your browser address bar settings."
        );
      }
      setScannerStarted(false);
    }
  };

  // Explicit user-gesture trigger to FORCE browser to show the native permission popup
  const requestCameraPermission = async (mode: "environment" | "user" = facingMode) => {
    setCameraError(null);
    setIsRequestingPermission(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Your browser does not support mediaDevices API. Please ensure you are running on localhost or an HTTPS connection."
        );
      }

      // DIRECT CALL to getUserMedia within user gesture context:
      // This is what forces Chrome/Edge/Firefox to show the native "Allow / Block" permission popup!
      const userStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode === "environment" ? { ideal: "environment" } : "user",
        },
      });

      // Browser permission granted by user! Release test stream
      userStream.getTracks().forEach((track) => track.stop());

      // Stop and clear any lingering Html5Qrcode instance
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          html5QrCodeRef.current.clear();
        } catch {
          // ignore
        }
        html5QrCodeRef.current = null;
      }

      // Small pause for hardware device release
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Now start the QR scanner stream
      await startCamera(mode);
    } catch (err: any) {
      console.error("Camera permission request failed:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError(
          "Camera permission was blocked. To unblock: Click the camera / lock icon next to the address bar (at the top of your browser), change Camera to 'Allow', then click 'Retry Camera'."
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError(
          "No camera hardware found on this computer. You can test gate pass verification instantly via 'Upload Photo' or 'Manual Search'."
        );
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setCameraError(
          "Camera is currently in use by another tab or app. Please close other camera apps and click 'Retry Camera'."
        );
      } else {
        setCameraError(err.message || "Unable to acquire camera stream. Please check browser permissions.");
      }
      setScannerStarted(false);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
      setScannerStarted(false);
    } catch (err) {
      console.warn("Camera stop error:", err);
    }
  };

  // Toggle camera direction (front / back)
  const handleToggleFacingMode = async () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    if (scannerStarted) {
      await startCamera(nextMode);
    }
  };

  // Handle Image File Upload QR Scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("gate-pass-reader", {
          verbose: false,
          useBarCodeDetectorIfSupported: false,
        });
      }
      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      processDecodedText(decodedText);
    } catch (err: any) {
      playSound("error");
      setUnrecognizedCode("Could not decode valid QR from the uploaded image. Please ensure photo is well-lit and focused.");
    }
  };

  // Approve Gate Exit
  const handleApproveGateExit = async (challan: DeliveryChallan) => {
    setIsMarkingExit(true);
    try {
      await updateChallanGateExit(challan.id, "Havildar Ramesh (Exit Gate 1)");
      // Update local copy
      setScannedChallan({
        ...challan,
        gateStatus: "CLEARED_EXIT",
        gateExitTimestamp: Date.now(),
        gateSecurityOfficer: "Havildar Ramesh (Exit Gate 1)",
      });
      playSound("success");
    } catch (err) {
      console.error("Gate exit update error:", err);
    } finally {
      setIsMarkingExit(false);
    }
  };

  // Start camera on mount if camera tab active
  useEffect(() => {
    if (activeTab === "camera" && !scannedChallan && !unrecognizedCode) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* ─── Top Security App Header ─── */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Return to Main Portal"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="text-sm md:text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  iPDS Gate Pass Security Scanner
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  /scan
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                State Buffer Godown Unit-4 • Physical Exit Gate Verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              title={soundEnabled ? "Mute audio chimes" : "Enable audio chimes"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              {challans.length} Active Challans
            </span>
          </div>
        </div>
      </header>

      {/* ─── Main Content Container ─── */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Method Switcher Tabs (Camera / Manual Entry / Upload Image) */}
        <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl max-w-md mx-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab("camera");
              startCamera();
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "camera"
                ? "bg-primary text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Live Camera
          </button>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab("manual");
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "manual"
                ? "bg-primary text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Manual Search
          </button>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab("upload");
              fileInputRef.current?.click();
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "upload"
                ? "bg-primary text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Photo
          </button>
        </div>

        {/* Hidden file input for upload tab */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* ─── SCANNER VIEWPORT CARD ─── */}
        {!scannedChallan && !unrecognizedCode && (
          <div className="space-y-4">
            {activeTab === "camera" && (
              <div className="relative max-w-md mx-auto aspect-square rounded-2xl overflow-hidden border-2 border-slate-700 bg-black shadow-2xl flex items-center justify-center">
                {/* HTML5 QR Container */}
                <div id="gate-pass-reader" className="w-full h-full overflow-hidden" />

                {/* Tactical targeting overlay */}
                <div className="pointer-events-none absolute inset-0 border-[3px] border-emerald-500/30 rounded-2xl flex flex-col justify-between p-6">
                  {/* Laser Scanning Animation Line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981] animate-bounce" />

                  {/* Corner Targets */}
                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
                    <div className="w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
                  </div>
                  <div className="text-center">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400/90 bg-black/60 px-3 py-1 rounded-full border border-emerald-500/30">
                      Center Gate Pass QR in Frame
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
                    <div className="w-6 h-6 border-b-2 border-r-2 border-emerald-400" />
                  </div>
                </div>

                {/* Floating Camera Controls on Video */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleFacingMode}
                    className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white backdrop-blur border border-slate-700 shadow-md cursor-pointer transition-transform hover:scale-105"
                    title={`Switch camera (current: ${facingMode === "environment" ? "Back Camera" : "Front Camera"})`}
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => requestCameraPermission(facingMode)}
                    className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white backdrop-blur border border-slate-700 shadow-md cursor-pointer transition-transform hover:scale-105"
                    title="Restart camera stream & check permission"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRequestingPermission ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {/* Camera error / permission helper */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center space-y-3.5 z-20">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <CameraOff className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-white">Camera Access Permission Required</h3>
                      <p className="text-xs text-slate-300 max-w-sm leading-relaxed">{cameraError}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="primary"
                        isDisabled={isRequestingPermission}
                        onPress={() => requestCameraPermission(facingMode)}
                        className="font-bold shadow-md cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 mr-1.5" />
                        {isRequestingPermission ? "Requesting Permission..." : "Allow / Retry Camera"}
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={() => {
                          const sample = challans.find((c) => c.gateStatus !== "CLEARED_EXIT") || challans[0];
                          if (sample) {
                            processDecodedText(sample.challanNumber);
                          }
                        }}
                        className="text-xs font-semibold cursor-pointer border-slate-700 hover:border-emerald-500/50"
                      >
                        ⚡ Simulate Scan (Sample Challan)
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={() => fileInputRef.current?.click()}
                        className="text-xs cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1" />
                        Upload QR Image
                      </Button>
                    </div>

                    <div className="text-[11px] text-slate-400 border border-slate-800 rounded-lg px-3 py-1.5 bg-slate-900/60 flex items-center gap-1.5">
                      <span>🔒 Tip:</span>
                      <span>If no popup appears, check the <strong>lock/camera icon</strong> in your browser's address bar.</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manual Search Tab */}
            {activeTab === "manual" && (
              <Card className="max-w-md mx-auto p-5 border border-slate-800 bg-slate-900 rounded-xl space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Verify by QR ID or Challan Number</h3>
                  <p className="text-xs text-slate-400">
                    Type or paste the <strong>QR ID</strong> (e.g. QR-1001) or <strong>Challan Number</strong> (e.g. DC-2026-1001) printed on the Gate Pass.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-300">QR ID or Challan Number</Label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. QR-1001 or DC-2026-1001"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && manualCode.trim()) {
                          processDecodedText(manualCode);
                        }
                      }}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary font-mono"
                    />
                    <Button
                      variant="primary"
                      isDisabled={!manualCode.trim()}
                      onPress={() => processDecodedText(manualCode)}
                    >
                      Verify
                    </Button>
                  </div>
                </div>

                {/* Quick Test Demo Chips */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-semibold">Quick Test by QR ID or Challan:</span>
                  <div className="flex flex-wrap gap-2">
                    {challans.slice(0, 4).map((c) => {
                      const qrId = c.qrId || `QR-${c.challanNumber.replace(/\D/g, "") || "1001"}`;
                      return (
                        <div key={c.id} className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => processDecodedText(qrId)}
                            className="text-[11px] font-mono px-2 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-colors cursor-pointer flex items-center gap-1 font-bold"
                            title={`Verify by QR ID: ${qrId}`}
                          >
                            <QrCode className="w-3 h-3" />
                            <span>{qrId}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => processDecodedText(c.challanNumber)}
                            className="text-[11px] font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                            title={`Verify by Challan: ${c.challanNumber}`}
                          >
                            {c.challanNumber}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            )}

            {/* Upload Tab View */}
            {activeTab === "upload" && (
              <Card className="max-w-md mx-auto p-8 border border-slate-800 bg-slate-900 rounded-xl text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Upload Gate Pass Photo</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Select a snapshot or document containing the Gate Pass QR code to verify.
                  </p>
                </div>
                <Button
                  variant="primary"
                  className="w-full"
                  onPress={() => fileInputRef.current?.click()}
                >
                  Choose File from Device
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* ─── CASE 1: VERIFIED GATE PASS CARD ─── */}
        {scannedChallan && (
          <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Verification Status Banner */}
            <div className={`p-4 md:p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl ${
              scannedChallan.gateStatus === "CLEARED_EXIT"
                ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
                : "bg-amber-950/40 border-amber-500/50 text-amber-200"
            }`}>
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                  scannedChallan.gateStatus === "CLEARED_EXIT"
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                    : "bg-amber-500/20 border-amber-500/40 text-amber-400"
                }`}>
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <h3 className="text-base md:text-lg font-black tracking-tight text-white uppercase">
                      Official Gate Pass Verified
                    </h3>
                    <Chip
                      size="sm"
                      color={scannedChallan.gateStatus === "CLEARED_EXIT" ? "success" : "warning"}
                      variant="primary"
                      className="font-bold text-[10px]"
                    >
                      {scannedChallan.gateStatus === "CLEARED_EXIT" ? "EXIT CLEARED" : "PENDING GATE EXIT"}
                    </Chip>
                  </div>
                  <p className="text-xs opacity-90">
                    Authentic Central iPDS Dispatch Order • Ready for Gate Inspection
                  </p>
                </div>
              </div>

              {/* Action: Approve Exit Button */}
              {scannedChallan.gateStatus !== "CLEARED_EXIT" ? (
                <Button
                  variant="primary"
                  className="font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg w-full sm:w-auto"
                  isDisabled={isMarkingExit}
                  onPress={() => handleApproveGateExit(scannedChallan)}
                >
                  <ShieldCheck className="w-4 h-4 mr-1.5" />
                  {isMarkingExit ? "Recording Exit..." : "Approve & Mark Gate Exit"}
                </Button>
              ) : (
                <div className="text-right text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Departure Recorded</span>
                </div>
              )}
            </div>

            {/* Detailed Inspection Credentials Card */}
            <Card className="p-5 md:p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-5 text-slate-200">
              {/* Header Details */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Challan Reference &amp; QR Identifier</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="font-mono text-xl font-black text-white">{scannedChallan.challanNumber}</div>
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <QrCode className="w-3 h-3" />
                      {scannedChallan.qrId || `QR-${scannedChallan.challanNumber.replace(/\D/g, "") || "1001"}`}
                    </span>
                    <Chip
                      size="sm"
                      color={scannedChallan.loadingStatus === "LOADED" ? "success" : "warning"}
                      variant="soft"
                      className="font-bold text-[10px]"
                    >
                      {scannedChallan.loadingStatus === "LOADED"
                        ? `✓ Loading Verified (${scannedChallan.loadingSupervisor || "Dock Lead"})`
                        : "⚠ Loading Dock Sign-Off Pending"}
                    </Chip>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Issue Date: {scannedChallan.dispatchDate}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Consignment</span>
                  <div className="text-2xl font-black text-primary font-mono">
                    {scannedChallan.totalQuantity} <span className="text-sm font-normal text-slate-300">Quintals</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    ({Math.round(scannedChallan.totalQuantity * 2)} Standard 50kg Bags)
                  </span>
                </div>
              </div>

              {/* Vehicle & Consignee 2-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-primary" /> Vehicle &amp; Carrier Inspection
                  </span>
                  <div className="font-mono text-base font-bold text-white">
                    {scannedChallan.vehicleNumber || "DL-1LM-4402"}
                  </div>
                  <div className="text-slate-300">
                    Driver Name: <strong>{scannedChallan.driverName || "Mohan Lal"}</strong>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Transit Route: State Godown Unit-4 → {scannedChallan.fpsName}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-primary" /> Consignee Destination
                  </span>
                  <div className="text-sm font-bold text-white">
                    {scannedChallan.fpsName}
                  </div>
                  <div className="text-slate-300">
                    FPS Code: <strong>{scannedChallan.fpsId}</strong>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Authorized for ePDS biometric public distribution
                  </div>
                </div>
              </div>

              {/* Physical Bag Stacks Breakdown */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                  Authorized Physical Stacks ({scannedChallan.commodity})
                </span>
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
                  {scannedChallan.batches.map((b) => (
                    <div key={b.batchId} className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-primary">{b.batchId}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold text-[11px]">
                          {b.bayLocation}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          ({b.batchAgeDays}d storage age)
                        </span>
                      </div>
                      <div className="font-bold text-white text-sm">
                        {b.dispatchedQty} Q ({Math.round(b.dispatchedQty * 2)} Bags)
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buttons footer */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
                <Button
                  variant="secondary"
                  className="text-xs font-semibold"
                  onPress={() => setViewingChallanModal(scannedChallan)}
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  View &amp; Print Official Challan (A4)
                </Button>

                <Button
                  variant="primary"
                  className="text-xs font-bold"
                  onPress={() => {
                    setScannedChallan(null);
                    setUnrecognizedCode(null);
                    if (activeTab === "camera") startCamera();
                  }}
                >
                  <Scan className="w-3.5 h-3.5 mr-1" />
                  Scan Next Gate Pass
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ─── CASE 2: UNRECOGNIZED / INVALID CODE ─── */}
        {unrecognizedCode && !scannedChallan && (
          <Card className="max-w-md mx-auto p-6 bg-red-950/30 border border-red-500/40 rounded-2xl shadow-xl text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">Unverified or Invalid Gate Pass</h3>
              <p className="text-xs text-red-200/90 mt-1">
                No active delivery dispatch record matching this code was found in the State Buffer Godown ledger.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-black/50 border border-red-500/30 text-left font-mono text-xs text-slate-300 break-all">
              <span className="text-[10px] text-slate-500 uppercase font-sans font-bold block mb-1">Scanned Value:</span>
              {unrecognizedCode}
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onPress={() => {
                  setUnrecognizedCode(null);
                  setActiveTab("manual");
                }}
              >
                Search Manually
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onPress={() => {
                  setUnrecognizedCode(null);
                  setActiveTab("camera");
                  startCamera();
                }}
              >
                Scan Again
              </Button>
            </div>
          </Card>
        )}
      </main>

      {/* Embedded Printable Challan Modal when user clicks view */}
      {viewingChallanModal && (
        <ChallanModal
          challan={viewingChallanModal}
          isOpen={Boolean(viewingChallanModal)}
          onClose={() => setViewingChallanModal(null)}
        />
      )}
    </div>
  );
}
