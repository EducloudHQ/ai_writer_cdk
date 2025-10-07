#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AiWriterStack } from "../lib/ai_writer-stack";

const app = new cdk.App();
new AiWriterStack(app, "AiWriterStack", {
  env: { account: "132260253285", region: "us-east-1" },
});
