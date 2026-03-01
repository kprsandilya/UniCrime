import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CrimeLog,
  CreateCrimeLogInput,
  UpdateCrimeLogInput,
} from './crime-log.entity';

@Injectable()
export class CrimeLogService {
  constructor(
    @InjectRepository(CrimeLog)
    private readonly crimeLogRepo: Repository<CrimeLog>,
  ) {}

  async create(input: CreateCrimeLogInput): Promise<CrimeLog> {
    const log = this.crimeLogRepo.create(input);
    return this.crimeLogRepo.save(log);
  }

  async findAll(
    schoolCode?: string,
    occurredAfter?: Date,
    occurredBefore?: Date,
    caseNumber?: string,
    location?: string,
    description?: string,
    disposition?: string,
    narrative?: string,
  ): Promise<CrimeLog[]> {
    const qb = this.crimeLogRepo.createQueryBuilder('crime_log');
    if (schoolCode) {
      qb.andWhere('crime_log.school_code = :schoolCode', { schoolCode });
    }
    if (occurredAfter != null) {
      qb.andWhere('crime_log.occurred_datetime >= :occurredAfter', {
        occurredAfter,
      });
    }
    if (occurredBefore != null) {
      qb.andWhere('crime_log.occurred_datetime <= :occurredBefore', {
        occurredBefore,
      });
    }
    if (caseNumber != null && caseNumber !== '') {
      qb.andWhere('crime_log.case_number ILIKE :caseNumber', {
        caseNumber: `%${caseNumber}%`,
      });
    }
    if (location != null && location !== '') {
      qb.andWhere('crime_log.location ILIKE :location', {
        location: `%${location}%`,
      });
    }
    if (description != null && description !== '') {
      qb.andWhere('crime_log.description ILIKE :description', {
        description: `%${description}%`,
      });
    }
    if (disposition != null && disposition !== '') {
      qb.andWhere('crime_log.disposition ILIKE :disposition', {
        disposition: `%${disposition}%`,
      });
    }
    if (narrative != null && narrative !== '') {
      qb.andWhere('crime_log.narrative ILIKE :narrative', {
        narrative: `%${narrative}%`,
      });
    }
    return qb.orderBy('crime_log.report_datetime', 'DESC').getMany();
  }

  async findOne(id: string): Promise<CrimeLog> {
    const log = await this.crimeLogRepo.findOne({ where: { id } });
    if (!log) {
      throw new NotFoundException(`CrimeLog with id "${id}" not found`);
    }
    return log;
  }

  async update(input: UpdateCrimeLogInput): Promise<CrimeLog> {
    const log = await this.findOne(input.id);
    Object.assign(log, input);
    return this.crimeLogRepo.save(log);
  }

  async remove(id: string): Promise<CrimeLog> {
    const log = await this.findOne(id);
    const copy = { ...log };
    await this.crimeLogRepo.remove(log);
    return copy as CrimeLog;
  }
}
