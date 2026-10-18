import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, getToken, setToken } from "./shared/api.js";
import Login from "./features/auth/Login.jsx";
import Dashboard from "./features/dashboard/Dashboard.jsx";
import ItemDetail from "./features/items/ItemDetail.jsx";
import NewItem from "./features/items/NewItem.jsx";

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [page, setPage] = useState("dash");
  const [openId, setOpenId] = useState(null);
  const user = useQuery({ queryKey: ["me"], queryFn: () => api("/auth/me"), enabled: authed, retry: false });
  const teams = useQuery({ queryKey: ["teams"], queryFn: () => api("/teams"), enabled: authed, retry: false });
  const logout = () => { setToken(null); setAuthed(false); };

  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  if (user.isError || teams.isError) return <p>Session problem. <button onClick={logout}>Log in again</button></p>;
  if (!user.data || !teams.data) return <p>Loading…</p>;
  const me = { ...user.data, teams: teams.data };

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <b>Work Items</b>
        <button onClick={() => { setPage("dash"); setOpenId(null); }}>Dashboard</button>
        <button onClick={() => { setPage("new"); setOpenId(null); }}>New item</button>
        <span style={{ marginLeft: "auto" }}>{me.name} ({me.teams.map((t) => `${t.name}: ${t.role}`).join(", ")})</span>
        <button onClick={logout}>Logout</button>
      </header>
      {openId ? (
        <ItemDetail id={openId} me={me} onBack={() => setOpenId(null)} />
      ) : page === "new" ? (
        <NewItem me={me} onCreated={(id) => { setPage("dash"); setOpenId(id); }} />
      ) : (
        <Dashboard me={me} onOpen={setOpenId} />
      )}
    </div>
  );
}
