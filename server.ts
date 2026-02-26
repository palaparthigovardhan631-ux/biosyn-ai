
import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, "users.json");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Ensure users file exists
  if (!await fs.pathExists(USERS_FILE)) {
    await fs.writeJson(USERS_FILE, {});
  }

  // API Routes
  app.get("/api/user/:email", async (req, res) => {
    try {
      const { email } = req.params;
      const users = await fs.readJson(USERS_FILE);
      const user = users[email] || null;
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/user", async (req, res) => {
    try {
      const userData = req.body;
      if (!userData.email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const users = await fs.readJson(USERS_FILE);
      users[userData.email] = {
        ...users[userData.email],
        ...userData
      };
      await fs.writeJson(USERS_FILE, users, { spaces: 2 });
      res.json(users[userData.email]);
    } catch (error) {
      res.status(500).json({ error: "Failed to save user" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
