import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { IOrderModel, orderModel } from "../orderModel";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";

const validateBody = (event: APIGatewayProxyEvent): IOrderModel | APIGatewayProxyResult => {
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Bad request: body must be a JSON object",
      }),
    };
  }
  const jsonBody = JSON.parse(event.body);
  const validatedBody =
    orderModel.safeParse(jsonBody);

  if (!validatedBody.success) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: validatedBody.error.message,
      }),
    };
  }
  return validatedBody.data;
};
const storeOrder = async (validatedBody: IOrderModel) => {

  const orderId =
    randomUUID();

  const item = {
    orderId: { S: orderId },
    orderDate: { S: validatedBody.orderDate },
    customerId: { S: validatedBody.customerId },
    productIds: { SS: validatedBody.productIds },
    customerType: { S: validatedBody.customerType },
    createdAt: { S: new Date().toISOString() },
  };

  await dynamodb.putItem({
    TableName: process.env.TABLE_NAME,
    Item: item,
  });
  return orderId;
}

const dynamodb = new DynamoDB({});
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const validatedBody = validateBody(event);
  if ("statusCode" in validatedBody) {
    return validatedBody;
  }
  const orderId = await storeOrder(validatedBody);

  return {
    statusCode: 200,
    body: JSON.stringify({
      ...validatedBody,
      orderId,
    }),
  };
};
