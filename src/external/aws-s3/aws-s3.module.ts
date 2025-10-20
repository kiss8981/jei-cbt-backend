import { Module } from '@nestjs/common';
import { AwsS3ApiAdapter } from './aws-s3.api.adapter';

@Module({
  imports: [],
  providers: [AwsS3ApiAdapter],
  exports: [AwsS3ApiAdapter],
})
export class AwsS3Module {}
