import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { join } from "path";

export interface QueueHandlerLambdaProps {
  table: Table;
  queue: Queue;
  baseUrl: string;
  tokenUrl: string;
  credentialsSecret: Secret;
}

export class QueueHandlerLambda extends Construct {
  constructor(scope: Construct, id: string, props: QueueHandlerLambdaProps) {
    super(scope, id);
    const lambda = new NodejsFunction(this, "QueueLambda", {
      runtime: Runtime.NODEJS_18_X,
      entry: join(__dirname, "handler.ts"),
      environment: {
        TABLE_NAME: props.table.tableName,
        BASE_URL: props.baseUrl,
        TOKEN_URL: props.tokenUrl,
        CREDENTIALS_SECRET: props.credentialsSecret.secretName,
      },
    });
    const lambdaEventSource = new SqsEventSource(props.queue, {
      batchSize: 1,
    });
    lambda.addEventSource(lambdaEventSource);
    props.table.grantWriteData(lambda);
    props.credentialsSecret.grantRead(lambda);
  }
}
