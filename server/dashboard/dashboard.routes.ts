import { Router } from "express";
import { getDashboardSnapshot } from "./dashboard.service";

export const dashboardRouter = Router();

dashboardRouter.get("/snapshot", async (_req, res, next) => {
  try {
    res.json(await getDashboardSnapshot());
  } catch (err) {
    next(err);
  }
});
