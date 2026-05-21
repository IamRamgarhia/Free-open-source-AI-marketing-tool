/**
 * Tests for the Zod-validated LLM output layer. The retry-on-fail behavior is
 * the part that matters most for the "no false results" guarantee, so we
 * cover: clean parse, fenced JSON, wrong shape → retry succeeds, wrong shape
 * → retry also fails, non-JSON → retry succeeds, total non-JSON.
 *
 * We stub `llmCall` by injecting a fake provider via providerOverride so the
 * tests don't need real network or real API keys.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

vi.mock("@/lib/llm", () => ({
  llmCall: vi.fn(),
}));

vi.mock("@/lib/providers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/providers")>("@/lib/providers");
  return {
    ...actual,
    estimateCostUsd: () => 0.0001,
  };
});

import { llmCall } from "@/lib/llm";
import { llmCallStructured, StructuredLlmError, validateLlmJson } from "@/lib/llm-structured";

const mockLlm = vi.mocked(llmCall);

function fakeRes(text: string) {
  return {
    text,
    usage: { input_tokens: 100, output_tokens: 50 },
    providerId: "openai",
    modelId: "gpt-4o-mini",
  } as any;
}

describe("llmCallStructured", () => {
  beforeEach(() => mockLlm.mockReset());

  const Schema = z.object({
    name: z.string(),
    count: z.number(),
  });

  it("parses a clean JSON reply", async () => {
    mockLlm.mockResolvedValueOnce(fakeRes('{"name":"a","count":3}'));
    const r = await llmCallStructured({ schema: Schema, prompt: "hi" });
    expect(r.data).toEqual({ name: "a", count: 3 });
    expect(r.attempts).toBe(1);
    expect(r.recovered).toBe(false);
  });

  it("parses JSON inside a ```json fence", async () => {
    mockLlm.mockResolvedValueOnce(fakeRes('```json\n{"name":"b","count":7}\n```'));
    const r = await llmCallStructured({ schema: Schema, prompt: "hi" });
    expect(r.data).toEqual({ name: "b", count: 7 });
  });

  it("retries when first reply has wrong shape and the second is correct", async () => {
    mockLlm
      .mockResolvedValueOnce(fakeRes('{"name":"a","count":"three"}')) // count wrong type
      .mockResolvedValueOnce(fakeRes('{"name":"a","count":3}'));
    const r = await llmCallStructured({ schema: Schema, prompt: "hi" });
    expect(r.data).toEqual({ name: "a", count: 3 });
    expect(r.attempts).toBe(2);
    expect(r.recovered).toBe(true);
    expect(mockLlm).toHaveBeenCalledTimes(2);
  });

  it("retries when first reply is total prose and the second is JSON", async () => {
    mockLlm
      .mockResolvedValueOnce(fakeRes("I think the answer is name=a count=3"))
      .mockResolvedValueOnce(fakeRes('{"name":"a","count":3}'));
    const r = await llmCallStructured({ schema: Schema, prompt: "hi" });
    expect(r.data).toEqual({ name: "a", count: 3 });
    expect(r.recovered).toBe(true);
  });

  it("throws StructuredLlmError when both attempts have wrong shape", async () => {
    mockLlm
      .mockResolvedValueOnce(fakeRes('{"name":"a"}'))
      .mockResolvedValueOnce(fakeRes('{"count":3}'));
    await expect(
      llmCallStructured({ schema: Schema, prompt: "hi", maxAttempts: 2 })
    ).rejects.toBeInstanceOf(StructuredLlmError);
  });

  it("throws StructuredLlmError when both attempts are non-JSON", async () => {
    mockLlm
      .mockResolvedValueOnce(fakeRes("not json"))
      .mockResolvedValueOnce(fakeRes("still not json"));
    const err = await llmCallStructured({ schema: Schema, prompt: "hi", maxAttempts: 2 }).catch(
      (e) => e
    );
    expect(err).toBeInstanceOf(StructuredLlmError);
    expect(err.attempts).toBe(2);
  });

  it("respects maxAttempts=1 (no retry)", async () => {
    mockLlm.mockResolvedValueOnce(fakeRes("not json"));
    await expect(
      llmCallStructured({ schema: Schema, prompt: "hi", maxAttempts: 1 })
    ).rejects.toBeInstanceOf(StructuredLlmError);
    expect(mockLlm).toHaveBeenCalledTimes(1);
  });
});

describe("validateLlmJson — sync validator for legacy paths", () => {
  const Schema = z.object({ ok: z.boolean() });

  it("returns ok:true for valid input", () => {
    const r = validateLlmJson('{"ok":true}', Schema);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual({ ok: true });
  });

  it("returns ok:false with zod issues for wrong shape", () => {
    const r = validateLlmJson('{"ok":"yes"}', Schema);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues).not.toBeNull();
      expect(r.issues!.length).toBeGreaterThan(0);
    }
  });

  it("returns ok:false with null issues for non-JSON", () => {
    const r = validateLlmJson("hello", Schema);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues).toBeNull();
  });
});
