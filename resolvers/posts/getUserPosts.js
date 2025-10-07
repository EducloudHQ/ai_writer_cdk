import * as ddb from "@aws-appsync/utils/dynamodb";

export function request(ctx) {
  const { limit = 10, nextToken, userId } = ctx.args;

  const index = "getAllUserPosts";
  const query = {
    GSI3PK: { eq: `USER#${userId}` },
    GSI3SK: { beginsWith: "POST#" },
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
