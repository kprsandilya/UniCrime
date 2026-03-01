import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius';
import { join } from 'path';

/** Use a writable path on Vercel (read-only fs); otherwise use src/schema.gql for local dev. */
const schemaFile =
  process.env.VERCEL === '1'
    ? join(process.env.TMPDIR ?? '/tmp', 'schema.gql')
    : join(process.cwd(), 'src/schema.gql');

@Module({
  imports: [
    GraphQLModule.forRoot<MercuriusDriverConfig>({
      driver: MercuriusDriver,
      graphiql: true,
      autoSchemaFile: schemaFile,
    }),
  ],
  exports: [GraphQLModule],
})
export class GraphQLSchemaModule {}
