import { util } from "@aws-appsync/utils";

export function request(ctx) {
  const id = util.autoKsuid();
  const { tier } = ctx.args.input;

  // GSI for getting all subscriptions
  const pk = `SUBSCRIPTION#${tier}`;
  const sk = `SUBSCRIPTION#${tier}`;

  // GSI for getting all subscriptions
  const GSI5PK = "SUBSCRIPTION#";
  const GSI5SK = sk;

  const key = { PK: pk, SK: sk };

  const values = {
    id,
    PK: pk,
    SK: sk,
    ...ctx.args.input,
    ENTITY: "SUBSCRIPTION",

    GSI5PK: GSI5PK,
    GSI5SK: GSI5SK,
    createdOn: util.time.nowEpochMilliSeconds(),
  };

  const condition = {
    // Ensure no subscription exists
    GSI5PK: { attributeExists: false },
    GSI5SK: { attributeExists: false },
  };

  return {
    payload: {
      key,
      values,
      condition,
    },
  };
}

export function response(ctx) {
  return ctx.result;
}
