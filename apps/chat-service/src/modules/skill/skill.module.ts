import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Skill } from './entities/skill.entity';
import { HubSkillDef } from './entities/hub-skill-def.entity';
import { SkillService } from './skill.service';
import { SkillController } from './skill.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Skill, HubSkillDef])],
  providers: [SkillService],
  controllers: [SkillController],
  exports: [SkillService],
})
export class SkillModule implements OnModuleInit {
  constructor(private readonly skillService: SkillService) {}

  async onModuleInit() {
    await this.skillService.seedHubSkills();
  }
}
