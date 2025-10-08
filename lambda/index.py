import os
import json
import boto3
import uuid,time
from ksuid import Ksuid

from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.utilities.data_classes import event_source, S3Event


logger = Logger(service="ai-writer-doc-processing-lambda")
tracer = Tracer(service="ai-writer-doc-processing-lambda")
metrics = Metrics(namespace="ai-writer-doc-processing-lambda")




s3 = boto3.client("s3")

MEDIA_BUCKET = os.environ["MEDIA_BUCKET"]

KNOWLEDGE_BASE_ID = os.environ["KNOWLEDGE_BASE_ID"]

unique_email_id = str(Ksuid())


@event_source(data_class=S3Event)
@logger.inject_lambda_context
@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def lambda_handler(event: S3Event, context):
    logger.info(f"Raw S3 event {event}")
    session_id = f"Root=1-{uuid.uuid4().hex[:8]}-{uuid.uuid4().hex[:24]}"
   

    for record in event.records:
        logger.info(f"Record: {record}")
        bucket_name = record.s3.bucket.name
        object_key = unquote_plus(record.s3.get_object.key)

        logger.info(
            f"S3 event bucket={bucket_name}, key={object_key}"
        )  # structured log

        raw_email = s3.get_object(Bucket=bucket_name, Key=object_key)["Body"].read()
