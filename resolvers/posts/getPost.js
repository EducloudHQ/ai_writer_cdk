import { get } from "@aws-appsync/utils/dynamodb";
export function request(ctx) {
  const postId = ctx.args.id;
  const key = {
    PK: `POST#${postId}`,
    SK: `POST#${postId}`,
  };
  return get({ key: key });
}

export function response(ctx) {
  return ctx.result;
}
