import { useState } from "react";
import { api, setToken } from "../../shared/api.js";

export default function Login({ onDone }) {
  const [email, setEmail] = useState("mia@example.com");
  const [password, setPassword] = useState("password123");
  const [err, setErr] = useState("");

  const submit = async () => {
    try {
      setToken((await api("/auth/login", { method: "POST", body: { email, password } })).token);
      onDone();
    } catch (e) { setErr(e.message); }
  };

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 360, margin: "60px auto" }}>
      <h2>Login</h2>
      <input style={{ width: "100%" }} value={email} onChange={(e) => setEmail(e.target.value)} /><br />
      <input style={{ width: "100%", marginTop: 8 }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} /><br />
      <button style={{ marginTop: 8 }} onClick={submit}>Sign in</button>
      {err && <p style={{ color: "red" }}>{err}</p>}
      <p style={{ fontSize: 12 }}>
        Demo (password123): admin@ (Admin), lee@ (Lead of Support), mia@ (Member), sam@ (Payments member), vic@ (Viewer) — all @example.com
      </p>
    </div>
  );
}
