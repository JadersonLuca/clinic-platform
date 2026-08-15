import { Module } from '@nestjs/common';
import { SystemHealthProcessor } from './system-health.processor';

@Module({
  providers: [SystemHealthProcessor],
})
export class QueuesModule {}
