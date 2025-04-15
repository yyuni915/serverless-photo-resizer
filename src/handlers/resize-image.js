/**
 * Lambda function to resize an image uploaded to S3 and publish the resulting URL to an SNS topic
 */

const AWS = require('aws-sdk');
const sharp = require('sharp');
require('dotenv').config()

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

exports.resizeImageHandler = async (event, context) => {
  try{
    const region = event.Records[0].awsRegion;
    const sourceBucket = event.Records[0].s3.bucket.name;
    const objectKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

    // Read the uploaded image from the source bucket
    const s3Object = await s3.getObject({
      Bucket: sourceBucket,
      Key: objectKey
    }).promise();

    // Resize the image using sharp
    const resizedImage = await sharp(s3Object.Body)
    .resize(200) // You can make this dynamic
    .jpeg({ mozjpeg: true })
    .toBuffer();

    // Upload the resized image to the destination bucket
    await s3.putObject({
      Bucket: process.env.destinationBucket,
      Key: objectKey,
      ContentType: 'image/jpeg',
      Body: resizedImage,
      ACL: 'public-read'
    }).promise();

    // Publish the image URL to SNS
    const imageUrl = `https://${process.env.destinationBucket}.s3.${region}.amazonaws.com/${objectKey}`;
    const sns = new AWS.SNS({ region });

    await sns.publish({
      Message: `Link : ${imageUrl}`,
      Subject: 'Image URL is ready',
      TopicArn: process.env.topicArn
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Image resized and URL sent via SNS', url: imageUrl })
    };
  } catch (error) {
    console.error('Error resizing image:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process image' })
    };
  }
};

 