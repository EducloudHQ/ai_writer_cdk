export const request = (ctx) => {
  // const input = ctx.args.input;
  return {};
};

export const response = (ctx) => {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return {
    base64Images: ctx.args.input,
  };
};
