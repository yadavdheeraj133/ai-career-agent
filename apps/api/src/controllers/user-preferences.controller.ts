import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  userPreferencesService,
  type UserPreferencesInput,
} from "../services/user-preferences.service.js";

export class UserPreferencesController {
  async getPreferences(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const preferences =
        await userPreferencesService.getPreferences(
          req.user.id
        );

      res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  }

  async createPreferences(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const data: UserPreferencesInput = {};

      if (typeof req.body.jobRole === "string") {
        data.jobRole = req.body.jobRole;
      }
      if (typeof req.body.location === "string") {
        data.location = req.body.location;
      }
      if (typeof req.body.workMode === "string") {
        data.workMode = req.body.workMode;
      }
      if (typeof req.body.jobType === "string") {
        data.jobType = req.body.jobType;
      }
      if (typeof req.body.salary === "string") {
        data.salary = req.body.salary;
      }

      const preferences =
        await userPreferencesService.createPreferences(
          req.user.id,
          data
        );

      res.status(201).json({
        success: true,
        message: "User preferences created successfully.",
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePreferences(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const data: UserPreferencesInput = {};

      if (typeof req.body.jobRole === "string") {
        data.jobRole = req.body.jobRole;
      }
      if (typeof req.body.location === "string") {
        data.location = req.body.location;
      }
      if (typeof req.body.workMode === "string") {
        data.workMode = req.body.workMode;
      }
      if (typeof req.body.jobType === "string") {
        data.jobType = req.body.jobType;
      }
      if (typeof req.body.salary === "string") {
        data.salary = req.body.salary;
      }

      if (Object.keys(data).length === 0) {
        res.status(400).json({
          success: false,
          message: "At least one field must be provided for update.",
        });
        return;
      }

      const preferences =
        await userPreferencesService.updatePreferences(
          req.user.id,
          data
        );

      res.status(200).json({
        success: true,
        message: "User preferences updated successfully.",
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userPreferencesController =
  new UserPreferencesController();