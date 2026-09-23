import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  userSettingsService,
  type UserSettingsInput,
} from "../services/user-settings.service.js";

export class UserSettingsController {
  async getSettings(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const settings =
        await userSettingsService.getSettings(
          req.user.id
        );

      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  async createSettings(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const data: UserSettingsInput = {};

      if (typeof req.body.emailNotifications === "boolean") {
        data.emailNotifications = req.body.emailNotifications;
      }
      if (typeof req.body.jobAlerts === "boolean") {
        data.jobAlerts = req.body.jobAlerts;
      }
      if (typeof req.body.applicationUpdates === "boolean") {
        data.applicationUpdates = req.body.applicationUpdates;
      }

      const settings =
        await userSettingsService.createSettings(
          req.user.id,
          data
        );

      res.status(201).json({
        success: true,
        message: "User settings created successfully.",
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const data: UserSettingsInput = {};

      if (typeof req.body.emailNotifications === "boolean") {
        data.emailNotifications = req.body.emailNotifications;
      }
      if (typeof req.body.jobAlerts === "boolean") {
        data.jobAlerts = req.body.jobAlerts;
      }
      if (typeof req.body.applicationUpdates === "boolean") {
        data.applicationUpdates = req.body.applicationUpdates;
      }

      if (Object.keys(data).length === 0) {
        res.status(400).json({
          success: false,
          message: "At least one field must be provided for update.",
        });
        return;
      }

      const settings =
        await userSettingsService.updateSettings(
          req.user.id,
          data
        );

      res.status(200).json({
        success: true,
        message: "User settings updated successfully.",
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userSettingsController =
  new UserSettingsController();