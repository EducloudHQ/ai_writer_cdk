import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as iam from "aws-cdk-lib/aws-iam";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as waf from "aws-cdk-lib/aws-wafv2";
import * as s3 from "aws-cdk-lib/aws-s3";
import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha/lib/function";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
/**
 * Properties for the AuthConstruct
 */
export interface AuthConstructProps {
  /**
   * The name of the user pool
   */
  userPoolName?: string;
}

/**
 * Properties for the DatabaseConstruct
 */
export interface DatabaseConstructProps {
  /**
   * The name of the DynamoDB table
   */
  tableName: string;

  /**
   * Whether to enable point-in-time recovery
   */
  enablePITR?: boolean;
}

/**
 * Properties for the WorkflowConstruct
 */
export interface WorkflowConstructProps {
  /**
   * The EventBridge event bus
   */
  eventBus: events.EventBus;
}

/**
 * Properties for the EventsConstruct
 */
export interface EventsConstructProps {
  /**
   * The DynamoDB table for posts
   */
  postsTable: dynamodb.Table;

  /**
   * The EventBridge event bus
   */
  eventBus: events.EventBus;

  /**
   * The AppSync GraphQL API
   */
  api: appsync.GraphqlApi;

  /**
   * The Lambda function for scheduling posts
   */
  schedulePostsFunction: lambda.Function;
}

/**
 * Properties for the AppSyncConstruct
 */
export interface AppSyncConstructProps {
  /**
   * The DynamoDB table for AiWriter
   */
  aiWriterTable: dynamodb.Table;
}

/**
 * Properties for the WafConstruct
 */
export interface WafConstructProps {
  /**
   * The AppSync GraphQL API to protect
   */
  api: appsync.GraphqlApi;

  /**
   * The name of the WAF WebACL
   * @default "GraphQLApiProtection"
   */
  webAclName?: string;

  /**
   * The rate limit for requests per 5-minute window
   * @default 1000
   */
  rateLimit?: number;

  /**
   * Whether to enable AWS managed rule sets
   * @default true
   */
  enableManagedRules?: boolean;
}
