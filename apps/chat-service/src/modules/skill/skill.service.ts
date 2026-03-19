import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as yaml from 'js-yaml';
import { Skill } from './entities/skill.entity';
import { HubSkillDef } from './entities/hub-skill-def.entity';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { ImportOpenApiDto } from './dto/import-openapi.dto';
import { HUB_SKILLS } from './hub-skills.seed';

export interface HubSkillListItem {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  tags: string[];
  installedId: string | null;
}

@Injectable()
export class SkillService {
  private readonly logger = new Logger(SkillService.name);

  constructor(
    @InjectRepository(Skill)
    private readonly skillRepo: Repository<Skill>,
    @InjectRepository(HubSkillDef)
    private readonly hubRepo: Repository<HubSkillDef>,
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

  async previewOpenApi(dto: ImportOpenApiDto, _creatorId: string): Promise<CreateSkillDto[]> {
    if (!dto.specUrl && !dto.specContent) {
      throw new BadRequestException('specUrl 或 specContent 必须提供其中之一');
    }

    let rawContent: string;
    if (dto.specUrl) {
      try {
        const res = await fetch(dto.specUrl);
        rawContent = await res.text();
      } catch (err: any) {
        throw new BadRequestException(`拉取 OpenAPI spec 失败: ${err.message}`);
      }
    } else {
      rawContent = dto.specContent!;
    }

    // 解析 JSON 或 YAML
    let spec: Record<string, any>;
    try {
      spec = JSON.parse(rawContent) as Record<string, any>;
    } catch {
      try {
        spec = yaml.load(rawContent) as Record<string, any>;
      } catch (err: any) {
        throw new BadRequestException(`解析 OpenAPI spec 失败: ${err.message}`);
      }
    }

    // 提取 baseUrl
    let baseUrl = '';
    if (spec.servers?.length) {
      // OpenAPI 3.x
      baseUrl = (spec.servers[0] as { url: string }).url ?? '';
    } else if (spec.host) {
      // Swagger 2.0
      const scheme = spec.schemes?.[0] ?? 'https';
      baseUrl = `${scheme}://${spec.host}${spec.basePath ?? ''}`;
    }

    const paths = (spec.paths ?? {}) as Record<string, Record<string, any>>;
    const result: CreateSkillDto[] = [];

    for (const [path, pathItem] of Object.entries(paths)) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
        const operation = pathItem[method] as Record<string, any> | undefined;
        if (!operation) continue;

        // 生成 name
        let name: string;
        if (operation.operationId) {
          // operationId 转 snake_case
          name = (operation.operationId as string)
            .replace(/([A-Z])/g, '_$1')
            .toLowerCase()
            .replace(/^_/, '')
            .replace(/[^a-z0-9_]/g, '_')
            .replace(/_+/g, '_');
        } else {
          // {method}_{sanitized_path}
          const sanitizedPath = path.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
          name = `${method}_${sanitizedPath}`.toLowerCase();
        }
        // 确保以字母开头
        if (!/^[a-z]/.test(name)) name = `op_${name}`;

        const displayName = (operation.summary as string) || name;
        const description = ((operation.description as string) || (operation.summary as string) || name).trim();
        const config = JSON.stringify({ url: baseUrl + path, method: method.toUpperCase() });

        // 构建 inputSchema
        const properties: Record<string, { type: string; description?: string }> = {};
        const required: string[] = [];

        // path 参数 + query 参数
        const parameters = (operation.parameters ?? pathItem.parameters ?? []) as Array<Record<string, any>>;
        for (const param of parameters) {
          const paramIn: string = param.in;
          if (paramIn !== 'path' && paramIn !== 'query') continue;
          const paramName: string = param.name;
          const schema = (param.schema ?? {}) as Record<string, any>;
          const type = (schema.type as string) || 'string';
          if (!['string', 'number', 'boolean'].includes(type)) continue;
          properties[paramName] = {
            type,
            description: (param.description as string) || paramName,
          };
          if (param.required) required.push(paramName);
        }

        // requestBody（仅 JSON，只展开简单类型字段）
        const requestBody = operation.requestBody as Record<string, any> | undefined;
        if (requestBody) {
          const bodySchema =
            requestBody.content?.['application/json']?.schema as Record<string, any> | undefined;
          if (bodySchema?.properties) {
            for (const [fieldName, fieldSchema] of Object.entries(
              bodySchema.properties as Record<string, Record<string, any>>,
            )) {
              const type = (fieldSchema.type as string) || 'string';
              if (!['string', 'number', 'boolean'].includes(type)) continue;
              if (properties[fieldName]) continue; // path/query 优先
              properties[fieldName] = {
                type,
                description: (fieldSchema.description as string) || fieldName,
              };
            }
            if (Array.isArray(bodySchema.required)) {
              for (const r of bodySchema.required as string[]) {
                if (!required.includes(r) && properties[r]) required.push(r);
              }
            }
          }
        }

        const inputSchema =
          Object.keys(properties).length > 0
            ? JSON.stringify({ properties, required: required.length ? required : undefined })
            : '{}';

        result.push({
          name,
          displayName,
          description,
          config,
          inputSchema,
          type: 'webhook',
          executionType: 'single',
          enabled: true,
        });
      }
    }

    return result;
  }

  async batchCreate(
    dtos: CreateSkillDto[],
    creatorId: string,
  ): Promise<{ created: Skill[]; skipped: string[] }> {
    const created: Skill[] = [];
    const skipped: string[] = [];

    for (const dto of dtos) {
      const existing = await this.skillRepo.findOne({
        where: { name: dto.name, creatorId },
      });
      if (existing) {
        skipped.push(dto.name);
        continue;
      }
      try {
        const skill = await this.create(dto, creatorId);
        created.push(skill);
      } catch (err: any) {
        this.logger.warn(`批量创建跳过 ${dto.name}: ${err.message}`);
        skipped.push(dto.name);
      }
    }

    return { created, skipped };
  }

  async findHubSkills(userId: string): Promise<HubSkillListItem[]> {
    const [allDefs, installedSkills] = await Promise.all([
      this.hubRepo.find(),
      this.skillRepo.find({ where: { creatorId: userId, isHubSkill: true } }),
    ]);

    const installedMap = new Map<string, string>();
    for (const skill of installedSkills) {
      if (skill.hubSkillId) installedMap.set(skill.hubSkillId, skill.id);
    }

    return allDefs.map((def) => ({
      id: def.id,
      name: def.name,
      displayName: def.displayName,
      description: def.description,
      category: def.category,
      tags: JSON.parse(def.tags) as string[],
      installedId: installedMap.get(def.id) ?? null,
    }));
  }

  async installHubSkill(hubId: string, userId: string): Promise<Skill> {
    const existing = await this.skillRepo.findOne({
      where: { hubSkillId: hubId, creatorId: userId },
    });
    if (existing) throw new ConflictException('该技能已安装');

    const def = await this.hubRepo.findOne({ where: { id: hubId } });
    if (!def) throw new NotFoundException(`HubSkill ${hubId} not found`);

    const skill = this.skillRepo.create({
      name: def.name,
      displayName: def.displayName,
      description: def.description,
      triggerKeywords: def.triggerKeywords,
      type: 'webhook',
      executionType: 'single',
      config: def.config,
      inputSchema: def.inputSchema,
      enabled: true,
      isHubSkill: true,
      hubSkillId: hubId,
      creatorId: userId,
    });
    return this.skillRepo.save(skill);
  }

  async uninstallHubSkill(hubId: string, userId: string): Promise<void> {
    const skill = await this.skillRepo.findOne({
      where: { hubSkillId: hubId, creatorId: userId },
    });
    if (!skill) throw new NotFoundException('未找到已安装的技能');
    await this.skillRepo.remove(skill);
  }

  async seedHubSkills(): Promise<void> {
    try {
      await this.hubRepo.upsert(HUB_SKILLS, { conflictPaths: ['name'] });
      this.logger.log(`HubSkill 种子数据写入完成，共 ${HUB_SKILLS.length} 条`);
    } catch (err: any) {
      this.logger.error(`HubSkill 种子数据写入失败: ${err.message}`);
    }
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
