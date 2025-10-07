import { util } from "@aws-appsync/utils";

export function request(ctx) {
  const id = util.autoKsuid();
  const { input } = ctx.args;

  const pk = `PROMPT#${id}`;
  const sk = `PROMPT#${id}`;

  const key = { PK: pk, SK: sk };

  // Add required fields
  input.id = id;
  input.PK = pk;
  input.SK = sk;

  // Add metadata
  input.ENTITY = "PROMPT";
  input.GSI4PK = "PROMPT#";
  input.GSI4SK = pk;

  // Add timestamps
  input.createdOn = util.time.nowEpochMilliSeconds();

  const condition = {
    PK: { attributeExists: false },
    SK: { attributeExists: false },
  };

  return {
    payload: {
      key: key,
      values: input,
      condition: condition,
    },
  };
}

export function response(ctx) {
  return ctx.result;
}
