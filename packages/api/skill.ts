import request from "@client/request";

export interface SkillItem {
  id: string;
  name: string;
  displayName: string;
  description: string;
  triggerKeywords: string; // JSON string[]
  type: 'webhook' | 'flow';
  executionType: 'single' | 'flow';
  config: string; // JSON: { url, method?, headers?, timeout? }
  inputSchema: string; // JSON Schema
  enabled: boolean;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSkillPayload {
  name: string;
  displayName: string;
  description: string;
  triggerKeywords?: string;
  type?: 'webhook' | 'flow';
  executionType?: 'single' | 'flow';
  config: string;
  inputSchema?: string;
  enabled?: boolean;
}

export type UpdateSkillPayload = Partial<CreateSkillPayload>;

export const getSkillList = async (): Promise<SkillItem[]> => {
  const data = await request.get<SkillItem[]>("/skill");
  return data as unknown as SkillItem[];
};

export const createSkill = async (payload: CreateSkillPayload): Promise<SkillItem> => {
  const data = await request.post<unknown, SkillItem>("/skill", payload);
  return data;
};

export const updateSkill = async (id: string, payload: UpdateSkillPayload): Promise<SkillItem> => {
  const data = await request.patch<unknown, SkillItem>(`/skill/${id}`, payload);
  return data;
};

export const deleteSkill = async (id: string): Promise<void> => {
  await request.delete(`/skill/${id}`);
};

export const testSkill = async (id: string, input: Record<string, unknown>): Promise<unknown> => {
  const data = await request.post(`/skill/${id}/test`, input);
  return data;
};
