import { remove } from "@aws-appsync/utils/dynamodb";

export function request(ctx) {
  const { postId } = ctx.args;

  const key = {
    PK: `POST#${postId}`,
    SK: `POST#${postId}`,
  };

  return remove({ key: key });
}

export function respose(ctx) {
  return ctx.result;
}
