# Serverless Photo Resizer

This project is a **serverless image processing pipeline** built using **AWS Lambda**, **S3**, and **SNS**, deployed with the **AWS SAM CLI**.

## Overview

Whenever a new image is uploaded to the **Source S3 Bucket**, this Lambda function is triggered automatically. It:
1. **Downloads the image** from the source bucket
2. **Resizes it** using [`sharp`](https://sharp.pixelplumbing.com/)
3. **Uploads it** to a destination bucket
4. **Publishes the resulting URL** to an SNS topic
5. **Notifies via email**

---

## Tech Stack

- AWS Lambda (Node.js 18)
- AWS S3 (Source and Destination Buckets)
- AWS SNS (for email notifications)
- AWS SAM CLI (for deployment)
- Node.js + sharp (for image processing)
- Jest (unit testing with mocks)

---

## Deployment Instructions

### 1. Prerequisites
- AWS Account with necessary permissions
- AWS CLI configured (`aws configure`)
- AWS SAM CLI installed
- Node.js 18+

---

### 2. Deployment Steps

```bash
# Install dependencies
npm install

# Build
sam build

# Deploy
sam deploy --guided
```
During sam deploy --guided, you'll be prompted to:
- Choose region (e.g. ap-southeast-2)
- Let SAM create IAM roles
- Provide stack name (e.g. photo-resizer-stack)
- Automatically create and use a managed S3 bucket

---

### 3. Post-Deployment (Manual Setup)
Go to the AWS Lambda Console → your function → Function overview
Manually set up the following:

Source Bucket Trigger
- Trigger type: S3
- Event type: All object create events
- Bucket: Your source bucket

SNS Destination Email
1. Go to Amazon SNS Console
2. Select the topic created by the SAM template
3. Add a subscription: 
  - Protocol: Email
  - Endpoint: your email address
4. Check your inbox and confirm the subscription

---

## Testing
```bash
npm run test
```
- Unit tests are written using Jest
- AWS SDK and sharp are fully mocked
- It tests the complete Lambda flow: getObject → resize → putObject → publish

---

## Fixes & Adjustments

Removed ACL: 'public-read' in putObject
This line caused deployment failure:
```bash
AccessControlListNotSupported: The bucket does not allow ACLs
```
Solution: We removed it and instead used a bucket policy to make the destination bucket publicly readable.

Destination Bucket Policy (Public Read)
```bash
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::<my-destination-bucket-name>/*"
    }
  ]
}
```
---

## Deployment Challenge: Circular Dependency Error

Originally, I tried defining the **S3 trigger** directly in the SAM template using the `Events:` section:

```yaml
Events:
  S3UploadEvent:
    Type: S3
    Properties:
      Bucket: !Ref SourceBucket
      Events: s3:ObjectCreated:*
```

However, this caused a deployment failure due to circular dependency:
```vbnet
Error: Failed to create changeset for the stack: photo-resizer-stack
Reason: Circular dependency between resources: [SourceBucket, ResizeImageFunctionS3UploadEventPermission, ResizeImageFunctionRole, ResizeImageFunction]
```

Final Fix:
- Removed the S3 trigger from the SAM template
- Manually added the S3 trigger in the AWS Lambda Console after deployment
This way, the Lambda function can still be triggered correctly when a new image is uploaded, without causing deployment issues.

---

## Future Consideration: Use Terraform for Dependency Control

In future versions, consider using Terraform for better dependency control:

- Explicit control of resource dependencies (depends_on)
- Better separation of resource creation and permission setup
- No need for manual post-deployment steps like S3 triggers


