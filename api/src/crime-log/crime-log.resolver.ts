import { Resolver, Query, Args } from '@nestjs/graphql';
import { CrimeLogService } from './crime-log.service';
import { CrimeLog } from './crime-log.entity';
import { GraphQLISODateTime } from '@nestjs/graphql';

@Resolver(() => CrimeLog)
export class CrimeLogResolver {
  constructor(private readonly crimeLogService: CrimeLogService) {}

  @Query(() => [CrimeLog], { name: 'crimeLogs' })
  findAll(
    @Args('schoolCode', { nullable: true }) schoolCode?: string,
    @Args('occurredAfter', {
      type: () => GraphQLISODateTime,
      nullable: true,
      description:
        'Only include logs where occurredDatetime >= this time (inclusive)',
    })
    occurredAfter?: Date,
    @Args('occurredBefore', {
      type: () => GraphQLISODateTime,
      nullable: true,
      description:
        'Only include logs where occurredDatetime <= this time (inclusive)',
    })
    occurredBefore?: Date,
  ) {
    return this.crimeLogService.findAll(
      schoolCode,
      occurredAfter,
      occurredBefore,
    );
  }

  @Query(() => CrimeLog, { name: 'crimeLog' })
  findOne(@Args('id') id: string) {
    return this.crimeLogService.findOne(id);
  }
}
