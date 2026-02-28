import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import {
  ObjectType,
  Field,
  ID,
  Float,
  InputType,
  GraphQLISODateTime,
} from '@nestjs/graphql';

@Entity('crime_logs')
@ObjectType()
export class CrimeLog {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column({ name: 'school_code' })
  @Field()
  schoolCode: string;

  @Column({ name: 'case_number' })
  @Field()
  caseNumber: string;

  @Column({ type: 'timestamptz', name: 'report_datetime' })
  @Field(() => GraphQLISODateTime)
  reportDatetime: Date;

  @Column({ type: 'timestamptz', name: 'occurred_datetime' })
  @Field(() => GraphQLISODateTime)
  occurredDatetime: Date;

  @Column({ type: 'text' })
  @Field()
  location: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  @Field(() => Float, { nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  @Field(() => Float, { nullable: true })
  longitude: number | null;

  @Column({ type: 'text', nullable: true })
  @Field(() => String, { nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  @Field(() => String, { nullable: true })
  disposition: string | null;
}

@InputType()
export class CreateCrimeLogInput {
  @Field()
  schoolCode: string;

  @Field()
  caseNumber: string;

  @Field(() => GraphQLISODateTime)
  reportDatetime: Date;

  @Field(() => GraphQLISODateTime)
  occurredDatetime: Date;

  @Field()
  location: string;

  @Field(() => Float, { nullable: true })
  latitude?: number | null;

  @Field(() => Float, { nullable: true })
  longitude?: number | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  disposition?: string | null;
}

@InputType()
export class UpdateCrimeLogInput {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  schoolCode?: string;

  @Field(() => String, { nullable: true })
  caseNumber?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  reportDatetime?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  occurredDatetime?: Date;

  @Field(() => String, { nullable: true })
  location?: string;

  @Field(() => Float, { nullable: true })
  latitude?: number | null;

  @Field(() => Float, { nullable: true })
  longitude?: number | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  disposition?: string | null;
}
