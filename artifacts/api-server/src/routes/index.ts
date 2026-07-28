import { Router, type IRouter } from "express";
import healthRouter from "./health";
import purchaseOrdersRouter from "./purchaseOrders";
import suppliersRouter from "./suppliers";
import notificationsRouter from "./notifications";
import dashboardRouter from "./dashboard";
import clientsRouter from "./clients";

const router: IRouter = Router();

router.use(healthRouter);
router.use(purchaseOrdersRouter);
router.use(suppliersRouter);
router.use(notificationsRouter);
router.use(dashboardRouter);
router.use(clientsRouter);

export default router;
