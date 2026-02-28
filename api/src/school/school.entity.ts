import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ObjectType, Field, ID, Int, InputType } from '@nestjs/graphql';

@Entity('schools')
@ObjectType()
export class School {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  @Field(() => ID)
  id: string;

  @Column({ type: 'text', name: 'school_code', nullable: true })
  @Field(() => String, { nullable: true })
  schoolCode: string | null;

  @Column({ type: 'text', name: 'school_name', nullable: true })
  @Field(() => String, { nullable: true })
  schoolName: string | null;

  @Column({ type: 'text', nullable: true })
  @Field(() => String, { nullable: true })
  address: string | null;

  @Column({ type: 'text', nullable: true })
  @Field(() => String, { nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 2, name: 'state_code', nullable: true })
  @Field(() => String, { nullable: true })
  stateCode: string | null;

  @Column({ type: 'integer', name: 'zip_code', nullable: true })
  @Field(() => Int, { nullable: true })
  zipCode: number | null;
}

@InputType()
export class CreateSchoolInput {
  @Field(() => String, { nullable: true })
  schoolCode?: string | null;

  @Field(() => String, { nullable: true })
  schoolName?: string | null;

  @Field(() => String, { nullable: true })
  address?: string | null;

  @Field(() => String, { nullable: true })
  city?: string | null;

  @Field(() => String, { nullable: true })
  stateCode?: string | null;

  @Field(() => Int, { nullable: true })
  zipCode?: number | null;
}

@InputType()
export class UpdateSchoolInput {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  schoolCode?: string | null;

  @Field(() => String, { nullable: true })
  schoolName?: string | null;

  @Field(() => String, { nullable: true })
  address?: string | null;

  @Field(() => String, { nullable: true })
  city?: string | null;

  @Field(() => String, { nullable: true })
  stateCode?: string | null;

  @Field(() => Int, { nullable: true })
  zipCode?: number | null;
}
