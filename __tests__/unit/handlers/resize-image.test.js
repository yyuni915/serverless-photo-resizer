jest.mock('aws-sdk', () => {
    const S3 = {
      getObject: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Body: Buffer.from('fake-image') })
      }),
      putObject: jest.fn().mockReturnValue({ promise: jest.fn().mockResolvedValue({}) })
    };
  
    const SNS = jest.fn(() => ({
      publish: jest.fn().mockReturnValue({ promise: jest.fn().mockResolvedValue({}) })
    }));
  
    return { S3: jest.fn(() => S3), SNS };
  });
  
  jest.mock('sharp', () => () => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('resized-image'))
  }));
  
  const lambda = require('../../../src/handlers/resize-image');
  
  describe('resizeImageHandler', () => {
    it('resizes image and sends SNS message', async () => {
      const mockEvent = {
        Records: [{
          awsRegion: 'ap-northeast-2',
          s3: {
            bucket: { name: 'source-bucket' },
            object: { key: 'test.jpg' }
          }
        }]
      };
  
      process.env.destinationBucket = 'destination-bucket';
      process.env.topicArn = 'arn:aws:sns:ap-northeast-2:123456789012:imageResizedTopic';
  
      const result = await lambda.resizeImageHandler(mockEvent, {});
      const body = JSON.parse(result.body);
  
      expect(result.statusCode).toBe(200);
      expect(body).toHaveProperty('url');
      expect(body.message).toBe('Image resized and URL sent via SNS');
    });
  });
  