import { get } from "@aws-appsync/utils/dynamodb";
export function request(ctx) {
  const id = ctx.args.id;
  const key = {
    PK: `DRAFT#${id}`,
    SK: `DRAFT#${id}`,
  };
  return get({ key: key });
}

export function response(ctx) {
  return ctx.result;
}
