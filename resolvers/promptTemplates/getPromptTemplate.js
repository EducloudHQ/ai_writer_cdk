import { get } from "@aws-appsync/utils/dynamodb";
import { util } from "@aws-appsync/utils";

export function request(ctx) {
  const { id } = ctx.args;

  return get({
    key: {
      PK: `PROMPT#${id}`,
      SK: `PROMPT#${id}`,
    },
  });
}

export function response(ctx) {
  if (!ctx.result) {
    util.error("Prompt template not found", "PromptTemplateNotFoundError");
  }

  return ctx.result;
}
