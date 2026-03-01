import { Module } from '@nestjs/common';
import { GraphQLSchemaModule } from '../graphql-schema.module';
import { NlpController } from './nlp.controller';
import { NlpService } from './nlp.service';

@Module({
  imports: [GraphQLSchemaModule],
  controllers: [NlpController],
  providers: [NlpService],
})
export class NlpModule {}
