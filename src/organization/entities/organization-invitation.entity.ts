import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne } from 'typeorm';
import { Organization } from './organization.entity';
import { OrganizationRole } from '@devburst-io/burst-lib-commons';

@Entity()
export class OrganizationInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  name?: string;

  @Column()
  organizationId: string;

  @ManyToOne(() => Organization)
  organization: Organization;

  @Column()
  token: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: false })
  accepted: boolean;

  @Column({
    type: 'enum',
    enum: OrganizationRole,
    default: OrganizationRole.Member
  })
  role: OrganizationRole;
} 