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
@ObjectType({
  description:
    'A single crime log entry from campus safety / Clery Act reporting.',
})
export class CrimeLog {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID, {
    description: 'Unique identifier for the crime log.',
  })
  id: string;

  @Column({ name: 'school_code' })
  @Field({
    description: 'Institution code (e.g. Clery campus ID) the log belongs to.',
  })
  schoolCode: string;

  @Column({ name: 'case_number' })
  @Field({
    description: 'Official case or report number from the institution.',
  })
  caseNumber: string;

  @Column({ type: 'timestamptz', name: 'report_datetime', nullable: true })
  @Field(() => GraphQLISODateTime, {
    nullable: true,
    description: 'When the incident was reported (ISO 8601).',
  })
  reportDatetime: Date | null;

  @Column({ type: 'timestamptz', name: 'occurred_datetime' })
  @Field(() => GraphQLISODateTime, {
    description: 'When the incident occurred (ISO 8601).',
  })
  occurredDatetime: Date;

  @Column({ type: 'text' })
  @Field({ description: 'Location or address where the incident occurred.' })
  location: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  @Field(() => Float, { description: 'Latitude of the incident location.' })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  @Field(() => Float, { description: 'Longitude of the incident location.' })
  longitude: number;

  @Column({ type: 'text' })
  @Field({
    description:
      'Short description or category of the incident (e.g. theft, assault).',
  })
  description: string;

  @Column({ type: 'text' })
  @Field({
    description: 'Disposition or outcome (e.g. closed, referred, unfounded).',
  })
  disposition: string;

  @Column({ type: 'text', nullable: true })
  @Field(() => String, {
    nullable: true,
    description: 'Full narrative or details of the incident.',
  })
  narrative: string | null;
}

@InputType()
export class CreateCrimeLogInput {
  @Field({ description: 'Institution code (e.g. Clery campus ID).' })
  schoolCode: string;

  @Field({ description: 'Official case or report number.' })
  caseNumber: string;

  @Field(() => GraphQLISODateTime, {
    nullable: true,
    description: 'When the incident was reported (ISO 8601).',
  })
  reportDatetime?: Date | null;

  @Field(() => GraphQLISODateTime, {
    description: 'When the incident occurred (ISO 8601).',
  })
  occurredDatetime: Date;

  @Field({ description: 'Location or address of the incident.' })
  location: string;

  @Field(() => Float, { description: 'Latitude of the incident location.' })
  latitude: number;

  @Field(() => Float, { description: 'Longitude of the incident location.' })
  longitude: number;

  @Field({
    description: 'Short description or category (e.g. theft, assault).',
  })
  description: string;

  @Field({ description: 'Disposition or outcome (e.g. closed, referred).' })
  disposition: string;

  @Field(() => String, {
    nullable: true,
    description: 'Full narrative or details of the incident.',
  })
  narrative?: string | null;
}

@InputType()
export class UpdateCrimeLogInput {
  @Field(() => ID, { description: 'ID of the crime log to update.' })
  id: string;

  @Field(() => String, {
    nullable: true,
    description: 'Institution code (e.g. Clery campus ID).',
  })
  schoolCode?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Official case or report number.',
  })
  caseNumber?: string;

  @Field(() => GraphQLISODateTime, {
    nullable: true,
    description: 'When the incident was reported (ISO 8601).',
  })
  reportDatetime?: Date;

  @Field(() => GraphQLISODateTime, {
    nullable: true,
    description: 'When the incident occurred (ISO 8601).',
  })
  occurredDatetime?: Date;

  @Field(() => String, {
    nullable: true,
    description: 'Location or address of the incident.',
  })
  location?: string;

  @Field(() => Float, {
    nullable: true,
    description: 'Latitude of the incident location.',
  })
  latitude?: number | null;

  @Field(() => Float, {
    nullable: true,
    description: 'Longitude of the incident location.',
  })
  longitude?: number | null;

  @Field(() => String, {
    nullable: true,
    description: 'Short description or category (e.g. theft, assault).',
  })
  description?: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'Disposition or outcome (e.g. closed, referred).',
  })
  disposition?: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'Full narrative or details of the incident.',
  })
  narrative?: string | null;
}
