import express, { Router } from 'express';
import router from "./routes/index.route.js";

const app: express.Application = express();

export default app;

//middleware
app.use(express.json());

// Register Routes
app.use("/", router);
