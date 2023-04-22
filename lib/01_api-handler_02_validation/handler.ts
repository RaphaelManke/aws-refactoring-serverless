import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { IOrderModel, orderModel } from "../orderModel";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";

const dynamodb = new DynamoDB({});
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const validatedBody = JSON.parse(event.body!) as IOrderModel;

  const orderId = randomUUID();
  const item = {
    orderId: { S: orderId },
    orderDate: { S: validatedBody.orderDate },
    customerId: { S: validatedBody.customerId },
    productIds: { SS: validatedBody.productIds },
    customerType: { S: validatedBody.customerType },
    createdAt: { S: new Date().toISOString() },
  };
  const foo = await dynamodb.putItem({
    TableName: process.env.TABLE_NAME,
    Item: item,
    ReturnValues: "ALL_NEW",
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      ...validatedBody,
      orderId,
    }),
  };
};
