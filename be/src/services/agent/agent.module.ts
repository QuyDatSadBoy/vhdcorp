import { Global, Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';

/** Global để ProductModule/CategoryModule inject AgentService không cần import lặp. */
@Global()
@Module({
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
