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
      const data: UserSettingsInput = {
        emailNotifications:
          req.body.emailNotifications,
        jobAlerts: req.body.jobAlerts,
        applicationUpdates:
          req.body.applicationUpdates,
      };

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
      const data: UserSettingsInput = {
        emailNotifications:
          req.body.emailNotifications,
        jobAlerts: req.body.jobAlerts,
        applicationUpdates:
          req.body.applicationUpdates,
      };

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