import { Request, Response } from "express";
import { healthCheckService } from "../services/index.service.js";

export const healthCheck = (
  req: Request,
  res: Response
): void => {

const message = healthCheckService();
res.send(message);
};

