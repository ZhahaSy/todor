import { ChatDeepSeek } from "@langchain/deepseek";

import {ChatPromptTemplate} from '@langchain/core/prompts'

const model = new ChatDeepSeek({
  apiKey: "sk-2381ecaadb0f4971becd1e42f7c99ab8",
  model: "deepseek-chat",
  temperature: 0,
});

const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "你是一个非常有用的idea助手，你擅长分析用户输入的待办工作，并对其进行合理的归类。同时，给用户一些案例以及建议",
    ],
    ["human", "{input}"],
  ]);
const chain =  prompt.pipe(model)
export const sendMessage = async (input: string) => {
  const data = await chain.invoke({input});
  return data;
};
