import { invokeModel } from "@aws-appsync/utils/ai";
import { runtime } from "@aws-appsync/utils";

export function request(ctx) {
  const input = ctx.args.input;

  //const guardrail_id = ctx.env.GUARDRAIL_ID;
  // const guardrail_version = ctx.env.GUARDRAIL_VERSION;

  return invokeModel({
    modelId: "amazon.nova-canvas-v1:0",
    // guardrailIdentifier: guardrail_id,
    //guardrailVersion: guardrail_version,
    body: {
      inputText: input,
      taskType: "TEXT_IMAGE",
      imageGenerationConfig: {
        numberOfImages: 1,
        height: 1024,
        width: 1024,
        cfgScale: 8,
        seed: 42,
      },
      textGenerationConfig: {
        temperature: 0,
        topP: 1,
        maxTokenCount: 512,
      },
    },
  });
}

export function response(ctx) {
  console.log(`result is ${ctx.result}`);
  return ctx.result.images;
}
