import os
import json
import uuid
from urllib.parse import unquote_plus
import boto3
from ksuid import Ksuid
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.utilities.data_classes import event_source, S3Event

logger = Logger(service="ai-writer-doc-processing-lambda")
tracer = Tracer(service="ai-writer-doc-processing-lambda")
metrics = Metrics(namespace="ai-writer-doc-processing-lambda")

s3 = boto3.client("s3")
bedrock_agent = boto3.client("bedrock-agent")

MEDIA_BUCKET = os.environ["MEDIA_BUCKET"]
KNOWLEDGE_BASE_ID = os.environ["KNOWLEDGE_BASE_ID"]
DATA_SOURCE_ID = os.environ["DATA_SOURCE_ID"]  

@event_source(data_class=S3Event)
@logger.inject_lambda_context
@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def lambda_handler(event: S3Event, context):
    logger.info(f"Raw S3 event {event}")
    session_id = f"Root=1-{uuid.uuid4().hex[:8]}-{uuid.uuid4().hex[:24]}"

    for record in event.records:
        bucket_name = record.s3.bucket.name
        object_key = unquote_plus(record.s3.get_object.key)  # aws-lambda-powertools S3Event uses get_object.key
        logger.info({"bucket": bucket_name, "key": object_key, "trace": session_id})

        # Only act on your media bucket (optional safety)
        if bucket_name != MEDIA_BUCKET:
            logger.warning(f"Skipping object from unexpected bucket: {bucket_name}")
            continue

        # Build S3 URI for the uploaded PDF
        s3_uri = f"s3://{bucket_name}/{object_key}"
        custom_doc_id = str(Ksuid())  # stable per S3 key; you can also hash the key

        # Optional: attach inline metadata (key/value pairs)
        inline_meta = [
            {"key": "uploaderBucket", "value": {"type": "STRING", "stringValue": bucket_name}},
            {"key": "objectKey", "value": {"type": "STRING", "stringValue": object_key}},
            {"key": "source", "value": {"type": "STRING", "stringValue": "s3-upload-lambda"}},
        ]

        # Submit the document for direct ingestion into the KB connected to your CUSTOM data source
        resp = bedrock_agent.ingest_knowledge_base_documents(
            knowledgeBaseId=KNOWLEDGE_BASE_ID,
            dataSourceId=DATA_SOURCE_ID,
            documents=[
                {
                    "metadata": {
                        "type": "IN_LINE_ATTRIBUTE",
                        "inlineAttributes": inline_meta,
                    },
                    "content": {
                        "dataSourceType": "CUSTOM",
                        "custom": {
                            "customDocumentIdentifier": {"id": custom_doc_id},
                            "sourceType": "S3_LOCATION",
                            "s3Location": {"uri": s3_uri},
                        },
                    },
                }
            ],
        )

        # Log returned statuses (STARTED/PENDING/IN_PROGRESS/INDEXED/etc.)
        logger.info({"ingestionResponse": resp})

      
        
     
    return {"ok": True}
