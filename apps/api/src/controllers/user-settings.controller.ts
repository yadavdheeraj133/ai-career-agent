import {
  Request,
  Response,
  NextFunction,
} from "express";

import { userSettingsService } from "../services/user-settings.service.js";
import { updateUserSettingsSchema } from "../validators/user-settings.validator.js";

/**
 * `/users/settings` (GET, POST, PATCH).
 *
 * `theme` and `minMatchScore` are read back by the client to drive real
 * behaviour, so they are validated here instead of being stored verbatim: an
 * unrecognised theme or an out-of-range score would leave the setting in a
 * state nothing honours. A ZodError reaches the shared error middleware, which
 * already answers 400.
 */
function parseSettings(body: unknown) {
  return updateUserSettingsSchema.parse(body);
}

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
      const data = parseSettings(req.body);

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
      const data = parseSettings(req.body);

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
