import { util } from "@aws-appsync/utils";
import * as ddb from "@aws-appsync/utils/dynamodb";
export function request(ctx) {
  const { limit = 3, nextToken } = ctx.args;
  const index = "getAllSubscriptions";
  const query = {
    GSI5PK: { eq: "SUBSCRIPTION#" },
    GSI5SK: { beginsWith: "SUBSCRIPTION#" },
  };
  return ddb.query({
    query,
    index: index,
    limit: limit,
    nextToken: nextToken,
    scanIndexForward: false,
  });
}

export function response(ctx) {
  return {
    items: ctx.result.items,
    nextToken: ctx.result.nextToken,
  };
}
