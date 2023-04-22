import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { randomInt } from "crypto";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log(JSON.stringify(event));
  if (!event.headers.Authorization) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: "Unauthorized",
      }),
    };
  }
  if (!event.pathParameters?.orderId) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Bad request: orderId must be provided",
      }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      orderId : event.pathParameters.orderId,
      fraudProbability: randomInt(1000),
    }),
  };
};
