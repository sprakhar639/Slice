export const STATUSES = ["OPEN", "IN_PROGRESS", "AWAITING_APPROVAL", "RESOLVED", "CLOSED"];
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
export const TYPES = ["INCIDENT", "CUSTOMER_ISSUE", "PAYMENT", "COMPLIANCE", "TASK"];

// mirrors the server rules only to decide which buttons to show; the server enforces them
export const NEXT = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["OPEN", "AWAITING_APPROVAL"],
  AWAITING_APPROVAL: ["IN_PROGRESS", "RESOLVED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
};

const RANK = ["VIEWER", "MEMBER", "LEAD", "ADMIN"];
export const atLeast = (role, min) => !!role && RANK.indexOf(role) >= RANK.indexOf(min);
export const label = (s) => s.replaceAll("_", " ");
export const box = { border: "1px solid #ccc", padding: 12, marginBottom: 12 };
