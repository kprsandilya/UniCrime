import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrimeLog } from './crime-log.entity';
import { CrimeLogService } from './crime-log.service';
import { CrimeLogResolver } from './crime-log.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([CrimeLog])],
  providers: [CrimeLogService, CrimeLogResolver],
})
export class CrimeLogModule {}
