import { update } from "@aws-appsync/utils/dynamodb";
import { util } from "@aws-appsync/utils";

export function request(ctx) {
  const { input } = ctx.args;
  const { id } = input;

  // Remove id from the input as it's part of the key
  const updateValues = { ...input };
  delete updateValues.id;

  // Add updatedOn timestamp
  updateValues.updatedOn = util.time.nowEpochMilliSeconds();

  const updateExpression = {};
  const expressionNames = {};
  const expressionValues = {};

  // Build the update expression dynamically based on provided fields
  Object.keys(updateValues).forEach((key, index) => {
    if (updateValues[key] !== undefined) {
      const fieldName = `#field${index}`;
      const fieldValue = `:value${index}`;

      expressionNames[fieldName] = key;
      expressionValues[fieldValue] = updateValues[key];

      if (!updateExpression.set) {
        updateExpression.set = [];
      }

      updateExpression.set.push(`${fieldName} = ${fieldValue}`);
    }
  });

  return update({
    key: {
      PK: `PROMPT#${id}`,
      SK: `PROMPT#${id}`,
    },
    update: updateExpression,
    expressionNames,
    expressionValues,
  });
}

export function response(ctx) {
  if (!ctx.result) {
    util.error("Prompt template not found", "PromptTemplateNotFoundError");
  }

  return ctx.result;
}
