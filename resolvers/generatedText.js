export const request = (ctx) => {
  // const input = ctx.args.input;
  return {};
};

export const response = (ctx) => {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return {
    text: ctx.args.input,
  };
};
