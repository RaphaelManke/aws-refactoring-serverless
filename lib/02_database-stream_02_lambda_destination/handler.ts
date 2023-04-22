import { DynamoDBStreamEvent } from "aws-lambda";

export const handler = async (event: DynamoDBStreamEvent) => {
  const record = event.Records[0];
  if (record.eventName === "INSERT" && record.dynamodb?.NewImage) {
    const plainJson = {
      orderId: record.dynamodb.NewImage.orderId.S,
      orderDate: record.dynamodb.NewImage.orderDate.S,
      customerId: record.dynamodb.NewImage.customerId.S,
      productIds: record.dynamodb.NewImage.productIds.SS,
      customerType: record.dynamodb.NewImage.customerType.S,
      createdAt: record.dynamodb.NewImage.createdAt.S,
    };
    console.info("database stream event", JSON.stringify(plainJson));
    return plainJson;
  }
  return;
};
