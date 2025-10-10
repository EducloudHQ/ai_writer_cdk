import { Handler } from "aws-lambda";
import { logger, metrics, tracer } from "./utilities";
export const handler: Handler = async (event, context) => {
  logger.info(`received scheduled post event`);
  logger.info(JSON.stringify(event));
};
