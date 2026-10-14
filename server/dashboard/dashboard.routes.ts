import { Router } from "express";
import { getDashboardSnapshot } from "./dashboard.aggregator";

export const dashboardRouter = Router();

dashboardRouter.get("/snapshot", (_req, res) => {
  res.json(getDashboardSnapshot());
});
