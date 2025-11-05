import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SolapiApiAdapter {
  private readonly logger = new Logger(SolapiApiAdapter.name);

  constructor() {}
}
