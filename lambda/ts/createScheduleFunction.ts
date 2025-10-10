// createScheduleFunction.ts  (Pattern B — parse only `detail` with EventBridgeEnvelope)
import middy from "@middy/core";
import { parser } from "@aws-lambda-powertools/parser/middleware";
import { EventBridgeEnvelope } from "@aws-lambda-powertools/parser/envelopes/eventbridge";
import { Logger } from "@aws-lambda-powertools/logger";
import {
  SchedulerClient,
  CreateScheduleCommand,
  FlexibleTimeWindowMode,
  ActionAfterCompletion,
} from "@aws-sdk/client-scheduler";
import { z } from "zod";

const logger = new Logger({
  persistentKeys: {
    aws_account_id: process.env.AWS_ACCOUNT_ID || "N/A",
    aws_region: process.env.AWS_REGION || "N/A",
  },
});

const AttrS = z.object({ S: z.string() }).transform((v) => v.S);
const AttrN = z.object({ N: z.string() }).transform((v) => Number(v.N));

const ScheduleAttr = z
  .object({
    M: z.object({
      year: AttrN,
      month: AttrN,
      day: AttrN,
      hour: AttrN,
      minute: AttrN,
      second: AttrN,
    }),
  })
  .transform(({ M }) => M);

/** `detail` schema: your producer sends { scheduledContent: <AttributeValue map> } */
const DetailSchema = z.object({
  scheduledContent: z.object({
    id: AttrS,
    userId: AttrS,
    draftId: AttrS.optional(),
    articleId: AttrS.optional(),
    entity: AttrS,
    schedule: ScheduleAttr,
  }),
});

type ScheduledContent = z.infer<typeof DetailSchema>["scheduledContent"];

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

  const atIso = new Date(now.getTime() + diffMinutes * 60_000)
    .toISOString()
    .split(".")[0];

  return `at(${atIso})`;
}

const scheduler = new SchedulerClient({});

async function createSchedule(args: {
  name: string;
  description: string;
  payload: unknown;
  scheduleExpression: string;
}) {
  const { name, description, payload, scheduleExpression } = args;

  return scheduler.send(
    new CreateScheduleCommand({
      Name: name,
      GroupName: process.env.SCHEDULE_GROUP_NAME,
      Target: {
        RoleArn: process.env.SCHEDULE_ROLE_ARN,
        Arn: process.env.SEND_POST_SERVICE_ARN,
        Input: JSON.stringify(payload),
      },
      ActionAfterCompletion: ActionAfterCompletion.DELETE,
      FlexibleTimeWindow: { Mode: FlexibleTimeWindowMode.OFF },
      Description: description,
      ScheduleExpression: scheduleExpression,
    })
  );
}

async function baseHandler(event: z.infer<typeof DetailSchema>) {
  logger.info("ScheduleContentCreated handler invoked (Pattern B)");
  logger.info(`parsed detail: ${JSON.stringify(event)}`);

  const post: ScheduledContent = event.scheduledContent;

  const scheduleExpression = buildAtExpression(post.schedule);

  await createSchedule({
    name: `${post.id}-scheduled-post`,
    description: `Post ${post.id} scheduled by ${post.userId}`,
    // Include exactly what your consumer expects; keeping it explicit is best:
    payload: { scheduledContent: post, context: "24hr" },
    scheduleExpression,
  });

  logger.info(`Schedule created for ${post.id} at ${scheduleExpression}`);
  return { ok: true, id: post.id, scheduleExpression };
}

export const handler = middy(baseHandler).use(
  parser({
    schema: DetailSchema, // validate your detail shape
    envelope: EventBridgeEnvelope, // parse only event.detail
    // safeParse: true,             // enable if you want {success,data?,error?}
  })
);
