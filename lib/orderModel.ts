import { z } from "zod";

export const orderModel = z.object({
  orderDate: z.string().datetime(),
  customerId: z.string(),
  productIds: z.array(z.string()),
  customerType: z.enum(["new", "existing"]),
});

export type IOrderModel = z.infer<typeof orderModel>;
