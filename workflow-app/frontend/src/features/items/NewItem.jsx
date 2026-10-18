import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { PRIORITIES, TYPES, atLeast, label } from "../../shared/constants.js";

export default function NewItem({ me, onCreated }) {
  const teams = me.teams.filter((t) => atLeast(t.role, "MEMBER"));

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "TASK",
    priority: "MEDIUM",
    teamId: "",
    assigneeId: "",
    dueDate: "",
  });

  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (teams.length > 0) {
      setForm((current) => ({
        ...current,
        teamId: current.teamId || String(teams[0].id),
      }));
    }
  }, [me, teams]);

  const team = teams.find((t) => String(t.id) === String(form.teamId));

  const up = (key) => (e) => {
    setForm((current) => ({
      ...current,
      [key]: e.target.value,
    }));
  };

  const submit = async () => {
    setErr("");

    if (!form.title.trim()) {
      setErr("Title is required.");
      return;
    }

    const teamId = Number(form.teamId);

    if (!form.teamId || !Number.isInteger(teamId) || teamId <= 0) {
      setErr("Please select a valid team.");
      return;
    }

    try {
      setSaving(true);

      const item = await api("/items", {
        method: "POST",
        body: {
          title: form.title.trim(),
          description: form.description,
          type: form.type,
          priority: form.priority,
          teamId,
          assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
          dueDate: form.dueDate
            ? new Date(`${form.dueDate}T00:00:00`).toISOString()
            : null,
        },
      });

      onCreated(item.id);
    } catch (e) {
      setErr(e.message || "Failed to create work item.");
    } finally {
      setSaving(false);
    }
  };

  if (teams.length === 0) {
    return <p>You only have Viewer access, so you cannot create items.</p>;
  }

  return (
    <div style={{ display: "grid", gap: 8, maxWidth: 500 }}>
      {" "}
      <h3>New work item</h3>
      ```
      <input placeholder="Title" value={form.title} onChange={up("title")} />
      <textarea
        placeholder="Description"
        value={form.description}
        onChange={up("description")}
      />
      <select value={form.type} onChange={up("type")}>
        {TYPES.map((type) => (
          <option key={type} value={type}>
            {label(type)}
          </option>
        ))}
      </select>
      <select value={form.priority} onChange={up("priority")}>
        {PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {priority}
          </option>
        ))}
      </select>
      <select
        value={form.teamId}
        onChange={(e) =>
          setForm((current) => ({
            ...current,
            teamId: e.target.value,
            assigneeId: "",
          }))
        }
      >
        <option value="">Select a team</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
      <select value={form.assigneeId} onChange={up("assigneeId")}>
        <option value="">Unassigned</option>
        {team?.members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
      <input type="date" value={form.dueDate} onChange={up("dueDate")} />
      <button
        disabled={saving || !form.title.trim() || !form.teamId}
        onClick={submit}
      >
        {saving ? "Creating..." : "Create"}
      </button>
      {err && <p style={{ color: "red" }}>{err}</p>}
    </div>
  );
}
