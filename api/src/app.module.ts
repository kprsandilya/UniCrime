import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius';
import { join } from 'path';
import { HelloResolver } from './hello.resolver';
import { AppController } from './app.controller';

@Module({
  imports: [
    GraphQLModule.forRoot<MercuriusDriverConfig>({
      driver: MercuriusDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'), // generated automatically
      graphiql: true,
    }),
  ],
  controllers: [AppController],
  providers: [HelloResolver],
})
export class AppModule {}
