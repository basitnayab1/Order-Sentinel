import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

// Temporary middleware (testing only)
app.use((req, res, next) => {
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

// Temporary middleware (testing only)
app.use((req, res, next) => {
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
