import type { Value } from "../store/store";

export const txt = (v: Value): string => (typeof v === "string" ? v : v === undefined ? "" : String(v));
export const asIds = (v: Value): string[] => (Array.isArray(v) ? v : []);
