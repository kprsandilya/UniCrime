import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { CrimeLogService } from './crime-log.service';
import {
  CrimeLog,
  CreateCrimeLogInput,
  UpdateCrimeLogInput,
} from './crime-log.entity';
import { GraphQLISODateTime } from '@nestjs/graphql';

@Resolver(() => CrimeLog)
export class CrimeLogResolver {
  constructor(private readonly crimeLogService: CrimeLogService) {}

  @Mutation(() => CrimeLog)
  createCrimeLog(@Args('input') input: CreateCrimeLogInput) {
    return this.crimeLogService.create(input);
  }

  @Query(() => [CrimeLog], { name: 'crimeLogs' })
  findAll(
    @Args('schoolCode', { nullable: true }) schoolCode?: string,
    @Args('occurredAfter', {
      type: () => GraphQLISODateTime,
      nullable: true,
      description: 'Only include logs where occurredDatetime >= this time (inclusive)',
    })
    occurredAfter?: Date,
    @Args('occurredBefore', {
      type: () => GraphQLISODateTime,
      nullable: true,
      description: 'Only include logs where occurredDatetime <= this time (inclusive)',
    })
    occurredBefore?: Date,
  ) {
    return this.crimeLogService.findAll(schoolCode, occurredAfter, occurredBefore);
  }

  @Query(() => CrimeLog, { name: 'crimeLog' })
  findOne(@Args('id') id: string) {
    return this.crimeLogService.findOne(id);
  }

  @Mutation(() => CrimeLog)
  updateCrimeLog(@Args('input') input: UpdateCrimeLogInput) {
    return this.crimeLogService.update(input);
  }

  @Mutation(() => CrimeLog)
  removeCrimeLog(@Args('id') id: string) {
    return this.crimeLogService.remove(id);
  }
}
