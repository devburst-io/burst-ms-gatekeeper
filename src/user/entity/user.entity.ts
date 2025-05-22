import { Role, UserInterface } from "@devburst-io/burst-lib-commons";
import { ApiResponseProperty } from "@nestjs/swagger";
import { hash } from "bcrypt";
import { Exclude, Transform } from "class-transformer";
import { IsEmail, Min } from "class-validator";
import { Organization } from "src/organization/entities/organization.entity";
import { BeforeInsert, BeforeUpdate, Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

@Entity({
  name: "user",
})
@Unique(['email'])
export class User implements UserInterface {
  @ApiResponseProperty({
    type: String,
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  @IsEmail()
  @ApiResponseProperty({
    type: String,
    example: 'foo.bar@example.com',
  })
  // https://github.com/typeorm/typeorm/issues/2567
  email!: string | null;

  @Column()
  @Exclude({ toPlainOnly: true })
  @Min(8)
  password!: string;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: Role, default: Role.Common })
  role: Role;

  @ApiResponseProperty({
    type: Date,
    example: '2023-01-01T00:00:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiResponseProperty({
    type: Date,
    example: '2023-01-01T00:00:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiResponseProperty({
    type: Date,
    example: '2023-01-01T00:00:00Z',
  })
  @DeleteDateColumn()
  deletedAt: Date;

  @ApiResponseProperty({
    type: [Organization]
  })
  organizations: Partial<Organization>[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    this.password = await hash(this.password, 10);
  }
}
