import { App, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ExpectedResult, IntegTest } from "@aws-cdk/integ-tests-alpha";
import path = require("path");
import { RestApi, EndpointType } from "aws-cdk-lib/aws-apigateway";
import { Table, AttributeType, BillingMode } from "aws-cdk-lib/aws-dynamodb";
import { ApiHandlerLambda } from "../lib/01_api-handler_01_lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Match } from "aws-cdk-lib/assertions";

class StackUnderTest extends Stack {
  readonly table: Table;
  readonly api: RestApi;
  readonly fetchLambda: NodejsFunction;
  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.api = new RestApi(this, "Api", {
      endpointTypes: [EndpointType.REGIONAL],
    });

    this.table = new Table(this, "Table", {
      partitionKey: {
        name: "orderId",
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });
    new ApiHandlerLambda(this, "ApiHandlerLambda", {
      api: this.api,
      table: this.table,
      apiPath: "orders",
    });

    this.fetchLambda = new NodejsFunction(this, "FetchLambda", {
      entry: path.join(__dirname, "fetch-lambda.ts"),
      runtime: Runtime.NODEJS_18_X,
    });
  }
}

// Beginning of the test suite
const app = new App();

const stackUnderTest = new StackUnderTest(app, "Stack1");
const test = new IntegTest(app, "DifferentArchitectures", {
  testCases: [stackUnderTest],
});

const newOrder = test.assertions.invokeFunction({
  functionName: stackUnderTest.fetchLambda.functionName,
  payload: JSON.stringify({
    url: stackUnderTest.api.url + "orders",
    method: "POST",
    body: {
      orderDate: "2023-04-19T19:32:02.035Z",
      customerId: "123",
      productIds: ["1", "2", "3"],
    },
  }),
});
// https://github.com/aws/aws-cdk/blob/5573025f89359d46fd2878be49ce09b52854b6fd/packages/%40aws-cdk-testing/framework-integ/test/aws-lambda/test/integ.lambda.docker.ts#L27
newOrder.expect(
  ExpectedResult.exact({ orderDate: "2023-04-19T19:32:02.035Z" })
);
