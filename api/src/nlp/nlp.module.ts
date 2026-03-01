import { Module } from '@nestjs/common';
import { GraphQLSchemaModule } from '../graphql-schema.module';
import { SchoolModule } from '../school/school.module';
import { NlpController } from './nlp.controller';
import { NlpService } from './nlp.service';

@Module({
  imports: [GraphQLSchemaModule, SchoolModule],
  controllers: [NlpController],
  providers: [NlpService],
})
export class NlpModule {}
