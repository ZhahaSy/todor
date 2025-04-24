import { ChatDeepSeek } from "@langchain/deepseek";

const model = new ChatDeepSeek({
  apiKey: "sk-2381ecaadb0f4971becd1e42f7c99ab8",
  model: "deepseek-chat",
  temperature: 0,
});
export const sendMessage = async (inputValue: string) => {
  const data = await model.invoke(inputValue);
  return data;
};
