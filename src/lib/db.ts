import { ref, get, set, update, push } from "firebase/database";
import { db } from "./firebase";
import type {
  Batch,
  DeliveryChallan,
  FairPriceShop,
  FIFOException,
  AuditLog,
} from "../types";

const ROOT_PATH = "foodstock_ipds";

export function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

export function getDateDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function getBatchAgeDays(receiptDateStr: string): number {
  if (!receiptDateStr) return 0;
  const receipt = new Date(receiptDateStr).getTime();
  const now = new Date().getTime();
  const diffTime = Math.max(0, now - receipt);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function formatDaysLeft(expiryDateStr: string): string {
  if (!expiryDateStr || expiryDateStr === "—") return "—";
  const parts = expiryDateStr.split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return expiryDateStr;
  }
  const [year, month, day] = parts;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const expiryMidnight = new Date(year, month - 1, day).getTime();
  const diffDays = Math.round((expiryMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return "Expired";
  }
  if (diffDays === 0) {
    return "0d left";
  }
  return `${diffDays}d left`;
}

export function formatBayCode(bay: string | undefined | null): string {
  if (!bay) return "—";
  return bay.replace(/^Bay\s+/i, "").trim();
}

export function getExpiryGapDays(expiryDateStr: string): number {
  if (!expiryDateStr || expiryDateStr === "—") return 0;
  const parts = expiryDateStr.split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return 0;
  }
  const [year, month, day] = parts;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const expiryMidnight = new Date(year, month - 1, day).getTime();
  return Math.round((expiryMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
}

export function getExpiryGapColor(expiryDateStr: string): {
  color: "success" | "warning" | "danger";
  bg: string;
  text: string;
  label: string;
  daysLeft: number;
} {
  const daysLeft = getExpiryGapDays(expiryDateStr);

  if (daysLeft > 60) {
    // Green: Gap > 60 days
    return {
      color: "success",
      bg: "bg-emerald-600",
      text: "text-white",
      label: `Safe (${daysLeft}d to expiry)`,
      daysLeft,
    };
  } else if (daysLeft >= 30) {
    // Yellow: Gap > 30 and <= 60 days
    return {
      color: "warning",
      bg: "bg-amber-400",
      text: "text-zinc-950",
      label: `Expiring Soon (${daysLeft}d left)`,
      daysLeft,
    };
  } else {
    // Red: Gap < 30 days
    return {
      color: "danger",
      bg: "bg-red-600",
      text: "text-white",
      label: daysLeft <= 0 ? "Expired Stock" : `Critical (${daysLeft}d left)`,
      daysLeft,
    };
  }
}

export interface AgeQuarterInfo {
  bg: string;
  text: string;
  label: string;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  pct: number;
  totalLifeDays: number;
  elapsedDays: number;
}

export function getAgeQuarterStyle(
  receiptDateStr: string,
  expiryDateStr: string
): AgeQuarterInfo {
  if (!receiptDateStr || !expiryDateStr) {
    return {
      bg: "bg-slate-500",
      text: "text-white",
      label: "Unknown",
      quarter: "Q1",
      pct: 0,
      totalLifeDays: 0,
      elapsedDays: 0,
    };
  }
  const receipt = new Date(receiptDateStr).getTime();
  const expiry = new Date(expiryDateStr).getTime();
  const now = Date.now();
  const totalLife = Math.max(1, expiry - receipt);
  const elapsed = Math.max(0, now - receipt);
  const pct = Math.min(100, Math.max(0, (elapsed / totalLife) * 100));
  const totalLifeDays = Math.round(totalLife / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.round(elapsed / (1000 * 60 * 60 * 24));

  if (pct < 25) {
    // 1st quarter: Green
    return {
      bg: "bg-emerald-600",
      text: "text-white",
      label: "Q1 (0–25% Fresh)",
      quarter: "Q1",
      pct,
      totalLifeDays,
      elapsedDays,
    };
  } else if (pct < 50) {
    // 2nd quarter: Yellowish Green
    return {
      bg: "bg-lime-500",
      text: "text-zinc-950",
      label: "Q2 (25–50% Good)",
      quarter: "Q2",
      pct,
      totalLifeDays,
      elapsedDays,
    };
  } else if (pct < 75) {
    // 3rd quarter: Yellow
    return {
      bg: "bg-amber-400",
      text: "text-zinc-950",
      label: "Q3 (50–75% Aging)",
      quarter: "Q3",
      pct,
      totalLifeDays,
      elapsedDays,
    };
  } else {
    // 4th quarter: Red
    return {
      bg: "bg-red-600",
      text: "text-white",
      label: "Q4 (75–100% Critical)",
      quarter: "Q4",
      pct,
      totalLifeDays,
      elapsedDays,
    };
  }
}

// Initial demo seed data
export const INITIAL_SHOPS: FairPriceShop[] = [
  {
    id: "FPS-101",
    name: "FPS-101 Adarsh Ration Kendra",
    dealerName: "Rameshwar Dayal",
    district: "North Delhi",
    licenseNo: "PDS-DL-2018-091",
    activeCards: 840,
  },
  {
    id: "FPS-102",
    name: "FPS-102 Janata PDS Seva Kendra",
    dealerName: "Suman Lata",
    district: "Central Delhi",
    licenseNo: "PDS-DL-2019-144",
    activeCards: 720,
  },
  {
    id: "FPS-103",
    name: "FPS-103 Kalyan Sahakari Bhandar",
    dealerName: "Mahendra Singh",
    district: "East Delhi",
    licenseNo: "PDS-DL-2020-058",
    activeCards: 910,
  },
  {
    id: "FPS-104",
    name: "FPS-104 Antyodaya Upbhokta Kendra",
    dealerName: "Rajesh Verma",
    district: "South Delhi",
    licenseNo: "PDS-DL-2021-312",
    activeCards: 650,
  },
  {
    id: "FPS-105",
    name: "FPS-105 Gramin PDS Kendra",
    dealerName: "Sunita Devi",
    district: "North-West Delhi",
    licenseNo: "PDS-DL-2022-109",
    activeCards: 780,
  },
  {
    id: "FPS-106",
    name: "FPS-106 Nav Bharat Sahkari Samiti",
    dealerName: "Harvinder Pal",
    district: "West Delhi",
    licenseNo: "PDS-DL-2023-421",
    activeCards: 830,
  },
];

export function getInitialBatches(): Record<string, Batch> {
  const batches: Batch[] = [
    // Wheat: Batch 1 (85 days old, 40 Q remaining) + Batch 2 (35 days old, 150 Q remaining)
    {
      id: "BATCH-WHT-101",
      commodity: "Wheat",
      supplier: "FCI Regional Depot Karnal",
      receiptDate: getDateDaysAgo(85),
      expiryDate: getDateDaysFromNow(280),
      receivedQty: 250,
      remainingQty: 40,
      bayLocation: "Bay A-1",
      moisturePct: 11.2,
      status: "Eligible",
      stackCardNumber: "SC-WHT-2026-A1",
      createdAt: Date.now() - 85 * 86400000,
    },
    {
      id: "BATCH-WHT-102",
      commodity: "Wheat",
      supplier: "FCI Sangrur Silo Railhead",
      receiptDate: getDateDaysAgo(35),
      expiryDate: getDateDaysFromNow(330),
      receivedQty: 200,
      remainingQty: 150,
      bayLocation: "Bay A-2",
      moisturePct: 10.8,
      status: "Eligible",
      stackCardNumber: "SC-WHT-2026-A2",
      createdAt: Date.now() - 35 * 86400000,
    },

    // Rice: One with critical imminent expiry (18 days left) + One Under Fumigation + One Fresh
    {
      id: "BATCH-RIC-092",
      commodity: "Rice",
      supplier: "Punjab Grain Procurement Corp",
      receiptDate: getDateDaysAgo(95),
      expiryDate: getDateDaysFromNow(18),
      receivedQty: 180,
      remainingQty: 90,
      bayLocation: "Bay A-3",
      moisturePct: 12.4,
      status: "Eligible",
      stackCardNumber: "SC-RIC-2026-A3",
      createdAt: Date.now() - 95 * 86400000,
    },
    {
      id: "BATCH-RIC-098",
      commodity: "Rice",
      supplier: "Haryana Warehousing Corp",
      receiptDate: getDateDaysAgo(65),
      expiryDate: getDateDaysFromNow(300),
      receivedQty: 220,
      remainingQty: 120,
      bayLocation: "Bay A-4",
      moisturePct: 12.1,
      status: "Under Fumigation",
      fumigationNote:
        "Aluminium Phosphide (ALP) gas cover sealed. Safe degassing scheduled for end of week.",
      stackCardNumber: "SC-RIC-2026-A4",
      createdAt: Date.now() - 65 * 86400000,
    },
    {
      id: "BATCH-RIC-104",
      commodity: "Rice",
      supplier: "FCI Kurukshetra Base",
      receiptDate: getDateDaysAgo(20),
      expiryDate: getDateDaysFromNow(345),
      receivedQty: 200,
      remainingQty: 190,
      bayLocation: "Bay A-5",
      moisturePct: 11.5,
      status: "Eligible",
      stackCardNumber: "SC-RIC-2026-A5",
      createdAt: Date.now() - 20 * 86400000,
    },

    // Sugar: 45 days left (Expiring soon, yellow warning)
    {
      id: "BATCH-SGR-081",
      commodity: "Sugar",
      supplier: "Dhampur Sugar Mills Ltd",
      receiptDate: getDateDaysAgo(70),
      expiryDate: getDateDaysFromNow(45),
      receivedQty: 120,
      remainingQty: 80,
      bayLocation: "Bay A-6",
      moisturePct: 0.04,
      status: "Eligible",
      stackCardNumber: "SC-SGR-2026-A6",
      createdAt: Date.now() - 70 * 86400000,
    },

    // Salt: 50 days old, 700 days expiry (Safe, Green)
    {
      id: "BATCH-SLT-044",
      commodity: "Salt",
      supplier: "Sambhar Salts PSU Rajasthan",
      receiptDate: getDateDaysAgo(50),
      expiryDate: getDateDaysFromNow(700),
      receivedQty: 150,
      remainingQty: 110,
      bayLocation: "Bay B-1",
      moisturePct: 2.1,
      status: "Eligible",
      stackCardNumber: "SC-SLT-2026-B1",
      createdAt: Date.now() - 50 * 86400000,
    },

    // Edible Oil: Packaged fortified oil, 24 days left (Critical, Red)
    {
      id: "BATCH-OIL-033",
      commodity: "Edible Oil",
      supplier: "Hafed Edible Oils Rewari",
      receiptDate: getDateDaysAgo(45),
      expiryDate: getDateDaysFromNow(24),
      receivedQty: 100,
      remainingQty: 60,
      bayLocation: "Bay B-2",
      moisturePct: 0.1,
      status: "Eligible",
      stackCardNumber: "SC-OIL-2026-B2",
      createdAt: Date.now() - 45 * 86400000,
    },

    // Chana Dal: 55 days left (Expiring soon, yellow warning)
    {
      id: "BATCH-CND-052",
      commodity: "Chana Dal",
      supplier: "NAFED Central Buffer Bikaner",
      receiptDate: getDateDaysAgo(65),
      expiryDate: getDateDaysFromNow(55),
      receivedQty: 140,
      remainingQty: 75,
      bayLocation: "Bay B-3",
      moisturePct: 9.8,
      status: "Eligible",
      stackCardNumber: "SC-CND-2026-B3",
      createdAt: Date.now() - 65 * 86400000,
    },

    // Tuvar Dal: 30 days old
    {
      id: "BATCH-TVR-028",
      commodity: "Tuvar Dal",
      supplier: "NAFED Buffer Akola Depot",
      receiptDate: getDateDaysAgo(30),
      expiryDate: getDateDaysFromNow(275),
      receivedQty: 120,
      remainingQty: 95,
      bayLocation: "Bay B-4",
      moisturePct: 10.2,
      status: "Eligible",
      stackCardNumber: "SC-TVR-2026-B4",
      createdAt: Date.now() - 30 * 86400000,
    },
  ];

  const record: Record<string, Batch> = {};
  batches.forEach((b) => {
    record[b.id] = b;
  });
  return record;
}

export function getChallanQrId(challan: { id: string; challanNumber: string; qrId?: string }): string {
  if (challan.qrId) return challan.qrId;
  const num = challan.challanNumber.replace(/\D/g, "") || challan.id.replace(/\D/g, "") || "1001";
  return `QR-${num}`;
}

export function getInitialChallans(): Record<string, DeliveryChallan> {
  const challans: DeliveryChallan[] = [
    {
      id: "DC-2026-1001",
      challanNumber: "DC-2026-1001",
      qrId: "QR-1001",
      fpsId: "FPS-101",
      fpsName: "FPS-101 Adarsh Ration Kendra",
      commodity: "Wheat",
      totalQuantity: 120,
      dispatchDate: getDateDaysAgo(12),
      isFifoCompliant: true,
      batches: [
        {
          batchId: "BATCH-WHT-101",
          bayLocation: "Bay A-1",
          dispatchedQty: 120,
          batchAgeDays: 73,
        },
      ],
      vehicleNumber: "DL-1LM-4402",
      driverName: "Mohan Lal",
      gateStatus: "CLEARED_EXIT",
      gateExitTimestamp: Date.now() - 12 * 86400000 + 3600000,
      gateSecurityOfficer: "Havildar Ramesh (Gate 1)",
      loadingStatus: "LOADED",
      loadingSupervisor: "Ram Prasad (Loader Gang 1)",
      loadingCompletedTimestamp: Date.now() - 12 * 86400000 + 1800000,
      createdAt: Date.now() - 12 * 86400000,
    },
    {
      id: "DC-2026-1002",
      challanNumber: "DC-2026-1002",
      qrId: "QR-1002",
      fpsId: "FPS-102",
      fpsName: "FPS-102 Janata PDS Seva Kendra",
      commodity: "Rice",
      totalQuantity: 90,
      dispatchDate: getDateDaysAgo(7),
      isFifoCompliant: true,
      batches: [
        {
          batchId: "BATCH-RIC-092",
          bayLocation: "Bay A-3",
          dispatchedQty: 90,
          batchAgeDays: 88,
        },
      ],
      vehicleNumber: "DL-1LM-8120",
      driverName: "Balbir Singh",
      gateStatus: "CLEARED_EXIT",
      gateExitTimestamp: Date.now() - 7 * 86400000 + 4200000,
      gateSecurityOfficer: "Havildar Ramesh (Gate 1)",
      loadingStatus: "LOADED",
      loadingSupervisor: "Sohan Lal (Loader Gang 3)",
      loadingCompletedTimestamp: Date.now() - 7 * 86400000 + 2100000,
      createdAt: Date.now() - 7 * 86400000,
    },
    {
      id: "DC-2026-1003",
      challanNumber: "DC-2026-1003",
      qrId: "QR-1003",
      fpsId: "FPS-103",
      fpsName: "FPS-103 Kalyan Sahakari Bhandar",
      commodity: "Edible Oil",
      totalQuantity: 40,
      dispatchDate: getDateDaysAgo(3),
      isFifoCompliant: false,
      batches: [
        {
          batchId: "BATCH-OIL-033",
          bayLocation: "Bay B-2",
          dispatchedQty: 40,
          batchAgeDays: 42,
        },
      ],
      exceptionReason: "Physical Access Blocked",
      exceptionRemarks:
        "Forklift corridor maintenance at Bay B-2 stack rear; front stack accessed with officer authorization.",
      approvingOfficer: "A. K. Sharma (Assistant Godown Officer)",
      vehicleNumber: "DL-1LM-9055",
      driverName: "Sanjay Kumar",
      gateStatus: "PENDING_EXIT",
      loadingStatus: "IN_PROGRESS",
      loadingSupervisor: "Dharampal (Loader Gang 2)",
      createdAt: Date.now() - 3 * 86400000,
    },
    {
      id: "DC-2026-1004",
      challanNumber: "DC-2026-1004",
      qrId: "QR-1004",
      fpsId: "FPS-105",
      fpsName: "FPS-105 Pragati Mahila PDS Samiti",
      commodity: "Chana Dal",
      totalQuantity: 65,
      dispatchDate: getDateDaysAgo(0),
      isFifoCompliant: true,
      batches: [
        {
          batchId: "BATCH-CND-052",
          bayLocation: "Bay B-3",
          dispatchedQty: 65,
          batchAgeDays: 65,
        },
      ],
      vehicleNumber: "DL-1LM-3210",
      driverName: "Vikram Mehra",
      gateStatus: "PENDING_EXIT",
      loadingStatus: "PENDING",
      createdAt: Date.now() - 3600000,
    },
  ];

  const record: Record<string, DeliveryChallan> = {};
  challans.forEach((c) => {
    record[c.id] = c;
  });
  return record;
}

export function getInitialExceptions(): Record<string, FIFOException> {
  const exception: FIFOException = {
    id: "EXC-2026-001",
    batchId: "BATCH-OIL-033",
    commodity: "Edible Oil",
    fpsId: "FPS-103",
    fpsName: "FPS-103 Kalyan Sahakari Bhandar",
    quantity: 40,
    reason: "Physical Access Blocked",
    remarks:
      "Stack corridor blocked for planned pallet jack ramp inspection. Prioritized front accessible stack.",
    officerName: "A. K. Sharma (Assistant Godown Officer)",
    timestamp: Date.now() - 3 * 86400000,
  };

  return { [exception.id]: exception };
}

export function getInitialAuditLogs(): Record<string, AuditLog> {
  const logs: AuditLog[] = [
    {
      id: "LOG-001",
      action: "INWARD_STOCK",
      description: "Received 250 Quintals Wheat from FCI Regional Depot Karnal at Bay A-1",
      batchId: "BATCH-WHT-101",
      commodity: "Wheat",
      quantity: 250,
      performedBy: "Godown Inspector R. Verma",
      timestamp: Date.now() - 85 * 86400000,
    },
    {
      id: "LOG-002",
      action: "STATUS_CHANGE",
      description: "Marked BATCH-RIC-098 as Under Fumigation for routine 7-day ALP protocol",
      batchId: "BATCH-RIC-098",
      commodity: "Rice",
      quantity: 120,
      performedBy: "Technical Officer P. N. Rao",
      timestamp: Date.now() - 5 * 86400000,
    },
    {
      id: "LOG-003",
      action: "DISPATCH_FIFO",
      description: "Dispatched 120 Q Wheat to FPS-101 Adarsh Ration Kendra (Strict FIFO compliance)",
      batchId: "BATCH-WHT-101",
      commodity: "Wheat",
      quantity: 120,
      performedBy: "Dispatch Clerk M. Joshi",
      timestamp: Date.now() - 12 * 86400000,
    },
    {
      id: "LOG-004",
      action: "DISPATCH_OVERRIDE",
      description: "Manual FIFO Override approved for 40 Q Edible Oil to FPS-103. Reason: Physical Access Blocked",
      batchId: "BATCH-OIL-033",
      commodity: "Edible Oil",
      quantity: 40,
      performedBy: "Assistant Godown Officer A. K. Sharma",
      timestamp: Date.now() - 3 * 86400000,
    },
  ];

  const record: Record<string, AuditLog> = {};
  logs.forEach((l) => {
    record[l.id] = l;
  });
  return record;
}

// Check and seed if empty
export async function autoSeedIfEmpty(): Promise<boolean> {
  try {
    const batchesRef = ref(db, `${ROOT_PATH}/batches`);
    const snapshot = await get(batchesRef);
    if (!snapshot.exists() || Object.keys(snapshot.val() || {}).length === 0) {
      await forceResetDemoData();
      return true;
    }
    return false;
  } catch (err) {
    console.error("Auto seed check failed:", err);
    return false;
  }
}

// Force reset demo data (called by "Reset Demo Data" button in header)
export async function forceResetDemoData(): Promise<void> {
  const shopsRecord: Record<string, FairPriceShop> = {};
  INITIAL_SHOPS.forEach((s) => {
    shopsRecord[s.id] = s;
  });

  const payload = {
    batches: getInitialBatches(),
    fpsShops: shopsRecord,
    challans: getInitialChallans(),
    exceptions: getInitialExceptions(),
    auditLogs: getInitialAuditLogs(),
  };

  const rootRef = ref(db, ROOT_PATH);
  await set(rootRef, payload);
}

// Add new inward batch
export async function addInwardBatch(batch: Batch): Promise<void> {
  const batchRef = ref(db, `${ROOT_PATH}/batches/${batch.id}`);
  await set(batchRef, batch);

  // Add audit log
  const logRef = push(ref(db, `${ROOT_PATH}/auditLogs`));
  const newLog: AuditLog = {
    id: logRef.key || `LOG-${Date.now()}`,
    action: "INWARD_STOCK",
    description: `Received inward consignment of ${batch.receivedQty} Q ${batch.commodity} (Batch ${batch.id}) at ${batch.bayLocation}`,
    batchId: batch.id,
    commodity: batch.commodity,
    quantity: batch.receivedQty,
    performedBy: "Godown Inward Officer",
    timestamp: Date.now(),
  };
  await set(logRef, newLog);
}

// Update batch status (e.g., fumigation toggle, quality hold)
export async function updateBatchStatus(
  batchId: string,
  newStatus: Batch["status"],
  note?: string
): Promise<void> {
  const updates: Record<string, any> = {
    [`${ROOT_PATH}/batches/${batchId}/status`]: newStatus,
  };
  if (note !== undefined) {
    if (newStatus === "Under Fumigation") {
      updates[`${ROOT_PATH}/batches/${batchId}/fumigationNote`] = note;
    } else if (newStatus === "Quality Hold") {
      updates[`${ROOT_PATH}/batches/${batchId}/qualityNote`] = note;
    }
  }

  await update(ref(db), updates);

  // Add audit log
  const logRef = push(ref(db, `${ROOT_PATH}/auditLogs`));
  await set(logRef, {
    id: logRef.key || `LOG-${Date.now()}`,
    action: "STATUS_CHANGE",
    description: `Batch ${batchId} status updated to [${newStatus}]${note ? `: ${note}` : ""}`,
    batchId,
    performedBy: "Quality / Technical Inspector",
    timestamp: Date.now(),
  });
}

// Log spillage / driage adjustment
export async function logDriageAdjustment(
  batchId: string,
  currentRemaining: number,
  deductionQty: number,
  reason: string
): Promise<void> {
  const newQty = Math.max(0, currentRemaining - deductionQty);
  const status = newQty === 0 ? "Depleted" : "Eligible";

  await update(ref(db), {
    [`${ROOT_PATH}/batches/${batchId}/remainingQty`]: newQty,
    [`${ROOT_PATH}/batches/${batchId}/status`]: status,
  });

  const logRef = push(ref(db, `${ROOT_PATH}/auditLogs`));
  await set(logRef, {
    id: logRef.key || `LOG-${Date.now()}`,
    action: "DRIAGE_ADJUSTMENT",
    description: `Deducted ${deductionQty} Q from ${batchId} due to ${reason}. Balance adjusted to ${newQty} Q`,
    batchId,
    quantity: deductionQty,
    performedBy: "Physical Stock Verifier",
    timestamp: Date.now(),
  });
}

// Freeze & Recall Batch
export async function recallBatch(
  batchId: string,
  reason: string,
  affectedShopsCount: number
): Promise<void> {
  await update(ref(db), {
    [`${ROOT_PATH}/batches/${batchId}/status`]: "Quality Hold",
    [`${ROOT_PATH}/batches/${batchId}/qualityNote`]: `RECALLED: ${reason}`,
  });

  const logRef = push(ref(db, `${ROOT_PATH}/auditLogs`));
  await set(logRef, {
    id: logRef.key || `LOG-${Date.now()}`,
    action: "BATCH_RECALL",
    description: `EMERGENCY RECALL executed for Batch ${batchId}. Reason: ${reason}. ${affectedShopsCount} Fair Price Shops notified for halt of distribution.`,
    batchId,
    performedBy: "District Food & Civil Supplies Officer",
    timestamp: Date.now(),
  });
}

// Issue Delivery Challan and execute stock deductions
export async function issueDeliveryChallan(
  challan: DeliveryChallan,
  exceptionData?: {
    reason: FIFOException["reason"];
    remarks: string;
    officerName: string;
  }
): Promise<void> {
  const updates: Record<string, any> = {};

  // 1. Add Challan (with default pending exit status for gate security and qrId)
  const qrId = challan.qrId || getChallanQrId(challan);
  const preparedChallan: DeliveryChallan = {
    ...challan,
    qrId,
    gateStatus: challan.gateStatus || "PENDING_EXIT",
    loadingStatus: challan.loadingStatus || "PENDING",
  };
  updates[`${ROOT_PATH}/challans/${challan.id}`] = preparedChallan;

  // 2. If exception, record FIFO exception
  if (exceptionData) {
    const excId = `EXC-${Date.now()}`;
    const excRecord: FIFOException = {
      id: excId,
      batchId: challan.batches[0]?.batchId || "N/A",
      commodity: challan.commodity,
      fpsId: challan.fpsId,
      fpsName: challan.fpsName,
      quantity: challan.totalQuantity,
      reason: exceptionData.reason,
      remarks: exceptionData.remarks,
      officerName: exceptionData.officerName,
      timestamp: Date.now(),
    };
    updates[`${ROOT_PATH}/exceptions/${excId}`] = excRecord;
  }

  // 3. Update remainingQty of each dispatched batch
  for (const item of challan.batches) {
    const batchSnap = await get(ref(db, `${ROOT_PATH}/batches/${item.batchId}`));
    if (batchSnap.exists()) {
      const currentBatch = batchSnap.val() as Batch;
      const newRemaining = Math.max(0, currentBatch.remainingQty - item.dispatchedQty);
      const newStatus = newRemaining === 0 ? "Depleted" : currentBatch.status;
      updates[`${ROOT_PATH}/batches/${item.batchId}/remainingQty`] = newRemaining;
      updates[`${ROOT_PATH}/batches/${item.batchId}/status`] = newStatus;
    }
  }

  // 4. Record Audit Log
  const logId = `LOG-${Date.now()}`;
  const logRecord: AuditLog = {
    id: logId,
    action: challan.isFifoCompliant ? "DISPATCH_FIFO" : "DISPATCH_OVERRIDE",
    description: `Issued DC ${challan.challanNumber} to ${challan.fpsName} for ${challan.totalQuantity} Q ${challan.commodity}. ${
      challan.isFifoCompliant
        ? "Strict FIFO multi-batch compliant."
        : `FIFO Override: ${exceptionData?.reason || "Approved exception"}`
    }`,
    commodity: challan.commodity,
    quantity: challan.totalQuantity,
    performedBy: exceptionData?.officerName || "Godown Dispatch Desk",
    timestamp: Date.now(),
  };
  updates[`${ROOT_PATH}/auditLogs/${logId}`] = logRecord;

  await update(ref(db), updates);
}

// Security Gate Pass verification & Exit Clearance
export async function updateChallanGateExit(
  challanId: string,
  officerName: string = "Head Gate Guard"
): Promise<void> {
  const updates: Record<string, any> = {};
  const now = Date.now();
  updates[`${ROOT_PATH}/challans/${challanId}/gateStatus`] = "CLEARED_EXIT";
  updates[`${ROOT_PATH}/challans/${challanId}/gateExitTimestamp`] = now;
  updates[`${ROOT_PATH}/challans/${challanId}/gateSecurityOfficer`] = officerName;

  const logId = `LOG-${now}`;
  const logRecord: AuditLog = {
    id: logId,
    action: "DISPATCH_FIFO",
    description: `GATE SECURITY CLEARANCE: Challan ${challanId} physically verified and cleared at Godown Exit Gate by ${officerName}. Consignment departed in transit.`,
    quantity: 0,
    performedBy: officerName,
    timestamp: now,
  };
  updates[`${ROOT_PATH}/auditLogs/${logId}`] = logRecord;

  await update(ref(db), updates);
}

// Loader Verification & Physical Loading Sign-off
export async function updateChallanLoadingStatus(
  challanId: string,
  status: "IN_PROGRESS" | "LOADED",
  supervisorName: string = "Loader Lead",
  verifiedBagsByBatch?: Record<string, number>
): Promise<void> {
  const updates: Record<string, any> = {};
  const now = Date.now();
  updates[`${ROOT_PATH}/challans/${challanId}/loadingStatus`] = status;
  updates[`${ROOT_PATH}/challans/${challanId}/loadingSupervisor`] = supervisorName;
  if (status === "LOADED") {
    updates[`${ROOT_PATH}/challans/${challanId}/loadingCompletedTimestamp`] = now;
  }
  if (verifiedBagsByBatch) {
    updates[`${ROOT_PATH}/challans/${challanId}/verifiedBagsByBatch`] = verifiedBagsByBatch;
  }

  const logId = `LOG-${now}`;
  const logRecord: AuditLog = {
    id: logId,
    action: "DISPATCH_FIFO",
    description: `LOADER VERIFICATION: Challan ${challanId} physical loading ${
      status === "LOADED" ? "VERIFIED & SIGNED OFF" : "IN PROGRESS"
    } by ${supervisorName}. Stacks physically verified on truck.`,
    quantity: 0,
    performedBy: supervisorName,
    timestamp: now,
  };
  updates[`${ROOT_PATH}/auditLogs/${logId}`] = logRecord;

  await update(ref(db), updates);
}

