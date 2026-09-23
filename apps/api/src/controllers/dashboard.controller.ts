import { Request, Response, NextFunction } from "express";
import { dashboardService } from "../services/dashboard.service.js";

export class DashboardController {
  async getSummary(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const summary = await dashboardService.getSummary(req.user.id);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
