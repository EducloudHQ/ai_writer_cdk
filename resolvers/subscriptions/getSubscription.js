import { get } from "@aws-appsync/utils/dynamodb";
import { util } from "@aws-appsync/utils";

export function request(ctx) {
  const { tier } = ctx.args;

  return get({
    key: {
      PK: `SUBSCRIPTION#${tier}`,
      SK: `SUBSCRIPTION#${tier}`,
    },
  });
}

export function response(ctx) {
  if (!ctx.result) {
    util.error("Subscription tier error");
  }

  return ctx.result;
}
