import {
  JsonSchema,
  Model,
  RequestValidator,
  RestApi,
  StepFunctionsIntegration,
} from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import zodToJsonSchema from "zod-to-json-schema";
import { orderModel } from "../orderModel";
import {
  JsonPath,
  Pass,
  StateMachine,
  StateMachineType,
  LogLevel,
} from "aws-cdk-lib/aws-stepfunctions";
import {
  DynamoAttributeValue,
  DynamoPutItem,
} from "aws-cdk-lib/aws-stepfunctions-tasks";
import { LogGroup } from "aws-cdk-lib/aws-logs";

type ApiHandlerLambdaProps = {
  api: RestApi;
  table: Table;
  apiPath: string;
};

export class ApiHandlerSfn extends Construct {
  constructor(scope: Construct, id: string, props: ApiHandlerLambdaProps) {
    super(scope, id);
    const createOrderId = new Pass(this, "Create order Id", {
      parameters: {
        orderId: JsonPath.uuid(),
      },
      resultPath: "$.orderId",
    });

    const storeOrderInDynamoDB = new DynamoPutItem(
      this,
      "Store order in DynamoDB",
      {
        table: props.table,
        item: {
          orderId: DynamoAttributeValue.fromString(
            JsonPath.stringAt("$.orderId.orderId")
          ),
          orderDate: DynamoAttributeValue.fromString(
            JsonPath.stringAt("$.body.orderDate")
          ),
          customerId: DynamoAttributeValue.fromString(
            JsonPath.stringAt("$.body.customerId")
          ),
          productIds: DynamoAttributeValue.fromStringSet(
            JsonPath.listAt("$.body.productIds")
          ),
          customerType: DynamoAttributeValue.fromString(
            JsonPath.stringAt("$.body.customerType")
          ),
          createdAt: DynamoAttributeValue.fromString(
            JsonPath.stringAt("$$.State.EnteredTime")
          ),

        },
        resultPath: "$.ddbResult",
      }
    );

    const createBody = new Pass(this, "Create body", {
      parameters: {
        orderId: JsonPath.stringAt("$.orderId.orderId"),
        orderDate: JsonPath.stringAt("$.body.orderDate"),
        customerId: JsonPath.stringAt("$.body.customerId"),
        productIds: JsonPath.listAt("$.body.productIds"),
        customerType: JsonPath.stringAt("$.body.customerType"),
      },
    });

    const sfnDefinition = createOrderId
      .next(storeOrderInDynamoDB)
      .next(createBody);
    const sfnLoggroup = new LogGroup(this, "SfnLogGroup");
    const stateMachine = new StateMachine(this, "OrderStateMachine", {
      definition: sfnDefinition,
      stateMachineType: StateMachineType.EXPRESS,
      logs: {
        destination: sfnLoggroup,
        level: LogLevel.ALL,
        includeExecutionData: true,
      },
    });

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
      .addMethod(
        "POST",
        StepFunctionsIntegration.startExecution(stateMachine),
        {
          requestValidator: requestValidator,
          requestModels: {
            "application/json": requestBodyModel,
          },
        }
      );
  }
}
