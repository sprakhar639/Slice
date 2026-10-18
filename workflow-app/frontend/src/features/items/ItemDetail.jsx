import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api.js";
import { NEXT, PRIORITIES, atLeast, box, label } from "../../shared/constants.js";

function describe(a) {
  const d = a.data;
  switch (a.type) {
    case "CREATED": return "created the item";
    case "STATUS_CHANGE": return `changed status ${label(d.from)} → ${label(d.to)}`;
    case "PRIORITY_CHANGE": return `changed priority ${d.from} → ${d.to}`;
    case "ASSIGNEE_CHANGE": return `changed assignee (user ${d.from ?? "none"} → ${d.to ?? "none"})`;
    case "FIELDS_UPDATED": return `edited ${d.fields.join(", ")}`;
    case "COMMENT": return `commented: ${d.body}`;
    default: return a.type;
  }
}

export default function ItemDetail({ id, me, onBack }) {
  const qc = useQueryClient();
  const [err, setErr] = useState("");
  const [comment, setComment] = useState("");
  const [fields, setFields] = useState({ title: "", description: "", dueDate: "" });
  const { data: item } = useQuery({ queryKey: ["item", id], queryFn: () => api(`/items/${id}`), refetchInterval: 10000 });
  useEffect(() => {
    if (item) setFields({
      title: item.title,
      description: item.description ?? "",
      dueDate: item.dueDate ? item.dueDate.slice(0, 10) : "",
    });
  }, [item?.id, item?.version]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["item", id] });
    qc.invalidateQueries({ queryKey: ["items"] });
  };

  const patch = useMutation({
    mutationFn: (changes) => api(`/items/${id}`, { method: "PATCH", body: { version: item.version, ...changes } }),
    onSuccess: () => setErr(""),
    onError: (e) => setErr(e.message),
    onSettled: refresh,
  });
  const addComment = useMutation({
    mutationFn: () => api(`/items/${id}/comments`, { method: "POST", body: { body: comment } }),
    onSuccess: () => { setComment(""); setErr(""); },
    onError: (e) => setErr(e.message),
    onSettled: refresh,
  });

  if (!item) return <p>Loading…</p>;
  const canEdit = atLeast(item.myRole, "MEMBER");
  const closed = item.status === "CLOSED";
  const team = me.teams.find((t) => t.id === item.teamId);
  const nexts = NEXT[item.status].filter((s) => item.status !== "AWAITING_APPROVAL" || atLeast(item.myRole, "LEAD"));

  return (
    <div>
      <button onClick={onBack}>← Back</button>
      <h2>#{item.id} {item.title}</h2>
      {err && <p style={{ color: "red" }}>{err}</p>}
      <div style={box}>
        <p><label>Title: <input style={{ width: "70%" }} value={fields.title} disabled={!canEdit || closed} onChange={(e) => setFields({ ...fields, title: e.target.value })} /></label></p>
        <p><label>Description:<br /><textarea style={{ width: "90%", minHeight: 70 }} value={fields.description} disabled={!canEdit || closed} onChange={(e) => setFields({ ...fields, description: e.target.value })} /></label></p>
        <p><label>Due date: <input type="date" value={fields.dueDate} disabled={!canEdit || closed} onChange={(e) => setFields({ ...fields, dueDate: e.target.value })} /></label></p>
        {canEdit && !closed && <button onClick={() => patch.mutate({ title: fields.title, description: fields.description, dueDate: fields.dueDate ? new Date(`${fields.dueDate}T00:00:00.000Z`).toISOString() : null })}>Save details</button>}
        <p>
          Type: {label(item.type)} | Team: {item.team.name} | Created by: {item.createdBy.name} | Due: {item.dueDate?.slice(0, 10) ?? "—"} | Version: {item.version} | Your role: {item.myRole}
        </p>
        <p>
          Status: <b>{label(item.status)}</b>{" "}
          {canEdit && nexts.map((s) => (
            <button key={s} onClick={() => patch.mutate({ status: s })}>
              {item.status === "AWAITING_APPROVAL" ? (s === "RESOLVED" ? "Approve" : "Reject") : "→"} {label(s)}
            </button>
          ))}
          {item.status === "AWAITING_APPROVAL" && !atLeast(item.myRole, "LEAD") && <i> (waiting for a Lead)</i>}
        </p>
        <p>
          Priority:{" "}
          <select disabled={!canEdit || closed} value={item.priority} onChange={(e) => patch.mutate({ priority: e.target.value })}>
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>{" "}
          Assignee:{" "}
          <select disabled={!canEdit || closed} value={item.assigneeId ?? ""} onChange={(e) => patch.mutate({ assigneeId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Unassigned</option>
            {team?.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </p>
      </div>
      <h3>Activity</h3>
      <ul>
        {item.activities.map((a) => (
          <li key={a.id}>
            <small>{new Date(a.createdAt).toLocaleString()}</small> <b>{a.actor.name}</b> {describe(a)}
          </li>
        ))}
      </ul>
      {canEdit && (
        <div>
          <input style={{ width: "60%" }} placeholder="Add a comment" value={comment} onChange={(e) => setComment(e.target.value)} />{" "}
          <button disabled={!comment} onClick={() => addComment.mutate()}>Comment</button>
        </div>
      )}
    </div>
  );
}
