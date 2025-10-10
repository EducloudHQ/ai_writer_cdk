import { logger, metrics, tracer } from "./utilities";

import {
  EVENTBRIDGE,
  extractDataFromEnvelope,
} from "@aws-lambda-powertools/jmespath/envelopes";
import {
  SchedulerClient,
  CreateScheduleCommand,
  FlexibleTimeWindowMode,
  ActionAfterCompletion,
} from "@aws-sdk/client-scheduler";
import { addMinutes, addDays, addMonths } from "date-fns";
import type { EventBridgeEvent } from "aws-lambda";

function buildAtExpression(
  schedule: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  },
  now: Date = new Date()
): string {
  const targetLocal = new Date(
    schedule.year,
    schedule.month - 1,
    schedule.day,
    schedule.hour,
    schedule.minute,
    schedule.second
  );

  const diffMs = targetLocal.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes <= 0) {
    throw new Error(
      `Scheduled time ${targetLocal.toISOString()} is in the past (${diffMinutes} minutes).`
    );
  }

  logger.info(`diffMinutes is ${diffMinutes}`);

  const iso = addMinutes(now, diffMinutes).toISOString().split(".")[0];
  return `at(${iso})`;
}
type DynamoDBPost = {
  id: { S: string };
  draftId: { S: string };
  articleId: { S: string };
  createdOn?: { N: string };
  entity: { S: string };
  imageUrls?: { L: { S: string }[] };
  updatedOn?: { NULL: true } | { N: string };
  userId: { S: string };
  schedule?: {
    M: {
      day: { N: string };
      hour: { N: string };
      minute: { N: string };
      month: { N: string };
      second: { N: string };
      year: { N: string };
    };
  };
};

type ScheduledContentBody = {
  content: DynamoDBPost;
};

const client = new SchedulerClient({});
const createSchedule = ({ name, payload, description, time }: any) => {
  return client.send(
    new CreateScheduleCommand({
      Name: name,
      GroupName: process.env.SCHEDULE_GROUP_NAME,
      Target: {
        RoleArn: process.env.SCHEDULE_ROLE_ARN,
        Arn: process.env.SEND_POST_SERVICE_ARN,
        Input: JSON.stringify({ ...payload }),
      },
      ActionAfterCompletion: ActionAfterCompletion.DELETE,
      FlexibleTimeWindow: {
        Mode: FlexibleTimeWindowMode.OFF,
      },
      Description: description,
      ScheduleExpression: time,
    })
  );
};
export const handler = async (
  event: EventBridgeEvent<"ScheduleContentCreated", ScheduledContentBody>
) => {
  logger.info("This is the schedule post function");
  logger.info(`records ${JSON.stringify(event.detail.content)}`);

  const records = extractDataFromEnvelope<ScheduledContentBody>(
    event,
    EVENTBRIDGE
  );
  logger.info(`records are ${JSON.stringify(records)}`);

  const id = records.content.id.S;
  const userId = records.content.userId.S;

  const schedule = records.content.schedule?.M;
  const day = schedule!.day.N;
  const hour = schedule!.hour.N;
  const minute = schedule!.minute.N;
  const month = schedule!.month.N;
  const second = schedule!.second.N;
  const year = schedule!.year.N;

  logger.info(`schedule is ${JSON.stringify(schedule)}`);
  const scheduleExpression = buildAtExpression({
    year: parseInt(year),
    month: parseInt(month),
    day: parseInt(day),
    hour: parseInt(hour),
    minute: parseInt(minute),
    second: parseInt(second),
  });

  logger.info(`post id is ${JSON.stringify(records.content.id.S)}`);
  // Schedule for welcome email 2 minutes after sign up
  await createSchedule({
    name: `${id}-scheduled-post`,
    description: `Post ${id} scheduled by ${userId}`,
    payload: { ...event.detail, context: "24hr" },
    time: scheduleExpression,
  });
};
