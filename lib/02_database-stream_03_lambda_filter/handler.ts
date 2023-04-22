import { SQS } from "@aws-sdk/client-sqs";
import { DynamoDBStreamHandler } from "aws-lambda";

const queueUrl = process.env.QUEUE_URL;
const sqsClient = new SQS({});
export const handler: DynamoDBStreamHandler = async (event) => {
  for (const record of event.Records) {
    if (record.dynamodb?.NewImage) {
      const plainJson = {
        orderId: record.dynamodb.NewImage.orderId.S,
        orderDate: record.dynamodb.NewImage.orderDate.S,
        customerId: record.dynamodb.NewImage.customerId.S,
        productIds: record.dynamodb.NewImage.productIds.SS,
        customerType: record.dynamodb.NewImage.customerType.S,
        createdAt: record.dynamodb.NewImage.createdAt.S,
      };
      await sqsClient.sendMessage({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(plainJson),
      });
    } else {
      throw new Error("No new image");
    }
  }
};
