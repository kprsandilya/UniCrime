import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { SchoolService } from './school.service';
import {
  School,
  CreateSchoolInput,
  UpdateSchoolInput,
} from './school.entity';

@Resolver(() => School)
export class SchoolResolver {
  constructor(private readonly schoolService: SchoolService) {}

  @Mutation(() => School)
  createSchool(@Args('input') input: CreateSchoolInput) {
    return this.schoolService.create(input);
  }

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

  @Mutation(() => School)
  updateSchool(@Args('input') input: UpdateSchoolInput) {
    return this.schoolService.update(input);
  }

  @Mutation(() => School)
  removeSchool(@Args('id') id: string) {
    return this.schoolService.remove(id);
  }
}
