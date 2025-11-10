import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import webhookRoute from "./routes/webhook";
import publishUpdates from "./routes/publishUpdates";
import processRepo from "./routes/processRepo";
import UserRoute from "./routes/user";
import RepoRoute from "./routes/github";
const app = express();
app.use(cors());
app.use(express.json());
app.set("trust proxy", true);
app.use(cookieParser());
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
app.use("/publish", publishUpdates);
app.use("/process", processRepo);
app.use("/get", RepoRoute);
app.use("/user", UserRoute);
app.listen(8000, () => {
  console.log("server is up at port 8000");
});
