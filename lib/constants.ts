import * as cdk from "aws-cdk-lib";

/**
 * Common tags to apply to all resources
 */
export const COMMON_TAGS = {
  Project: "AiWriter",
  Environment: "Development",
  Owner: "Rosius Ndimofor",
  ManagedBy: "CDK",
};

/**
 * Common environment variables for Lambda functions
 */
export const COMMON_LAMBDA_ENV_VARS = {
  POWERTOOLS_SERVICE_NAME: "ai-writer",
  POWERTOOLS_LOGGER_LOG_LEVEL: "WARN",
  POWERTOOLS_LOGGER_SAMPLE_RATE: "0.01",
  POWERTOOLS_LOGGER_LOG_EVENT: "true",
  POWERTOOLS_METRICS_NAMESPACE: "AiWriter",
};

/**
 * Default memory size for Lambda functions in MB
 */
export const DEFAULT_LAMBDA_MEMORY_SIZE = 256;

/**
 * Default memory size for Lambda functions in MB
 */
export const AGENT_LAMBDA_MEMORY_SIZE = 512;
/**
 * Default log retention period in days
 */
export const DEFAULT_LOG_RETENTION_DAYS = cdk.aws_logs.RetentionDays.ONE_WEEK;

/**
 * Default API key expiration in days
 */
export const DEFAULT_API_KEY_EXPIRATION_DAYS = 7;

/**
 * Default removal policy for resources
 */
export const DEFAULT_REMOVAL_POLICY = cdk.RemovalPolicy.DESTROY;

/**
 * Default AWS region
 */
export const DEFAULT_REGION = "us-east-1";

/**
 * Bedrock model ARNs
 */
export const BEDROCK_MODELS = {
  CLAUDE_3_5_SONNET:
    "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0",
  NOVA_CANVAS:
    "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-canvas-v1:0",
  TITAN_EMBED_TEXT:
    "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0",
};

/**
 * DynamoDB table indexes
 */
export const TABLE_INDEXES = {
  ALL_USERS: "getAllUsers",
  ALL_ARTICLES: "getAllArticles",
};

/**
 * DynamoDB table attribute names
 */
export const TABLE_ATTRIBUTES = {
  PARTITION_KEY: "PK",
  SORT_KEY: "SK",
  GSI1_PARTITION_KEY: "GSI1PK",
  GSI1_SORT_KEY: "GSI1SK",
  GSI2_PARTITION_KEY: "GSI2PK",
  GSI2_SORT_KEY: "GSI2SK",
  GSI3_PARTITION_KEY: "GSI3PK",
  GSI3_SORT_KEY: "GSI3SK",
  EMAIL: "email",
};
