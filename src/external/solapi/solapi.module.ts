import { Module } from '@nestjs/common';
import { SolapiApiAdapter } from './solapi.api.adapter';

@Module({
  imports: [],
  providers: [SolapiApiAdapter],
  exports: [SolapiApiAdapter],
})
export class SolapiModule {}
