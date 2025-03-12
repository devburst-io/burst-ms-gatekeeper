import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './entity/session.entity';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>
  ) { }

  findById(id: Session['id']): Promise<Session> {
    return this.sessionRepository.findOne({
      where: {
        id: id
      }
    });
  }

  async create(
    data: Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
  ): Promise<Session> {
    const sessionEntity = this.sessionRepository.create(data);
    return await this.sessionRepository.save(sessionEntity);
  }

  async update(id: Session['id'], data: Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'user'>): Promise<Session> {
    await this.sessionRepository.update(id, data)
    return await this.findById(id);
  }

  async delete(id: Session['id']): Promise<void> {
    await this.sessionRepository.delete(id);
  }
}
