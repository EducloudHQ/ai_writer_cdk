import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import { AppSyncConstruct } from "./constructs/appsync-construct";

export class AiWriterStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the DynamoDB table with a single-table design
    const ai_writer_db = new dynamodb.Table(this, "AiWriterTable", {
      tableName: "ai-writer-table",
      partitionKey: {
        name: "PK",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "SK",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,

      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: false,
      },
      stream: dynamodb.StreamViewType.NEW_IMAGE,
    });

    // Add global secondary index for getting all users
    ai_writer_db.addGlobalSecondaryIndex({
      indexName: "getAllArticles",
      partitionKey: {
        name: "GSI1PK",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "GSI1SK",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    /*
    // Add global secondary index for getting all users
    ai_writer_db.addGlobalSecondaryIndex({
      indexName: "getAllDrafts",
      partitionKey: {
        name: "GSI2PK",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "GSI2SK",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    */

    // Create an S3 bucket for storing generated videos and thumbnails
    const mediaBucket = new s3.Bucket(this, "S3MediaBucket", {
      bucketName: `${cdk.Stack.of(this).account}-${
        cdk.Stack.of(this).region
      }-media-bucket`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      lifecycleRules: [
        {
          id: "DeleteOldVersions",
          enabled: true,
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    const appSyncConstruct = new AppSyncConstruct(this, "AppSyncConstruct", {
      aiWriterTable: ai_writer_db,
    });

    new cdk.CfnOutput(this, "GraphQLAPIKey", {
      value: appSyncConstruct.api.apiKey || "",
      description: "The API key for the GraphQL API",
    });

    // Output the media bucket name
    new cdk.CfnOutput(this, "MediaBucketName", {
      value: mediaBucket.bucketName,
      description: "The name of the S3 bucket for media uploads",
    });

    // Output the API URL, API Key, and WAF WebACL ID
    new cdk.CfnOutput(this, "GraphQLAPIURL", {
      value: appSyncConstruct.api.graphqlUrl,
      description: "The URL of the GraphQL API",
    });
  }
}
