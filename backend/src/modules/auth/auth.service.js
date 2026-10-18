import bcrypt from "bcryptjs";
import { pool } from "../../config/db.js";

export async function loginUser(username, password) {
const result = await pool.query(
`SELECT id, username, email, name, "passwordHash"
     FROM "User"
     WHERE username = $1 OR email = $1
     LIMIT 1`,
[username]
);

const user = result.rows[0];

if (!user) return null;

const valid = await bcrypt.compare(password, user.passwordHash);

if (!valid) return null;

const { passwordHash, ...safeUser } = user;
return safeUser;
}
