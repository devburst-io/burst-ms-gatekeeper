import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './entity/session.entity';
import { User } from 'src/user/entity/user.entity';
import { PaginetedResponse } from '@devburst-io/burst-lib-commons';
import DeviceDetector from "node-device-detector";

@Injectable()
export class SessionService implements OnModuleInit {

  private detector: DeviceDetector;
  private geoip = require('geoip-lite');
  private logger = new Logger(SessionService.name);
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>
  ) { }

  async onModuleInit() {
    this.detector = new DeviceDetector({
      clientIndexes: true,
      deviceIndexes: true,
      osIndexes: true,
      deviceAliasCode: false,
      deviceTrusted: false,
      deviceInfo: false,
      maxUserAgentSize: 500,
    });
  }

  findById(id: Session['id']): Promise<Session> {
    return this.sessionRepository.findOne({
      where: {
        id: id
      }
    });
  }

  async findByUserId(userId: User['id'], page: number, pageSize: number): Promise<PaginetedResponse<Session>> {
    const query = this.sessionRepository.createQueryBuilder('session');
    query
      .leftJoinAndSelect('session.user', 'user')
      .where('user.id = :userId', { userId })
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const result = (await query.getRawAndEntities()).entities;

    return new PaginetedResponse<Session>({
      items: result,
      page: page,
      pageSize: pageSize,
      itemCount: await query.getCount()
    });
  }

  async create(
    data: Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'device' | 'ipLocation' | 'ipAddress'>,
    userAgent: string,
    host: string
  ): Promise<Session> {
    const sessionEntity = this.sessionRepository.create(data);

    const result = this.detector.detect(userAgent);
    sessionEntity.device = result;
    sessionEntity.ipAddress = host;

    try {
      const location = this.geoip.lookup(host);
      sessionEntity.ipLocation = `${location.city} - ${location.region}, ${location.country}`;
    } catch (error) {
      this.logger.error(`Error getting location for host ${host}: ${error}`);
    }

    return await this.sessionRepository.save(sessionEntity);
  }

  async update(
    id: Session['id'], 
    data: Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'user' | 'device' | 'ipLocation' | 'ipAddress'>,
    userAgent: string,
    host: string
  ): Promise<Session> {
    const sessionEntity = await this.findById(id);

    await this.sessionRepository.update(id, data)

    const result = this.detector.detect(userAgent);
    sessionEntity.device = result;
    sessionEntity.ipAddress = host;

    try {
      const location = this.geoip.lookup(host);
      sessionEntity.ipLocation = `${location.city} - ${location.region}, ${location.country}`;
    } catch (error) {
      this.logger.error(`Error getting location for host ${host}: ${error}`);
    }

    return await this.findById(id);
  }

  async delete(id: Session['id']): Promise<void> {
    await this.sessionRepository.softDelete(id);
  }
}
