<div align="center">

# 🌾 FoodStock (StockMe)
### *Next-Gen iPDS Godown Smart Allocation, Multi-Tier Security Verification & FIFO Supply-Chain Auditing Platform*

<br/>

[![TECHTRIX'26 Hackathon Winner](https://img.shields.io/badge/🏆_1st_Position_Winner-TECHTRIX'26_Hackathon-gold?style=for-the-badge&logo=award&logoColor=black)](#-hackathon-victory)
[![Hosted by](https://img.shields.io/badge/Hosted_By-I.T.S_Engineering_College-blue?style=for-the-badge)](#-hackathon-victory)

<br/>

[![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![HeroUI](https://img.shields.io/badge/HeroUI-Component_System-000000?style=flat-square)](https://heroui.com/)
[![Firebase](https://img.shields.io/badge/Firebase_Realtime_DB-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com/)

</div>

---

## 🏆 Hackathon Victory

> **🥇 1st Prize Winner — TECHTRIX'26 Hackathon**  
> **Host Institution:** I.T.S Engineering College, Greater Noida  
> **Problem Statement:** Transforming government grain warehousing, eliminating leakages, automating statutory FIFO allocations, and establishing cryptographic gate-exit verification in the Public Distribution System (PDS / NFSA).

FoodStock (StockMe) was conceptualized, built, and awarded **First Place** among competitive engineering teams for its end-to-end operational architecture, zero-leakage security model, and government-grade UI design.

---

## 📌 Executive Summary

India's Public Distribution System handles over **80 million metric tonnes** of food grains annually across thousands of State Buffer Godowns and FCI bases. However, manual record-keeping leads to:
1. **Grain Spoilage**: Freshly received grain bags get issued first, while older stocks rot deep inside warehouse bays due to lack of strict First-In-First-Out (FIFO) discipline.
2. **Diversion & Gate Fraud**: Trucks leave godowns with unverified grain sacks or duplicate paperwork before loaders finish stacking.
3. **Ghost Consignments**: Lack of cryptographic traceability makes it impossible to verify whether a dispatched batch reached its designated Fair Price Shop (FPS).
4. **Emergency Contamination Halts**: When a consignment fails moisture or pest checks, isolating infected batches across the downstream supply chain takes days.

**FoodStock** bridges this gap by introducing a **statutory, zero-trust digital twin** of the warehouse with physical sack-level barcode/QR scanning, automated FIFO priority dispatch, inter-godown critical shelf-life reallocation, and cryptographically verified exit gate clearance.

---

## 🌟 Key USPs & Core Features

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   FOODSTOCK ARCHITECTURE                               │
└────────────────────────────────────────────────────────────────────────────────────────┘
       │                                       │                                  │
       ▼                                       ▼                                  ▼
┌───────────────────────┐             ┌─────────────────────────┐       ┌───────────────────────┐
│  INWARD CONSIGNMENT   │             │   SMART FIFO ENGINE     │       │   CRITICAL TRANSFER   │
│ • Stack Card Generator│ ──────────► │ • Oldest-Batch Priority │ ────► │ • Expiring Stock Alert│
│ • Bay Moisture Check  │             │ • Non-FIFO Justification│       │ • Inter-Godown Pass   │
│ • Anti-Burst Sack QRs │             │ • Delivery Challan Gen  │       │ • Spoilage Prevention │
└───────────────────────┘             └─────────────────────────┘       └───────────────────────┘
                                                   │
                                                   ▼
                                      ┌─────────────────────────┐
                                      │  MULTI-STAGE SECURITY   │
                                      │ • /loader Sack Tally    │
                                      │ • Dynamic Challan QR    │
                                      │ • /scan Gate Clearance  │
                                      └─────────────────────────┘
```

### 1. 🛡️ Cryptographic Multi-Stage Security & Gate Exit Protocol (`/loader` & `/scan`)
* **Sack-to-Challan Physical Tally (`/loader`)**: Loaders must physically scan individual jute bag QR codes as sacks enter the truck. Built-in **anti-duplication burst throttling** guarantees that each sack serial is registered exactly once without duplicate scan floods.
* **Dynamic Lifecycle QR Payloads**: The official government Delivery Challan QR starts in `pending_loading`. Only after the loader portal confirms that 100% of the prescribed bags have been scanned does the QR state flip to `eligible_exit`.
* **Zero-Trust Gate Guard Terminal (`/scan`)**: Godown gate security officers operate a dedicated handheld scanner. If a truck attempts to exit while loading is incomplete or the challan status is unverified, the system immediately rejects the vehicle with a high-visibility warning. Once cleared, the exit timestamp, vehicle registration, and security officer ID are cryptographically etched into the immutable audit trail.

### 2. 🚨 Automated Critical Stock Engine & Inter-Godown Transfer
* **Quarter-Life Countdown & Visual Triage**: Stocks are categorized into dynamic shelf-life tiers (<30 days = *Critical Red*, 30–60 days = *Warning Amber*, >60 days = *Healthy Green*).
* **Inter-Godown Priority Transfer Pass**: Godown officers can trigger an emergency reallocation to nearby high-demand government buffer units (e.g., Delhi East, North, South depots). The system generates an official Inter-Godown Transfer Pass with authorized signatures, reducing local stock balance to prevent decay.

### 3. ⚡ Smart FIFO Dispatch Engine & Statutory Override Protocol
* **Automated Batch Allocation**: When a Fair Price Shop submits a ration requisition, the algorithm traverses all active stacks across 12 Godown Bays and automatically selects the oldest eligible stock.
* **Statutory Non-FIFO Override (Form PDS-EX-02)**: If physical access to an older stack is blocked by forklift maintenance or aeration, bypassing FIFO requires mandatory officer authorization with statutory audit remarks, permanently logged in the public ledger.

### 4. 📦 12-Bay Godown Digital Twin & Environmental Monitoring
* **Interactive Bay Layout**: Real-time physical floor plan mapping Bays A-1 to A-6 and B-1 to B-6.
* **Stack Cards & Driage Logging**: Real-time moisture content tracking, 7-day Aluminum Phosphide (ALP) fumigation lockout controls, and statutory moisture-loss (driage) adjustments.

### 5. 🔍 Complete Batch Traceability & Emergency Recall
* **End-to-End Consignment Lineage**: Drill down into any inward grain batch to inspect every single downstream Delivery Challan, receiving FPS dealer, and vehicle number.
* **Instant Supply-Chain Recall**: One-click emergency recall halts distribution across all active trucks and fair price shops, isolating compromised grain stacks instantly.

### 6. ⚙️ Master Commodity Catalog & Statutory Officer Settings
* **Dynamic Commodity Catalog**: Register new grains, pulses, and state-extended commodities (e.g., *Bajra*, *Barley*, *Mustard Seeds*, *Ragi*, *Jowar*). Newly added items propagate immediately across Inward Intake, FIFO Dispatch, Inventory Filters, and Analytics.
* **Official Signature Stamp Personalization**: Update the Authorized Officer Name, Official Rank/Designation, and Buffer Unit Name with a live preview of the government dispatch stamp.

---

## 📱 Dedicated Operational Portals

| Route | Role | Description |
|:---|:---|:---|
| `/` | **Godown Commander** | Master dashboard, stock triage, FIFO dispatches, bay digital twin, audit ledger, and settings. |
| `/loader` | **Loading Supervisor** | Physical sack QR scanner terminal with real-time progress bar, anti-duplication filter, and clearance issuance. |
| `/scan` | **Gate Security Officer** | High-contrast gate barrier terminal to inspect Challan QRs and authorize vehicle exit. |

---

## 🛠️ Technology Stack

| Layer | Technologies |
|:---|:---|
| **Core Framework** | [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite 8](https://vitejs.dev/) |
| **Design System** | [HeroUI](https://heroui.com/) *(Pure enterprise UI architecture)* |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) *(Tailored tokens, glassmorphism, zero custom CSS slop)* |
| **Realtime Engine** | [Firebase Realtime Database](https://firebase.google.com/) *(Realtime multi-device sync with offline buffer)* |
| **Icons & Visuals** | [Lucide React](https://lucide.dev/), [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti) |
| **QR Code Engine** | Inline Vector SVG QR Renderer *(Self-contained, zero external tracking)* |
| **Printing System** | Standard A4 Government Delivery Challan & Gate Pass Print Engine |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lovechn1407-debug/StockMe.git
   cd StockMe
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables (Optional):**
   Create a `.env` file in the root directory if connecting to a custom Firebase instance:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```
   *(Note: The application includes instant built-in demo auto-seeding with realistic buffer stock data if offline).*

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

5. **Build for production:**
   ```bash
   npm run build
   ```

---

## 📄 Print & Statutory Compliance

FoodStock features **native print stylesheets** formatted strictly for Indian government documentation:
- **Delivery Challan (Form PDS-DC)**: Certified copies in *Original (Fair Price Shop)*, *Duplicate (Transporter)*, and *Triplicate (Godown Office)* formats.
- **Physical Sack Stack Cards**: Compliant with Central Warehousing Corporation (CWC) stack monitoring norms.
- **Gate Exit Clearance Pass**: Includes security seal, truck chassis/plate registration, and dispatch timestamp.

---

## 🎖️ Acknowledgments

- **I.T.S Engineering College, Greater Noida** for organizing and hosting **TECHTRIX'26**.
- The jury and evaluation panel for recognizing the real-world impact of public distribution digitalization.
- Department of Food & Public Distribution (DFPD) and National Food Security Act (NFSA) guidelines for operational protocols.

---

<div align="center">
  <sub>Built with ❤️ by the winning team at <strong>TECHTRIX'26</strong>. Dedicated to transparent, leakage-free food security for all.</sub>
</div>
