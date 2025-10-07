import { query } from "@aws-appsync/utils/dynamodb";
import { util } from "@aws-appsync/utils";

export function request(ctx) {
  const { limit = 20, nextToken } = ctx.args;

  const index = "getAllPrompts"; // Using the existing GSI1 index

  const queryParams = {
    index,
    limit,
    query: {
      GSI4PK: { eq: "PROMPT#" },
      GSI4SK: { beginsWith: "PROMPT#" },
    },
    nextToken,
  };

  console.log(`Query params: ${JSON.stringify(queryParams)}`);

  return query(queryParams);
}

export function response(ctx) {
  const { items = [], nextToken } = ctx.result;

  return {
    items,
    nextToken,
  };
}
