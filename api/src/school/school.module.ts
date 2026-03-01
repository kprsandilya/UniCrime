import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { School } from './school.entity';
import { SchoolService } from './school.service';
import { SchoolResolver } from './school.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([School])],
  providers: [SchoolService, SchoolResolver],
  exports: [SchoolService],
})
export class SchoolModule {}
