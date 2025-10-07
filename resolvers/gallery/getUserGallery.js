import { query } from "@aws-appsync/utils/dynamodb";
import { util } from "@aws-appsync/utils";

export function request(ctx) {
  const { userId } = ctx.args;

  const index = "getUserGallery";

  const queryParams = {
    index,
    limit,
    query: {
      PK: { eq: `USER#${userId}` },
      SK: { beginsWith: "GALLERY#" },
    },
    nextToken,
  };

  console.log(`Query params: ${JSON.stringify(queryParams)}`);

  return query(queryParams);
}

export function response(ctx) {
  const { items = [] } = ctx.result;

  return items;
}
