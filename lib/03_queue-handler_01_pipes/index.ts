import {
    ApiDestinationEnrichment,
    IInvocationType,
    LogsTarget,
    Pipe,
    PipeEnrichment,
    PipeInputTransformation,
    SqsSource,
    StepFunctionTarget,
} from "@raphaelmanke/aws-cdk-pipes-rfc";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import {
    ApiDestination,
    Authorization,
    Connection,
    HttpMethod,
} from "aws-cdk-lib/aws-events";
import { SfnStateMachine } from "aws-cdk-lib/aws-events-targets";
import { Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Queue } from "aws-cdk-lib/aws-sqs";
import {
    JsonPath,
    LogLevel,
    Pass,
    StateMachine,
    StateMachineType,
} from "aws-cdk-lib/aws-stepfunctions";
import { DynamoAttributeValue, DynamoUpdateItem } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";
import { join } from "path";

export interface QueueHandlerPipeProps {
    table: Table;
    queue: Queue;
    baseUrl: string;
    tokenUrl: string;
    credentialsSecret: Secret;
}

export class QueueHandlerPipe extends Construct {
    constructor(scope: Construct, id: string, props: QueueHandlerPipeProps) {
        super(scope, id);


        const pipeLoggroup = new LogGroup(this, "PipeLogGroup");
        const sfnDefinition = new Pass(this, "Pass");
        const sfnLoggroup = new LogGroup(this, "SfnLogGroup");

        const updateItem = new DynamoUpdateItem(this, "Update fraud probability", {
            table: props.table,
            key: {
                orderId: DynamoAttributeValue.fromString( JsonPath.stringAt("$.[0].event.orderId")),
            },
            updateExpression: "SET fraudProbability = :fraudProbability, updatedAt = :updatedAt",
            expressionAttributeValues: {
                ":fraudProbability": DynamoAttributeValue.fromString(
                    JsonPath.format("{}", JsonPath.stringAt("$.[0].event.fraudProbability"))
                ),
                ":updatedAt": DynamoAttributeValue.fromString(
                    JsonPath.stringAt("$$.State.EnteredTime")
                ),
            },


        });
        const stateMachine = new StateMachine(this, "QueueHandlerStateMachine", {
            definition: updateItem,
            stateMachineType: StateMachineType.EXPRESS,
            logs: {
                destination: sfnLoggroup,
                level: LogLevel.ALL,
                includeExecutionData: true,
            },
        });
        const connection = new Connection(this, "Connection", {
            authorization: Authorization.oauth({
                clientSecret:
                    props.credentialsSecret.secretValueFromJson("clientSecret"),
                httpMethod: HttpMethod.POST,
                authorizationEndpoint: props.tokenUrl,
                clientId: "clientId",
            }),
        });

        const destination = new ApiDestination(this, "ApiDestination", {
            connection: connection,
            endpoint: props.baseUrl + "fraud-check/*",
            httpMethod: HttpMethod.GET,

        });
        const pipe = new Pipe(this, "QueueHandlerPipe", {
            source: new SqsSource(props.queue, {
                batchSize: 1,
            }),
            enrichment: new ApiDestinationEnrichment(destination, {
                pathParameterValues: ["$.body.orderId"],
            }),
            target: new StepFunctionTarget(stateMachine, {
                inputTemplate: PipeInputTransformation.fromJson({
                    creditScore: "<$.creditScore>",
                    fraudProbability: "<$.fraudProbability>",
                    event: "<aws.pipes.event.json>",
                    eventRaw: "<aws.pipes.event>",
                    body: "<$.body>"
                }),
                invocationType: IInvocationType.REQUEST_RESPONSE
            }),

        });


        stateMachine.grantStartSyncExecution(pipe.pipeRole);
    }
}
