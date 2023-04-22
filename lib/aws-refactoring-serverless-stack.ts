import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaDestinations } from "./lambda-destination/lambda-destination";
import { RestApiDirectIntegration } from "./rest-api-direct-integration/rest-api-direct-integration";
import { RestApiValidation } from "./rest-api-validation/rest-api-validation";
import { EndpointType, RestApi } from "aws-cdk-lib/aws-apigateway";
import {
  AttributeType,
  BillingMode,
  StreamViewType,
  Table,
} from "aws-cdk-lib/aws-dynamodb";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { ApiHandlerLambda } from "./01_api-handler_01_lambda";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { ApiHandlerValidation } from "./01_api-handler_02_validation";
import { ApiHandlerSfn } from "./01_api-handler_03_sfn";
import { DatabaseStreamLambda } from "./02_database-stream_01_lambda";
import { DatabaseStreamLambdaDestination } from "./02_database-stream_02_lambda_destination";
import { DatabaseStreamLambdaFilter } from "./02_database-stream_03_lambda_filter";
import { DatabaseStreamPipe } from "./02_database-stream_04_pipe";
import { QueueHandlerLambda } from "./03_queue-handler_01_lambda";
import { MockApi } from "./00_mock-api";
import { QueueHandlerPipe } from "./03_queue-handler_01_pipes";

export class AwsRefactoringServerlessStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const api = new RestApi(this, "Api", {
      endpointTypes: [EndpointType.REGIONAL],
    });

    new StringParameter(this, "BaseUrlParameter", {
      parameterName: "/api-handler/baseurl",
      stringValue: api.url,
    });

    const table = new Table(this, "Table", {
      partitionKey: {
        name: "orderId",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
    });
    new StringParameter(this, "TableParameter", {
      parameterName: "/table/name",
      stringValue: table.tableName,
    });
    const queue = new Queue(this, "Queue");
    const apiKey = new Secret(this, "ApiKey", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    /**
     * Part 1: API Handler
     */

    // new ApiHandlerLambda(this, "ApiHandlerLambda", {
    //   api,
    //   table,
    //   apiPath: "orders",
    // });
    // new ApiHandlerValidation(this, "ApiHandlerLambda", {
    //   api,
    //   table,
    //   apiPath: "orders",
    // });
    new ApiHandlerSfn(this, "ApiHandlerLambda", {
      api,
      table,
      apiPath: "orders",
    });

    /**
     * Part 2: Database Stream
     */

    // new DatabaseStreamLambda(this, "DatabaseStreamLambda", {
    //   table,
    //   queue,
    // });
    // new DatabaseStreamLambdaDestination(this, "DatabaseStreamLambda", {
    //   table,
    //   queue,
    // });
    // new DatabaseStreamLambdaFilter(this, "DatabaseStreamLambda", {
    //   table,
    //   queue,
    // });
    new DatabaseStreamPipe(this, "DatabaseStreamLambda", {
      table,
      queue,
    });

    /**
     * Part 3: External api
     */
    const { baseUrl, tokenUrl } = new MockApi(this, "MockApi");
    const clientCredentials = new Secret(this, "ApiClientCredentials");
    // new QueueHandlerLambda(this, "QueueHandlerLambda", {
    //   queue,
    //   table,
    //   baseUrl: baseUrl,
    //   credentialsSecret: clientCredentials,
    //   tokenUrl: tokenUrl,
    // });

    new QueueHandlerPipe(this, "QueueHandlerLambda", {
      queue,
      table,
      baseUrl: baseUrl,
      credentialsSecret: clientCredentials,
      tokenUrl: tokenUrl,
    });
  }
}
