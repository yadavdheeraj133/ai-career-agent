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
      const data: UserPreferencesInput = {
        jobRole: req.body.jobRole,
        location: req.body.location,
        workMode: req.body.workMode,
        jobType: req.body.jobType,
        salary: req.body.salary,
      };

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
      const data: UserPreferencesInput = {
        jobRole: req.body.jobRole,
        location: req.body.location,
        workMode: req.body.workMode,
        jobType: req.body.jobType,
        salary: req.body.salary,
      };

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