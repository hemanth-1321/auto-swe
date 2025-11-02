import express from "express";
import cors from "cors";
import webhookRoute from "./routes/webhook";

const app = express();
app.use(cors());
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.get("/", (req, res) => {
  res.send("health check!");
});

app.use("/webhook", webhookRoute);

app.listen(8000, () => {
  console.log("server is up at port 8000");
});
