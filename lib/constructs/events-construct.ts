import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as pipes from "aws-cdk-lib/aws-pipes";
import * as appsync from "aws-cdk-lib/aws-appsync";
import { EventsConstructProps } from "../types";
import { COMMON_TAGS } from "../constants";

/**
 * Construct for EventBridge events, rules, and pipes
 */
export class EventsConstruct extends Construct {
  constructor(scope: Construct, id: string, props: EventsConstructProps) {
    super(scope, id);

    const { aiWriterTable, createScheduleFunction } = props;

    // Create the EventBridge event bus
    const eventBus = new cdk.aws_events.EventBus(
      this,
      "ScheduledContentEventBus",
      {
        eventBusName: "ScheduledContentEventBus",
      }
    );

    // Create a role for the EventBridge Pipe
    const pipeRole = new iam.Role(this, "PipeRole", {
      assumedBy: new iam.ServicePrincipal("pipes.amazonaws.com"),
      description:
        "Role for EventBridge Pipe to connect DynamoDB to EventBridge",
    });

    // Grant permissions to the pipe role
    aiWriterTable.grantStreamRead(pipeRole);
    eventBus.grantPutEventsTo(pipeRole);

    // Create EventBridge Pipe to connect new DynamoDB items to EventBridge
    new pipes.CfnPipe(this, "SchedulePostPipe", {
      roleArn: pipeRole.roleArn,
      source: aiWriterTable.tableStreamArn!,
      sourceParameters: {
        dynamoDbStreamParameters: {
          startingPosition: "LATEST",
          batchSize: 3,
        },
        filterCriteria: {
          filters: [
            {
              pattern: JSON.stringify({
                eventName: ["INSERT"],
                dynamodb: {
                  NewImage: {
                    entity: {
                      S: ["SCHEDULED_CONTENT"],
                    },
                  },
                },
              }),
            },
          ],
        },
      },
      target: eventBus.eventBusArn,
      targetParameters: {
        eventBridgeEventBusParameters: {
          detailType: "ScheduleContentCreated",
          source: "scheduled.content",
        },
        inputTemplate: '{"scheduledContent": <$.dynamodb.NewImage>}',
      },
    });

    // Create a CloudWatch Log group to catch all events through this event bus, for debugging
    const logsGroup = new logs.LogGroup(this, "EventsLogGroup", {
      logGroupName: "/aws/events/ScheduledPostsEventBus/logs",
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create a rule to log all events for debugging
    new events.Rule(this, "CatchAllLogRule", {
      ruleName: "catch-all-events",
      eventBus: eventBus,
      eventPattern: {
        source: events.Match.prefix(""),
      },
      targets: [new targets.CloudWatchLogGroup(logsGroup)],
    });

    // Create a rule to trigger the scheduled content function when scheduled content is created
    new events.Rule(this, "CreateScheduledContentRule", {
      ruleName: "create-scheduled-content",
      eventBus: eventBus,
      eventPattern: {
        source: events.Match.exactString("scheduled.content"),
        detailType: events.Match.exactString("ScheduleContentCreated"),
      },
      targets: [new targets.LambdaFunction(createScheduleFunction)],
    });

    // Apply common tags to all resources
    [logsGroup].forEach((resource) => {
      Object.entries(COMMON_TAGS).forEach(([key, value]) => {
        cdk.Tags.of(resource).add(key, value);
      });
    });
  }
}
