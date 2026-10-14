import { Router } from "express";
import { fetchTokenUsageSnapshot } from "./tokenUsage.service";

export const tokenUsageRouter = Router();

tokenUsageRouter.get("/summary", async (_req, res, next) => {
  try {
    res.json(await fetchTokenUsageSnapshot());
  } catch (err) {
    next(err);
  }
});
