import { Request, Response, NextFunction } from "express";

import { notificationService } from "../services/notifications.service.js";

export class NotificationController {
  async list(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const unreadOnly = req.query.unreadOnly === "true";
      const rawLimit = Number(req.query.limit);
      const limit =
        Number.isFinite(rawLimit) && rawLimit > 0
          ? Math.min(rawLimit, 100)
          : 50;

      const result = await notificationService.listForUser(req.user.id, {
        unreadOnly,
        limit,
      });

      res.status(200).json({
        success: true,
        count: result.notifications.length,
        unread: result.unread,
        data: result.notifications,
      });
    } catch (error) {
      next(error);
    }
  }

  async markRead(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "Notification id is required.",
        });
        return;
      }

      const data = await notificationService.markRead(req.user.id, id);

      res.status(200).json({
        success: true,
        message: "Notification marked as read.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAllRead(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const data = await notificationService.markAllRead(req.user.id);

      res.status(200).json({
        success: true,
        message: "All notifications marked as read.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
