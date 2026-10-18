import { loginUser } from "./auth.service.js";

export async function login(req, res, next) {
try {
const { username, password } = req.body ?? {};

```
if (
  typeof username !== "string" ||
  typeof password !== "string" ||
  !username.trim() ||
  !password
) {
  return res.status(400).json({
    message: "Username and password are required",
  });
}

const user = await loginUser(username.trim(), password);

if (!user) {
  return res.status(401).json({
    message: "Invalid username or password",
  });
}

req.session.regenerate((error) => {
  if (error) return next(error);

  req.session.user = user;

  req.session.save((saveError) => {
    if (saveError) return next(saveError);

    res.status(200).json({
      message: "Login successful",
      user,
    });
  });
});
```

} catch (error) {
next(error);
}
}

export function logout(req, res, next) {
req.session.destroy((error) => {
if (error) return next(error);

```
res.clearCookie("connect.sid");
res.status(200).json({
  message: "Logout successful",
});
```

});
}

export function getCurrentUser(req, res) {
res.status(200).json({
user: req.session.user,
});
}
