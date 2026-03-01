import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrimeLogModule } from './crime-log/crime-log.module';
import { CrimeLog } from './crime-log/crime-log.entity';
import { SchoolModule } from './school/school.module';
import { School } from './school/school.entity';
import { NlpModule } from './nlp/nlp.module';
import { GraphQLSchemaModule } from './graphql-schema.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [CrimeLog, School],
    }),
    GraphQLSchemaModule,
    CrimeLogModule,
    SchoolModule,
    NlpModule,
  ],
})
export class AppModule {}
