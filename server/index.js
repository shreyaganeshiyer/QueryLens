// import dotenv from "dotenv";
// import path from "path";

// const envPath = path.resolve(process.cwd(), ".env");

// dotenv.config({
//   path: envPath,
//   override: true,
// });
// //const result = dotenv.config({ path: envPath });

// import express from "express";
// import cors from "cors";

// import queryRoutes from "./routes/queries.js";
// import connectionRoutes from "./routes/connections.js";

// import authRoutes from "./routes/auth.js";
// import { ensureAuthSchema } from "./userAuth/authSchema.js";

// import historyRoutes from "./routes/history.js";
// import { ensureHistorySchema } from "./utility/historyDb.js";

// // app's database
// import { ensureSchema } from "./utility/appDb.js";

// const app = express();
// const PORT = Number(process.env.PORT) || 4000;

// app.use(cors({ origin: ["http://localhost:5173"] }));
// app.use(express.json({ limit: "100kb" }));

// app.use("/api/connections", connectionRoutes);
// app.use("/api/queries", queryRoutes);
// app.use("/api/auth", authRoutes);
// app.use("/api/history", historyRoutes);

// app.listen(PORT, async () => {
//   console.log(`QueryLens API running on http://localhost:${PORT}`);
//   try {
//     await ensureSchema();
//     await ensureAuthSchema();
//     await ensureHistorySchema();
//     console.log("App database ready.");
//   } catch (err) {
//     console.error(`Could not set up the app database: ${err.message}`);
//   }
// });

import dotenv from "dotenv";
import path from "path";

// Load environment variables FIRST
const envPath = path.resolve(process.cwd(), ".env");

dotenv.config({
  path: envPath,
  override: true,
});

// Import application modules AFTER loading dotenv
const express = (await import("express")).default;
const cors = (await import("cors")).default;

const queryRoutes = (await import("./routes/queries.js")).default;
const connectionRoutes = (await import("./routes/connections.js")).default;

const authRoutes = (await import("./routes/auth.js")).default;
const { ensureAuthSchema } = await import("./userAuth/authSchema.js");

const historyRoutes = (await import("./routes/history.js")).default;
const { ensureHistorySchema } = await import("./utility/historyDb.js");

const { ensureSchema } = await import("./utility/appDb.js");

// Initialize Express
const app = express();
const PORT = Number(process.env.PORT) || 4000;

// Middleware
app.use(cors({ origin: ["http://localhost:5173"] }));
app.use(express.json({ limit: "100kb" }));

// Routes
app.use("/api/connections", connectionRoutes);
app.use("/api/queries", queryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/history", historyRoutes);

// Start server and initialize database
app.listen(PORT, async () => {
  console.log(`QueryLens API running on http://localhost:${PORT}`);

  try {
    await ensureSchema();
    await ensureAuthSchema();
    await ensureHistorySchema();

    console.log("App database ready.");
  } catch (err) {
    console.error(`Could not set up the app database: ${err.message}`);
  }
});
