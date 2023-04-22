import {
  EndpointType,
  LambdaIntegration,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";

export class MockApi extends Construct {
  readonly tokenUrl: string;
  readonly baseUrl: string;
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const mockApi = new RestApi(this, "MockApi", {
      endpointTypes: [EndpointType.REGIONAL],
    });

    const tokenLambda = new NodejsFunction(this, "TokenLambda", {
      runtime: Runtime.NODEJS_18_X,
      entry: join(__dirname, "token-handler.ts"),

      environment: {
        TOKEN_SECRET: "secret",
      },
    });
    const userScoreLambda = new NodejsFunction(this, "FraudCheckLambda", {
      runtime: Runtime.NODEJS_18_X,
      entry: join(__dirname, "fraud-check.ts"),

      environment: {
        TOKEN_SECRET: "secret",
      },
    });
    mockApi.root
      .addResource("token")
      .addMethod("POST", new LambdaIntegration(tokenLambda));
    mockApi.root
      .addResource("fraud-check")
      .addResource("{orderId}")
      .addMethod("GET", new LambdaIntegration(userScoreLambda));

    this.tokenUrl = mockApi.urlForPath("/token");
    this.baseUrl = mockApi.url;
  }
}
