import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  School,
  CreateSchoolInput,
  UpdateSchoolInput,
} from './school.entity';

@Injectable()
export class SchoolService {
  constructor(
    @InjectRepository(School)
    private readonly schoolRepo: Repository<School>,
  ) {}

  async create(input: CreateSchoolInput): Promise<School> {
    const school = this.schoolRepo.create(input);
    return this.schoolRepo.save(school);
  }

  async findAll(
    schoolCode?: string,
    stateCode?: string,
  ): Promise<School[]> {
    const qb = this.schoolRepo.createQueryBuilder('school');
    if (schoolCode != null && schoolCode !== '') {
      qb.andWhere('school.school_code = :schoolCode', { schoolCode });
    }
    if (stateCode != null && stateCode !== '') {
      qb.andWhere('school.state_code = :stateCode', { stateCode });
    }
    return qb.orderBy('school.school_name', 'ASC').getMany();
  }

  async findOne(id: string): Promise<School> {
    const school = await this.schoolRepo.findOne({ where: { id } });
    if (!school) {
      throw new NotFoundException(`School with id "${id}" not found`);
    }
    return school;
  }

  async update(input: UpdateSchoolInput): Promise<School> {
    const school = await this.findOne(input.id);
    Object.assign(school, input);
    return this.schoolRepo.save(school);
  }

  async remove(id: string): Promise<School> {
    const school = await this.findOne(id);
    const copy = { ...school };
    await this.schoolRepo.remove(school);
    return copy as School;
  }
}
