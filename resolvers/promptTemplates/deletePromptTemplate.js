import { remove } from "@aws-appsync/utils/dynamodb";
import { util } from "@aws-appsync/utils";

export function request(ctx) {
  const { id } = ctx.args;

  return remove({
    key: {
      PK: `PROMPT#${id}`,
      SK: `PROMPT#${id}`,
    },
  });
}

export function response(ctx) {
  // If the operation was successful, return true
  // If the item didn't exist, ctx.result will be null, but we still return true
  // as the end result is the same - the item doesn't exist
  return true;
}
