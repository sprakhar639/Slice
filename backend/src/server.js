import { env } from "./config/env.js";
import app from "./app.js";

const server = app.listen(env.PORT, () => {
console.log(`Server running at http://localhost:${env.PORT}`);
});

function shutdown(signal) {
console.log(`${signal} received. Closing server...`);

server.close((error) => {
if (error) {
console.error("Error while closing server:", error);
process.exitCode = 1;
return;
}

```
process.exitCode = 0;
```

});
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
