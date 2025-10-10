import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as path from "path";
import * as scheduler from "aws-cdk-lib/aws-scheduler";
import * as kms from "aws-cdk-lib/aws-kms";
import * as bedrock from "aws-cdk-lib/aws-bedrock";
import * as s3Vectors from "cdk-s3-vectors";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { AppSyncConstructProps } from "../types";
import {
  COMMON_TAGS,
  COMMON_LAMBDA_ENV_VARS,
  DEFAULT_LAMBDA_MEMORY_SIZE,
  DEFAULT_API_KEY_EXPIRATION_DAYS,
  BEDROCK_MODELS,
} from "../constants";

/**
 * Construct for AppSync API and related resources
 */
export class AppSyncConstruct extends Construct {
  /**
   * The AppSync GraphQL API
   */
  public readonly api: appsync.GraphqlApi;
  public readonly knowledgeBase: s3Vectors.KnowledgeBase;
  public readonly customDs: bedrock.CfnDataSource;
  public readonly createScheduleFunction: NodejsFunction;
  public readonly distributeContentFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: AppSyncConstructProps) {
    super(scope, id);

    const { aiWriterTable } = props;

    // Calculate API key expiration date
    const currentDate = new Date();
    const keyExpirationDate = new Date(
      currentDate.getTime() +
        DEFAULT_API_KEY_EXPIRATION_DAYS * 24 * 60 * 60 * 1000
    );

    // Create KMS key for encryption (optional)
    const encryptionKey = new kms.Key(this, "VectorBucketKey", {
      description: "KMS key for S3 vector bucket encryption",
      enableKeyRotation: true,
    });

    // Create a vector bucket with all options
    const vectorBucket = new s3Vectors.Bucket(this, "AiWriterVectorBucket", {
      vectorBucketName: "ai-writer-vector-bucket",
      encryptionConfiguration: {
        sseType: "aws:kms", // 'AES256' | 'aws:kms'
        kmsKey: encryptionKey, // Required when sseType is 'aws:kms'
      },
    });
    // Create a vector index with all options
    const vectorIndex = new s3Vectors.Index(this, "AiWriterVectorIndex", {
      vectorBucketName: vectorBucket.vectorBucketName, // REQUIRED
      indexName: "ai-writer-vector-index", // REQUIRED
      dataType: "float32", // REQUIRED (only 'float32' supported)
      dimension: 1024, // REQUIRED (1-4096)
      distanceMetric: "cosine", // REQUIRED ('euclidean' | 'cosine')
      // Optional metadata configuration
      metadataConfiguration: {
        nonFilterableMetadataKeys: ["source", "timestamp", "category"],
      },
    });
    // REQUIRED - add dependency for vector index
    vectorIndex.node.addDependency(vectorBucket);

    // Create a knowledge base with all options
    this.knowledgeBase = new s3Vectors.KnowledgeBase(
      this,
      "AiWriterKnowledgeBase",
      {
        knowledgeBaseName: "ai-writer-knowledge-base", // REQUIRED
        vectorBucketArn: vectorBucket.vectorBucketArn, // REQUIRED
        indexArn: vectorIndex.indexArn, // REQUIRED
        // REQUIRED knowledge base configuration
        knowledgeBaseConfiguration: {
          embeddingModelArn:
            "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0", // REQUIRED
          embeddingDataType: "FLOAT32", // Optional: 'BINARY' | 'FLOAT32'
          dimensions: "1024", // Optional: dimensions as string
        },
        // Optional fields
        description:
          "Knowledge base for vector similarity search using S3 Vectors",
        clientToken: "unique-client-token-12345678901234567890123456789012345", // Must be >= 33 characters
      }
    );
    // REQUIRED - add dependencies for knowledge base
    this.knowledgeBase.node.addDependency(vectorIndex);
    this.knowledgeBase.node.addDependency(vectorBucket);

    // Create data source for knowledge base
    this.customDs = new bedrock.CfnDataSource(this, "custom-data-source", {
      name: "custom-data-source",
      knowledgeBaseId: this.knowledgeBase.knowledgeBaseId,
      dataSourceConfiguration: {
        type: "CUSTOM",
      },
    });

    // Create a Cognito user pool with secure defaults
    const userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "AiWriterUserPool",
      selfSignUpEnabled: true,
      accountRecovery: cognito.AccountRecovery.PHONE_AND_EMAIL,
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(3),
      },
      userVerification: {
        emailStyle: cognito.VerificationEmailStyle.CODE,
        emailSubject: "Verify your email for Ai Writer",
        emailBody: "Thanks for signing up! Your verification code is {####}",
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Important for user data
    });

    // Create a user pool client
    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool: userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      preventUserExistenceErrors: true,
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      authSessionValidity: cdk.Duration.minutes(3),
      enableTokenRevocation: true,
    });

    // Create the IAM role for scheduled tasks
    const scheduledRole = new iam.Role(this, "ScheduledRole", {
      assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
      description:
        "Role assumed by EventBridge Scheduler for scheduled content",
    });

    // Create a schedule group for all user schedules
    const contentScheduledGroup = new scheduler.ScheduleGroup(
      this,
      "ContentScheduledGroup",
      {
        scheduleGroupName: "ContentScheduledGroup",
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }
    );

    // Create the AppSync API
    this.api = new appsync.GraphqlApi(this, "ai-writer-api", {
      name: "AiWriterAPI",
      definition: appsync.Definition.fromFile("schema/schema.graphql"),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            name: "default",
            description: "Default API key for Ai Writer API",
            expires: cdk.Expiration.atDate(keyExpirationDate),
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.USER_POOL,
            userPoolConfig: {
              userPool: userPool,
            },
          },
          { authorizationType: appsync.AuthorizationType.IAM },
        ],
      },
      xrayEnabled: true,
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL,
      },
    });

    // Create data sources
    const noneDs = this.api.addNoneDataSource("None");
    const dbDataSource = this.api.addDynamoDbDataSource(
      "aiWriterTableDataSource",
      aiWriterTable
    );

    // dedicated log group (avoid logRetention deprecation)
    const distributeContentFunctionLogs = new logs.LogGroup(
      this,
      "distributeContentFunctionLogs",
      {
        retention: logs.RetentionDays.ONE_WEEK,
      }
    );

    // this function gets triggered by Eventbridge scheduler
    this.distributeContentFunction = new NodejsFunction(
      this,
      "SendPostsFunction",
      {
        entry: path.join(
          __dirname,
          "../../lambda/ts/distributeContentFunction.ts"
        ),

        handler: "handler",
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: DEFAULT_LAMBDA_MEMORY_SIZE,
        logGroup: distributeContentFunctionLogs,
        tracing: lambda.Tracing.ACTIVE,
        environment: {
          ...COMMON_LAMBDA_ENV_VARS,
        },
        bundling: {
          minify: true,
        },
      }
    );

    // Grant permissions to invoke the distribute content function
    this.distributeContentFunction.grantInvoke(scheduledRole);

    const createScheduleLogs = new logs.LogGroup(this, "CreateScheduleLogs", {
      retention: logs.RetentionDays.ONE_WEEK,
    });

    // Create the schedule content function(this function gets triggered by eventbridge pipe)
    this.createScheduleFunction = new NodejsFunction(
      this,
      "CreateScheduleFunction",
      {
        entry: path.join(
          __dirname,
          "../../lambda/ts/createScheduleFunction.ts"
        ),
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: DEFAULT_LAMBDA_MEMORY_SIZE,
        logGroup: createScheduleLogs,
        tracing: lambda.Tracing.ACTIVE,
        environment: {
          ...COMMON_LAMBDA_ENV_VARS,
          SCHEDULE_GROUP_NAME: contentScheduledGroup.scheduleGroupName,
          SEND_POST_SERVICE_ARN: this.distributeContentFunction.functionArn,
          SCHEDULE_ROLE_ARN: scheduledRole.roleArn,
        },
        bundling: {
          minify: true,
        },
      }
    );

    // Grant permissions to create schedules
    this.createScheduleFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["scheduler:CreateSchedule", "iam:PassRole"],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      })
    );

    // Create pipeline resolvers for user account operations
    const formatUserAccountFunction = new appsync.AppsyncFunction(
      this,
      "FormatUserAccountInput",
      {
        api: this.api,
        dataSource: noneDs,
        name: "formatUserAccountInput",
        code: appsync.Code.fromAsset(
          "./resolvers/users/formatUserAccountInput.js"
        ),
        runtime: appsync.FunctionRuntime.JS_1_0_0,
      }
    );

    const createUserAccountFunction = new appsync.AppsyncFunction(
      this,
      "CreateUserAccountFunction",
      {
        api: this.api,
        dataSource: dbDataSource,
        name: "createUserAccountFunction",
        code: appsync.Code.fromAsset("./resolvers/users/createUserAccount.js"),
        runtime: appsync.FunctionRuntime.JS_1_0_0,
      }
    );

    this.api.createResolver("CreateUserAccount", {
      typeName: "Mutation",
      code: appsync.Code.fromAsset("./resolvers/pipeline/default.js"),
      fieldName: "createUserAccount",
      pipelineConfig: [formatUserAccountFunction, createUserAccountFunction],
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    this.api.createResolver("UpdateUserAccount", {
      typeName: "Mutation",
      fieldName: "updateUserAccount",
      dataSource: dbDataSource,
      code: appsync.Code.fromAsset("./resolvers/users/updateUserAccount.js"),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    this.api.createResolver("GetAllArticles", {
      typeName: "Query",
      fieldName: "getAllArticles",
      dataSource: dbDataSource,
      code: appsync.Code.fromAsset("./resolvers/articles/getAllArticles.js"),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });
    this.api.createResolver("GetArticle", {
      typeName: "Query",
      fieldName: "getArticle",
      dataSource: dbDataSource,
      code: appsync.Code.fromAsset("./resolvers/articles/getArticle.js"),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    this.api.createResolver("GetAllDrafts", {
      typeName: "Query",
      fieldName: "getAllDrafts",
      dataSource: dbDataSource,
      code: appsync.Code.fromAsset("./resolvers/drafts/getAllDrafts.js"),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });
    this.api.createResolver("GetDraft", {
      typeName: "Query",
      fieldName: "getDraft",
      dataSource: dbDataSource,
      code: appsync.Code.fromAsset("./resolvers/drafts/getDraft.js"),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });
    // Apply common tags
    [this.api].forEach((resource) => {
      Object.entries(COMMON_TAGS).forEach(([key, value]) => {
        cdk.Tags.of(resource).add(key, value);
      });
    });
  }
}
