import { Module } from '@nestjs/common';
import { QueuesModule } from './queues/queues.module';

@Module({
  imports: [QueuesModule],
})
export class AppModule {}
