import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guard/jwt.auth';
import { ResOp } from '@/common/model/response.model';
import { SkillService } from './skill.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { ImportOpenApiDto } from './dto/import-openapi.dto';

@ApiTags('Skill')
@UseGuards(JwtAuthGuard)
@Controller('skill')
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  @Get()
  @ApiOperation({ summary: '获取用户所有 skill' })
  async findAll(@Request() req) {
    const skills = await this.skillService.findAll(req.user.userId);
    return ResOp.success(skills);
  }

  @Post()
  @ApiOperation({ summary: '创建 skill' })
  async create(@Body() dto: CreateSkillDto, @Request() req) {
    const skill = await this.skillService.create(dto, req.user.userId);
    return ResOp.success(skill);
  }

  @Get('hub')
  @ApiOperation({ summary: '获取官方技能库列表' })
  async findHubSkills(@Request() req) {
    const items = await this.skillService.findHubSkills(req.user.userId);
    return ResOp.success(items);
  }

  @Post('hub/:hubId/install')
  @ApiOperation({ summary: '安装官方技能' })
  async installHubSkill(@Param('hubId') hubId: string, @Request() req) {
    const skill = await this.skillService.installHubSkill(hubId, req.user.userId);
    return ResOp.success(skill);
  }

  @Delete('hub/:hubId/uninstall')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '卸载官方技能' })
  async uninstallHubSkill(@Param('hubId') hubId: string, @Request() req) {
    await this.skillService.uninstallHubSkill(hubId, req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取 skill 详情' })
  async findOne(@Param('id') id: string, @Request() req) {
    const skill = await this.skillService.findOne(id, req.user.userId);
    return ResOp.success(skill);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新 skill' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSkillDto,
    @Request() req,
  ) {
    const skill = await this.skillService.update(id, dto, req.user.userId);
    return ResOp.success(skill);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除 skill' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.skillService.remove(id, req.user.userId);
  }

  @Post(':id/test')
  @ApiOperation({ summary: '测试调用 skill' })
  async test(
    @Param('id') id: string,
    @Body() input: Record<string, any>,
    @Request() req,
  ) {
    const result = await this.skillService.testSkill(
      id,
      input,
      req.user.userId,
    );
    return ResOp.success(result);
  }

  @Post('import/openapi/preview')
  @ApiOperation({ summary: '预览 OpenAPI 导入结果（不写 DB）' })
  async previewOpenApi(@Body() dto: ImportOpenApiDto, @Request() req) {
    const skills = await this.skillService.previewOpenApi(dto, req.user.userId);
    return ResOp.success(skills);
  }

  @Post('batch')
  @ApiOperation({ summary: '批量创建 Skill' })
  async batchCreate(@Body() dtos: CreateSkillDto[], @Request() req) {
    const result = await this.skillService.batchCreate(dtos, req.user.userId);
    return ResOp.success(result);
  }
}
