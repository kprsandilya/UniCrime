import { Resolver, Query, Args } from '@nestjs/graphql';
import { SchoolService } from './school.service';
import { School } from './school.entity';

@Resolver(() => School)
export class SchoolResolver {
  constructor(private readonly schoolService: SchoolService) {}

  @Query(() => [School], { name: 'schools' })
  findAll(
    @Args('schoolCode', { nullable: true }) schoolCode?: string,
    @Args('stateCode', { nullable: true }) stateCode?: string,
  ) {
    return this.schoolService.findAll(schoolCode, stateCode);
  }

  @Query(() => School, { name: 'school' })
  findOne(@Args('id') id: string) {
    return this.schoolService.findOne(id);
  }
}
