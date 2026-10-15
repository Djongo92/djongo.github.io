import { Router, type IRouter } from "express";
import healthRouter from "./health";
import reportLeadsRouter from "./reportLeads";
import demoAccessRouter from "./demoAccess";
import demoRequestsRouter from "./demoRequests";

const router: IRouter = Router();

router.use(healthRouter);
router.use(reportLeadsRouter);
router.use(demoAccessRouter);
router.use(demoRequestsRouter);

export default router;
