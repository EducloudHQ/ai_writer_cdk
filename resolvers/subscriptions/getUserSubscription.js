import { get } from "@aws-appsync/utils/dynamodb";
import { util } from "@aws-appsync/utils";

export function request(ctx) {
  const { userId, tier } = ctx.args;

  return get({
    key: {
      PK: `USER#${userId}`,
      SK: `SUBSCRIPTION#${tier}`,
    },
  });
}

export function response(ctx) {
  if (!ctx.result) {
    util.error("User Subscription not found");
  }

  return ctx.result;
}
