import { COMMODITIES } from "../types";

export interface GodownSettings {
  officerName: string;
  officerDesignation: string;
  godownName: string;
  commodities: string[];
}

const STORAGE_KEY_COMMODITIES = "stockme_commodities";
const STORAGE_KEY_OFFICER_NAME = "stockme_officer_name";
const STORAGE_KEY_OFFICER_DESIGNATION = "stockme_officer_designation";
const STORAGE_KEY_GODOWN_NAME = "stockme_godown_name";

export const DEFAULT_OFFICER_NAME = "A. K. Sharma";
export const DEFAULT_OFFICER_DESIGNATION = "Assistant Godown Officer";
export const DEFAULT_GODOWN_NAME = "State Buffer Godown Unit-4";

export function getStoredCommodities(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COMMODITIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge with core default commodities to guarantee none are lost
        const set = new Set([...COMMODITIES, ...parsed]);
        return Array.from(set);
      }
    }
  } catch (e) {
    console.error("Error reading stored commodities:", e);
  }
  return [...COMMODITIES];
}

export function saveStoredCommodities(commodities: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_COMMODITIES, JSON.stringify(commodities));
    window.dispatchEvent(new CustomEvent("stockme-settings-changed"));
  } catch (e) {
    console.error("Error saving stored commodities:", e);
  }
}

export function getStoredOfficerName(): string {
  try {
    const name = localStorage.getItem(STORAGE_KEY_OFFICER_NAME);
    if (name && name.trim()) return name.trim();
  } catch (e) {
    console.error("Error reading stored officer name:", e);
  }
  return DEFAULT_OFFICER_NAME;
}

export function saveStoredOfficerName(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_OFFICER_NAME, name.trim());
    window.dispatchEvent(new CustomEvent("stockme-settings-changed"));
  } catch (e) {
    console.error("Error saving stored officer name:", e);
  }
}

export function getStoredOfficerDesignation(): string {
  try {
    const desig = localStorage.getItem(STORAGE_KEY_OFFICER_DESIGNATION);
    if (desig && desig.trim()) return desig.trim();
  } catch (e) {
    console.error("Error reading stored officer designation:", e);
  }
  return DEFAULT_OFFICER_DESIGNATION;
}

export function saveStoredOfficerDesignation(designation: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_OFFICER_DESIGNATION, designation.trim());
    window.dispatchEvent(new CustomEvent("stockme-settings-changed"));
  } catch (e) {
    console.error("Error saving stored officer designation:", e);
  }
}

export function getStoredGodownName(): string {
  try {
    const godown = localStorage.getItem(STORAGE_KEY_GODOWN_NAME);
    if (godown && godown.trim()) return godown.trim();
  } catch (e) {
    console.error("Error reading stored godown name:", e);
  }
  return DEFAULT_GODOWN_NAME;
}

export function saveStoredGodownName(godown: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_GODOWN_NAME, godown.trim());
    window.dispatchEvent(new CustomEvent("stockme-settings-changed"));
  } catch (e) {
    console.error("Error saving stored godown name:", e);
  }
}
