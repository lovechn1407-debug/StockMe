export type CommodityType = string;

export type BatchStatus = "Eligible" | "Under Fumigation" | "Quality Hold" | "Depleted";

export interface Batch {
  id: string; // e.g., BATCH-WHT-101
  commodity: CommodityType;
  supplier: string;
  receiptDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  receivedQty: number; // in Quintals
  remainingQty: number; // in Quintals
  bayLocation: string; // e.g., Bay A-1
  moisturePct: number; // e.g., 11.5%
  status: BatchStatus;
  fumigationNote?: string;
  qualityNote?: string;
  stackCardNumber?: string;
  createdAt: number;
}

export interface FairPriceShop {
  id: string;
  name: string;
  dealerName: string;
  district: string;
  licenseNo: string;
  activeCards: number;
}

export interface DispatchedBatchItem {
  batchId: string;
  bayLocation: string;
  dispatchedQty: number;
  batchAgeDays: number;
}

export interface DeliveryChallan {
  id: string; // e.g., DC-2026-1001
  challanNumber: string;
  qrId?: string; // Official unique QR Code Identifier, e.g. QR-1001
  fpsId: string;
  fpsName: string;
  commodity: CommodityType;
  totalQuantity: number;
  dispatchDate: string;
  isFifoCompliant: boolean;
  batches: DispatchedBatchItem[];
  exceptionReason?: string;
  exceptionRemarks?: string;
  approvingOfficer?: string;
  vehicleNumber?: string;
  driverName?: string;
  gateStatus?: "PENDING_EXIT" | "CLEARED_EXIT";
  gateExitTimestamp?: number;
  gateSecurityOfficer?: string;
  loadingStatus?: "PENDING" | "IN_PROGRESS" | "LOADED";
  loadingCompletedTimestamp?: number;
  loadingSupervisor?: string;
  verifiedBagsByBatch?: Record<string, number>;
  createdAt: number;
}

export interface FIFOException {
  id: string;
  batchId: string;
  commodity: CommodityType;
  fpsId: string;
  fpsName: string;
  quantity: number;
  reason:
    | "Physical Access Blocked"
    | "Fumigation in Progress"
    | "Damaged Packaging"
    | "Quality Re-check"
    | "Emergency Requisition";
  remarks: string;
  officerName: string;
  timestamp: number;
}

export interface AuditLog {
  id: string;
  action:
    | "INWARD_STOCK"
    | "DISPATCH_FIFO"
    | "DISPATCH_OVERRIDE"
    | "STATUS_CHANGE"
    | "DRIAGE_ADJUSTMENT"
    | "BATCH_RECALL";
  description: string;
  batchId?: string;
  commodity?: CommodityType;
  quantity?: number;
  performedBy: string;
  timestamp: number;
}

export const COMMODITIES: CommodityType[] = [
  "Wheat",
  "Rice",
  "Sugar",
  "Salt",
  "Edible Oil",
  "Chana Dal",
  "Tuvar Dal",
];

export const BAY_LOCATIONS = [
  "Bay A-1",
  "Bay A-2",
  "Bay A-3",
  "Bay A-4",
  "Bay A-5",
  "Bay A-6",
  "Bay B-1",
  "Bay B-2",
  "Bay B-3",
  "Bay B-4",
  "Bay B-5",
  "Bay B-6",
];
