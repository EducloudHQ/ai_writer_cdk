import * as ddb from "@aws-appsync/utils/dynamodb";

export function request(ctx) {
  const { limit = 10, nextToken, userId } = ctx.args;

  const index = "getAllDrafts";
  const query = {
    GSI2PK: { eq: `USER#${userId}` },
    GSI2SK: { beginsWith: "DRAFT#" },
  };
  return ddb.query({
    query,
    limit,
    nextToken,
    index: index,
    scanIndexForward: false,
  });
}

export function response(ctx) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }

  return {
    items: ctx.result.items,
    nextToken: ctx.result.nextToken,
  };
}
