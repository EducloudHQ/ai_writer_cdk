import { util } from "@aws-appsync/utils";

export function request(ctx) {
  const id = util.autoKsuid();
  const { ...values } = ctx.args;

  const pk = `USER#${id}`;
  const sk = `USER#${id}`;

  const key = { PK: pk, SK: sk };

  values.userInput.id = id;
  values.userInput.PK = pk;
  values.userInput.SK = sk;

  values.userInput.ENTITY = "USER";
  values.userInput.GSI1PK = "USER#";
  values.userInput.GSI1SK = sk;

  const startDate = util.time.nowEpochMilliSeconds();
  const endDate = startDate + 30 * 24 * 60 * 60 * 1000;
  // Add subscription data for GSI
  values.userInput.GSI6PK = pk;
  values.userInput.GSI6SK = "SUBSCRIPTION#";

  values.userInput.createdOn = util.time.nowEpochMilliSeconds();
  const condition = {
    PK: { attributeExists: false },
    SK: { attributeExists: false },
  };

  return {
    payload: {
      key: key,
      values: values.userInput,
      condition: condition,
    },
  };
}

export function response(ctx) {
  return ctx.result;
}
