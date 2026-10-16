import { describe, expect, it } from "vitest";
import { buildJudgePrompt, DEFAULT_RUBRIC, parseJudgeResponse } from "./compare-judge";

describe("parseJudgeResponse", () => {
  it("parses plain JSON", () => {
    expect(parseJudgeResponse('{"score": 8, "rationale": "Correct and concise."}')).toEqual({
      score: 8,
      rationale: "Correct and concise.",
    });
  });

  it("finds JSON in a code fence or surrounded by prose, with braces inside strings", () => {
    const text = 'Here is my verdict:\n```json\n{"rationale": "Uses {curly} braces \\"well\\".", "score": 6}\n```\nThanks!';
    expect(parseJudgeResponse(text)).toEqual({
      score: 6,
      rationale: 'Uses {curly} braces "well".',
    });
  });

  it('accepts a score given as a string such as "7" or "7/10"', () => {
    expect(parseJudgeResponse('{"score": "7/10", "rationale": "ok"}').score).toBe(7);
    expect(parseJudgeResponse('{"score": " 9 ", "rationale": "ok"}').score).toBe(9);
  });

  it("rejects scores outside 1-10 or not whole numbers", () => {
    expect(() => parseJudgeResponse('{"score": 11, "rationale": "x"}')).toThrow(/score/);
    expect(() => parseJudgeResponse('{"score": 0, "rationale": "x"}')).toThrow(/score/);
    expect(() => parseJudgeResponse('{"score": 7.5, "rationale": "x"}')).toThrow(/score/);
    expect(() => parseJudgeResponse('{"score": "great", "rationale": "x"}')).toThrow(/score/);
  });

  it("rejects missing fields, missing JSON and malformed JSON", () => {
    expect(() => parseJudgeResponse('{"score": 5}')).toThrow(/rationale/);
    expect(() => parseJudgeResponse('{"score": 5, "rationale": "  "}')).toThrow(/rationale/);
    expect(() => parseJudgeResponse("I would give it an 8.")).toThrow(/did not return/);
    expect(() => parseJudgeResponse('{"score": 5, rationale: nope}')).toThrow(/malformed/);
  });
});

describe("buildJudgePrompt", () => {
  it("fences the prompt and answer and falls back to the default rubric", () => {
    const p = buildJudgePrompt({
      rubric: "  ",
      prompt: "What is 2+2?",
      answer: "4",
    });
    expect(p).toContain(DEFAULT_RUBRIC);
    expect(p).toContain("<prompt>\nWhat is 2+2?\n</prompt>");
    expect(p).toContain("<answer>\n4\n</answer>");
  });
});
