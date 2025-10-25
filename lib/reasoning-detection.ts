export function isReasoningModel(modelId: string, modelName: string): boolean {
  const combined = `${modelId} ${modelName}`.toLowerCase()

  // Regex pattern for reasoning model detection
  const reasoningPattern = /r1|o3|o4|qwq|reason(er|ing)|think(ing)?|qwen2\.5-.*thinking|deepseek-r1|qwen-qwq|-r($|-)/i

  return reasoningPattern.test(combined)
}
