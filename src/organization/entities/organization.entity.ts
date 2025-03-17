import { OrganizationInterface } from "@devburst-io/burst-lib-commons";
import { ApiResponseProperty } from "@nestjs/swagger";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { OrganizationMember } from "./organization.member.entity";

@Entity('organization')
export class Organization implements OrganizationInterface {
  @ApiResponseProperty({
    type: String,
  })
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  @ApiResponseProperty({
    type: String,
  })
  name: string

  @Column()
  @ApiResponseProperty({
    type: String,
  })
  description: string

  @Column({ nullable: true })
  @ApiResponseProperty({
    type: String,
  })
  imageId: string;

  @OneToMany(() => OrganizationMember, member => member.organization)
  @ApiResponseProperty({
    type: [OrganizationMember]
  })
  members: OrganizationMember[];

  @ApiResponseProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiResponseProperty()
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiResponseProperty()
  @DeleteDateColumn()
  deletedAt: Date;
}
