import type { Request, Response } from "express";
import { ok } from "../../helpers/api-response";
import { authService } from "./auth.service";

export const authController = {
  async register(request: Request, response: Response) {
    const result = await authService.register(request.body);
    response.status(201).json(ok(result));
  },

  async login(request: Request, response: Response) {
    const result = await authService.login(request.body);
    response.json(ok(result));
  },

  async refresh(request: Request, response: Response) {
    const result = await authService.refresh(request.body.refreshToken);
    response.json(ok(result));
  },

  async logout(request: Request, response: Response) {
    await authService.logout(request.body.refreshToken);
    response.status(204).send();
  },

  async googleLogin(request: Request, response: Response) {
    const result = await authService.googleLogin(request.body.idToken);
    response.json(ok(result));
  },

  async me(request: Request, response: Response) {
    const user = await authService.getMe(request.user!.sub);
    response.json(ok({ user }));
  }
};
