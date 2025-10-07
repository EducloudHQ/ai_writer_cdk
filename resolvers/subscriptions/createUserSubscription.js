import { util } from "@aws-appsync/utils";
import { put } from "@aws-appsync/utils/dynamodb";
export function request(ctx) {
  const id = util.autoKsuid();
  const { userId, tier } = ctx.args.input;

  // Calculate dates
  const startDate = util.time.nowEpochMilliSeconds();
  const endDate = startDate + 30 * 24 * 60 * 60 * 1000; // 30 days from now

  const pk = `USER#${userId}`;
  const sk = `SUBSCRIPTION#${tier}`;

  // GSI for getting all subscriptions
  const GSI6PK = `SUBSCRIPTION#${tier}`;
  const GSI6SK = `USER#${userId}`;

  const key = { PK: pk, SK: sk };

  const values = {
    id,
    PK: pk,
    SK: sk,
    startDate: startDate,
    endDate: endDate,
    ...ctx.args.input,
    ENTITY: "USER_SUBSCRIPTION",
    // GSI for getting all subscriptions
    GSI6PK: GSI6PK,
    GSI6SK: GSI6SK,
    createdOn: startDate,
  };

  return put({
    key,
    item: values,
  });
}

export function response(ctx) {
  return ctx.result;
}
