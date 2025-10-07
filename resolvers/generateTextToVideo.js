export function request(ctx) {
  const { input } = ctx.arguments;

  return {
    operation: "Invoke",
    payload: {
      field: ctx.info.fieldName,
      arguments: { input },
    },
  };
}

export function response(ctx) {
  return ctx.result;
}
