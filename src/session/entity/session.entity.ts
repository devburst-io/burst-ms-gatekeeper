import { User } from "src/user/entity/user.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { SessionInterface } from "../interface/session.interface";

@Entity({
  name: "session",
})
export class Session implements SessionInterface {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, {
    eager: true,
  })
  @Index()
  user: User;

  @Column()
  hash: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  ipLocation: string;

  @Column({ type: 'jsonb', nullable: true })
  device: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

}
