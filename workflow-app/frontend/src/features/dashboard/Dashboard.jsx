import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api.js";
import { PRIORITIES, STATUSES, TYPES, label } from "../../shared/constants.js";

const VIEWS = [
  ["assigned", "Assigned to me"],
  ["unassigned_urgent", "Unassigned urgent"],
  ["awaiting_approval", "Awaiting my approval"],
  ["all", "All"],
];

export default function Dashboard({ me, onOpen }) {
  const [view, setView] = useState("assigned");
  const [f, setF] = useState({ q: "", status: "", priority: "", type: "", teamId: "" });
  const [page, setPage] = useState(1);
  const set = (k, v) => { setF({ ...f, [k]: v }); setPage(1); };

  const params = new URLSearchParams({ page: String(page) });
  if (view !== "all") params.set("view", view);
  Object.entries(f).forEach(([k, v]) => v && params.set(k, v));

  const { data } = useQuery({
    queryKey: ["items", params.toString()],
    queryFn: () => api(`/items?${params}`),
    refetchInterval: 10000, // polling instead of websockets
    placeholderData: keepPreviousData,
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const select = (k, opts, name) => (
    <select value={f[k]} onChange={(e) => set(k, e.target.value)}>
      <option value="">{name}</option>
      {opts.map((o) => <option key={o} value={o}>{label(o)}</option>)}
    </select>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {VIEWS.map(([v, t]) => (
          <button key={v} disabled={view === v} onClick={() => { setView(v); setPage(1); }}>{t}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input placeholder="Search title/description" value={f.q} onChange={(e) => set("q", e.target.value)} />
        {select("status", STATUSES, "Any status")}
        {select("priority", PRIORITIES, "Any priority")}
        {select("type", TYPES, "Any type")}
        <select value={f.teamId} onChange={(e) => set("teamId", e.target.value)}>
          <option value="">Any team</option>
          {me.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <table width="100%" cellPadding={4} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr align="left"><th>#</th><th>Title</th><th>Type</th><th>Priority</th><th>Status</th><th>Team</th><th>Assignee</th><th>Due</th></tr>
        </thead>
        <tbody>
          {data?.items.map((i) => (
            <tr key={i.id} style={{ borderTop: "1px solid #ddd", cursor: "pointer" }} onClick={() => onOpen(i.id)}>
              <td>{i.id}</td><td>{i.title}</td><td>{label(i.type)}</td><td>{i.priority}</td>
              <td>{label(i.status)}</td><td>{i.team.name}</td><td>{i.assignee?.name ?? "—"}</td>
              <td>{i.dueDate?.slice(0, 10) ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data && data.items.length === 0 && <p>Nothing here.</p>}
      <p>
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>{" "}
        Page {page} / {pages} ({data?.total ?? 0} items){" "}
        <button disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
      </p>
    </div>
  );
}
