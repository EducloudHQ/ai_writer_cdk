import { Handler } from "aws-lambda";

import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Tracer } from "@aws-lambda-powertools/tracer";

const logger = new Logger({
  persistentKeys: {
    aws_account_id: process.env.AWS_ACCOUNT_ID || "N/A",
    aws_region: process.env.AWS_REGION || "N/A",
  },
});

const metrics = new Metrics({
  defaultDimensions: {
    aws_account_id: process.env.AWS_ACCOUNT_ID || "N/A",
    aws_region: process.env.AWS_REGION || "N/A",
  },
});
const tracer = new Tracer();

export const handler: Handler = async (event, context) => {
  logger.info(`received scheduled post event`);
  logger.info(JSON.stringify(event));
};
