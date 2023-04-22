import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import {
  Pipe,
  DynamoDBStreamSource,
  PipeSourceStartingPosition,
  SqsTarget,
  PipeSourceFilter,
  PipeSqsFilterPattern,
  PipeGenericFilterPattern,
  PipeInputTransformation,
} from "@raphaelmanke/aws-cdk-pipes-rfc";

export interface DatabaseStreamLambdaProps {
  table: Table;
  queue: Queue;
}

export class DatabaseStreamPipe extends Construct {
  constructor(scope: Construct, id: string, props: DatabaseStreamLambdaProps) {
    super(scope, id);

    new Pipe(this, "Pipe", {
      source: new DynamoDBStreamSource(props.table, {
        startingPosition: PipeSourceStartingPosition.TRIM_HORIZON,
      }),

      filter: new PipeSourceFilter([
        PipeGenericFilterPattern.fromJson({
          eventName: ["INSERT"],
        }),
      ]),

      target: new SqsTarget(props.queue, {
        inputTemplate: PipeInputTransformation.fromJson({
          orderId: "<$.dynamodb.NewImage.orderId.S>",
          customerId: "<$.dynamodb.NewImage.customerId.S>",
          productIds: "<$.dynamodb.NewImage.productIds.SS>",
          customerType: "<$.dynamodb.NewImage.customerType.S>",
          createdAt: "<$.dynamodb.NewImage.createdAt.S>",
        }),
      }),
    });
  }
}
