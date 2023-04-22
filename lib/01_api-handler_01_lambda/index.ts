import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";

type ApiHandlerLambdaProps = {
  api: RestApi;
  table: Table;
  apiPath: string;
};

export class ApiHandlerLambda extends Construct {
  constructor(scope: Construct, id: string, props: ApiHandlerLambdaProps) {
    super(scope, id);

    const lambdaHandler = new NodejsFunction(this,
      "LambdaHandler", {
      runtime: Runtime.NODEJS_18_X,
      entry: join(__dirname, "handler.ts"),
      environment: {
        TABLE_NAME: props.table.tableName,
      },
    });
    props.table.grantReadWriteData(lambdaHandler);

    const integration = new LambdaIntegration(lambdaHandler);
    props.api.root
      .addResource(props.apiPath)
      .addMethod("POST", integration);
  }
}
