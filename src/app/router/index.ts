import { Router } from "express";
import { PaymentRoutes } from "../modules/payments/payments.route";
import { ConfigRoutes } from "../modules/config/config.route";

export const router = Router();

const moduleRoutes: {
  path: string;
  route: Router;
}[] = [
  {
    path: "/api",
    route: PaymentRoutes,
  },
  {
    path: "/api/config",
    route: ConfigRoutes,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});
