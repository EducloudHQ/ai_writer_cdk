import { put } from "@aws-appsync/utils/dynamodb";

export function request(ctx) {
  const { ...key } = ctx.prev.result.key;
  const { ...values } = ctx.prev.result.values;
  const { condition } = ctx.prev.result.condition;

  return put({
    key,
    item: values,
    condition,
  });
}

export function response(ctx) {
  return ctx.result;
}
