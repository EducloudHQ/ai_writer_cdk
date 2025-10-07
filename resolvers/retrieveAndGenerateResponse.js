export const request = (ctx) => {
  // const input = ctx.args.input;
  return {
    method: "POST",
    resourcePath: "/retrieveAndGenerate",
    params: {
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        input: {
          text: ctx.args.input.text,
        },
        retrieveAndGenerateConfiguration: {
          knowledgeBaseConfiguration: {
            knowledgeBaseId: ctx.env.KNOWLEDGEBASE_ID,
            modelArn: ctx.env.FOUNDATION_MODEL_ARN,
          },

          type: "KNOWLEDGE_BASE",
        },
      },
    },
  };
};

export const response = (ctx) => {
  const response = JSON.parse(ctx.result.body);

  return response.output.text;
};
