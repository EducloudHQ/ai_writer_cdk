import { invokeModel } from "@aws-appsync/utils/ai";
import { runtime } from "@aws-appsync/utils";

export function request(ctx) {
  const { prompt, conditionImage, numOfImages } = ctx.args.input;

  //const guardrail_id = ctx.env.GUARDRAIL_ID;
  // const guardrail_version = ctx.env.GUARDRAIL_VERSION;

  return invokeModel({
    modelId: "amazon.nova-canvas-v1:0",
    // guardrailIdentifier: guardrail_id,
    //guardrailVersion: guardrail_version,
    body: {
      taskType: "OUTPAINTING",
      textToImageParams: {
        text: prompt,
        conditionImage: conditionImage,
        controlMode: "SEGMENTATION",
        controlStrength: 0.3,
      },
      imageGenerationConfig: {
        numberOfImages: numOfImages,

        height: 1024,
        width: 720,
        cfgScale: 8,
        seed: 42,
      },
    },
  });
}

export function response(ctx) {
  console.log(`result is ${ctx.result}`);
  return ctx.result.images;
}
