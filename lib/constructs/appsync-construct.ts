import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";
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

  constructor(scope: Construct, id: string, props: AppSyncConstructProps) {
    super(scope, id);

    const { aiWriterTable } = props;

    // Calculate API key expiration date
    const currentDate = new Date();
    const keyExpirationDate = new Date(
      currentDate.getTime() +
        DEFAULT_API_KEY_EXPIRATION_DAYS * 24 * 60 * 60 * 1000
    );

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
