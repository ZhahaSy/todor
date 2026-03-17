import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Skill } from './entities/skill.entity';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

@Injectable()
export class SkillService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillRepo: Repository<Skill>,
  ) {}

  async create(dto: CreateSkillDto, creatorId: string): Promise<Skill> {
    const skill = this.skillRepo.create({
      ...dto,
      triggerKeywords: dto.triggerKeywords ?? '[]',
      type: dto.type ?? 'webhook',
      executionType: dto.executionType ?? 'single',
      inputSchema: dto.inputSchema ?? '{}',
      enabled: dto.enabled ?? true,
      creatorId,
    });
    return this.skillRepo.save(skill);
  }

  findAll(creatorId: string): Promise<Skill[]> {
    return this.skillRepo.find({ where: { creatorId } });
  }

  findEnabled(creatorId: string): Promise<Skill[]> {
    return this.skillRepo.find({ where: { creatorId, enabled: true } });
  }

  async findOne(id: string, creatorId: string): Promise<Skill> {
    const skill = await this.skillRepo.findOne({ where: { id } });
    if (!skill) throw new NotFoundException(`Skill ${id} not found`);
    if (skill.creatorId !== creatorId) throw new ForbiddenException();
    return skill;
  }

  async update(id: string, dto: UpdateSkillDto, creatorId: string): Promise<Skill> {
    const skill = await this.findOne(id, creatorId);
    Object.assign(skill, dto);
    return this.skillRepo.save(skill);
  }

  async remove(id: string, creatorId: string): Promise<void> {
    const skill = await this.findOne(id, creatorId);
    await this.skillRepo.remove(skill);
  }

  async testSkill(id: string, input: Record<string, any>, creatorId: string): Promise<any> {
    const skill = await this.findOne(id, creatorId);
    const config = JSON.parse(skill.config) as {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      timeout?: number;
    };
    const method = (config.method ?? 'POST').toUpperCase();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeout ?? 10000);
    try {
      const res = await fetch(config.url, {
        method,
        headers: { 'Content-Type': 'application/json', ...config.headers },
        body: method !== 'GET' ? JSON.stringify(input) : undefined,
        signal: controller.signal,
      });
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  }
}
