import type { Request, Response } from "express";
import { ok } from "../../helpers/api-response";
import { requireStringParam } from "../../helpers/request";
import { usersService } from "./users.service";

export const usersController = {
  async current(request: Request, response: Response) {
    const user = await usersService.getCurrentUser(request.user!.sub);
    response.json(ok({ user }));
  },

  async publicProfile(request: Request, response: Response) {
    const userId = requireStringParam(request.params.userId, "userId");
    const profile = await usersService.getPublicProfile(userId);
    response.json(ok({ profile }));
  },

  async updateProfile(request: Request, response: Response) {
    const user = await usersService.updateProfile(request.user!.sub, request.body);
    response.json(ok({ user }));
  },

  async updateSettings(request: Request, response: Response) {
    const user = await usersService.updateSettings(request.user!.sub, request.body);
    response.json(ok({ user }));
  }
};
