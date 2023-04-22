import {
  JsonSchema,
  LambdaIntegration,
  Model,
  RequestValidator,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";
import zodToJsonSchema from "zod-to-json-schema";
import { orderModel } from "../orderModel";
import { Runtime } from "aws-cdk-lib/aws-lambda";

type ApiHandlerLambdaProps = {
  api: RestApi;
  table: Table;
  apiPath: string;
};

export class ApiHandlerValidation extends Construct {
  constructor(scope: Construct, id: string, props: ApiHandlerLambdaProps) {
    super(scope, id);

    const lambdaHandler = new NodejsFunction(this, "LambdaHandler", {
      runtime: Runtime.NODEJS_18_X,
      entry: join(__dirname, "handler.ts"),
      environment: {
        TABLE_NAME: props.table.tableName,
      },
    });
    props.table.grantReadWriteData(lambdaHandler);

    const jsonSchema = zodToJsonSchema(orderModel, {
      name: "Order",
    });
    const orderModelSchema = jsonSchema.definitions?.["Order"] as JsonSchema;

    const requestBodyModel = new Model(this, "RequestBodyModel", {
      restApi: props.api,
      schema: orderModelSchema,
    });

    const requestValidator = new RequestValidator(this, "RequestValidator", {
      restApi: props.api,
      validateRequestBody: true,
    });

    props.api.root
      .addResource(props.apiPath)
      .addMethod("POST", new LambdaIntegration(lambdaHandler), {
        requestValidator: requestValidator,
        requestModels: {
          "application/json": requestBodyModel,
        },
      });
  }
}
