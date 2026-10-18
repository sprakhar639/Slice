import { atLeast } from "../../shared/constants.js";

// allowed transitions (server-enforced)
export const TRANSITIONS = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["OPEN", "AWAITING_APPROVAL"],
  AWAITING_APPROVAL: ["IN_PROGRESS", "RESOLVED"], // reject / approve: Lead or Admin only
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
};

// returns null if allowed, otherwise { code, msg }
export function transitionError(from, to, role) {
  if (!TRANSITIONS[from].includes(to)) return { code: 400, msg: `Cannot move from ${from} to ${to}` };
  if (from === "AWAITING_APPROVAL" && !atLeast(role, "LEAD"))
    return { code: 403, msg: "Only a Lead or Admin can approve or reject" };
  return null;
}
