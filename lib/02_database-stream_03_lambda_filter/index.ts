import { Table } from "aws-cdk-lib/aws-dynamodb";
import {
  Runtime,
  Code,
  StartingPosition,
  FilterCriteria,
  FilterRule,
} from "aws-cdk-lib/aws-lambda";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { join } from "path";

export interface DatabaseStreamLambdaProps {
  table: Table;
  queue: Queue;
}

export class DatabaseStreamLambdaFilter extends Construct {
  constructor(scope: Construct, id: string, props: DatabaseStreamLambdaProps) {
    super(scope, id);
    const lambda = new NodejsFunction(this, "DatabaseStreamLambda", {
      runtime: Runtime.NODEJS_18_X,
      entry: join(__dirname, "handler.ts"),
      environment: {
        QUEUE_URL: props.queue.queueUrl,
      },
    });
    const lambdaEventSource = new DynamoEventSource(props.table, {
      startingPosition: StartingPosition.TRIM_HORIZON,
      batchSize: 1,

      filters: [
        FilterCriteria.filter({
          eventName: FilterRule.isEqual("INSERT"),
        }),
      ],
    });
    lambda.addEventSource(lambdaEventSource);
    props.queue.grantSendMessages(lambda);
  }
}
