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
    @Args('caseNumber', {
      nullable: true,
      description:
        'Only include logs where caseNumber contains this string (case-insensitive).',
    })
    caseNumber?: string,
    @Args('location', {
      nullable: true,
      description:
        'Only include logs where location contains this string (case-insensitive).',
    })
    location?: string,
    @Args('description', {
      nullable: true,
      description:
        'Only include logs where description contains this string (case-insensitive).',
    })
    description?: string,
    @Args('disposition', {
      nullable: true,
      description:
        'Only include logs where disposition contains this string (case-insensitive).',
    })
    disposition?: string,
    @Args('narrative', {
      nullable: true,
      description:
        'Only include logs where narrative contains this string (case-insensitive).',
    })
    narrative?: string,
  ) {
    return this.crimeLogService.findAll(
      schoolCode,
      occurredAfter,
      occurredBefore,
      caseNumber,
      location,
      description,
      disposition,
      narrative,
    );
  }

  @Query(() => CrimeLog, { name: 'crimeLog' })
  findOne(@Args('id') id: string) {
    return this.crimeLogService.findOne(id);
  }
}
