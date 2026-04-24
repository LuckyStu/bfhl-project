const express = require("express");
const cors = require("cors");
const path = require("path");
const { processData } = require("./bfhl");
const identity = require("./identity");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/bfhl", (req, res) => {
  try {
    const body = req.body || {};
    const data = body.data;
    const result = processData(data);
    res.json({
      ...identity,
      ...result,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({
      ...identity,
      error: err.message || "Internal server error",
    });
  }
});

app.get("/bfhl", (_req, res) => {
  res.json({
    operation_code: 1,
    message: "POST a JSON body { data: [...] } to this endpoint.",
  });
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`bfhl server listening on http://0.0.0.0:${PORT}`);
});
