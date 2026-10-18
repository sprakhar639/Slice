export const ROLES = ["VIEWER", "MEMBER", "LEAD", "ADMIN"];
export const TYPES = ["INCIDENT", "CUSTOMER_ISSUE", "PAYMENT", "COMPLIANCE", "TASK"];
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
export const STATUSES = ["OPEN", "IN_PROGRESS", "AWAITING_APPROVAL", "RESOLVED", "CLOSED"];

export const atLeast = (role, min) => !!role && ROLES.indexOf(role) >= ROLES.indexOf(min);
