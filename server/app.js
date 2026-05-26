require("dotenv").config();

const path = require("path");
const cors = require("cors");
const express = require("express");

const authRoutes = require("./routes/auth");
const memberRoutes = require("./routes/members");
const inviteLinkRoutes = require("./routes/inviteLinks");
const signupRoutes = require("./routes/signup");
const { hasDatabaseConfig } = require("./db");

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "..", "public");

app.use(cors());
app.use(express.json());
app.use(express.static(publicDir));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    databaseConfigured: hasDatabaseConfig(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/invite-links", inviteLinkRoutes);
app.use("/api/signup", signupRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "login.html"));
});

app.use((req, res) => {
  res.status(404).json({ message: "요청한 경로를 찾을 수 없습니다." });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: "서버 오류가 발생했습니다." });
});

app.listen(port, () => {
  console.log(`MaRu Partner Admin server listening on http://localhost:${port}`);
});
