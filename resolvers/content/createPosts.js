import { util } from "@aws-appsync/utils";
import { put } from "@aws-appsync/utils/dynamodb";

export function request(ctx) {
  const { scheduledContentInput } = ctx.args;

  const id = util.autoKsuid();

  const key = {
    PK: `SCH_CONTENT#${id}`,
    SK: `SCH_CONTENT#${id}`,
  };

  const scheduledContentInputItem = {
    ...scheduledContentInput,
    id: id,
    GSI3PK: `USER#${scheduledContentInput.userId}`,
    GSI3SK: `SCH_CONTENT#${id}`,
    createdOn: util.time.nowEpochMilliSeconds(),
  };

  return put({ key: key, item: scheduledContentInputItem });
}

export function response(ctx) {
  return ctx.result;
}
