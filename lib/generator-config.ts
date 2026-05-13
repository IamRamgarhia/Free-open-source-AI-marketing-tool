import type { Platform } from "./storage";
import type { BrandBrain } from "./brand-brain";

export type FieldKind = "text" | "textarea" | "select" | "number";

export interface InputField {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  rows?: number;
  span?: 1 | 2; // grid columns
  /** When set, the GeneratorShell renders a section heading above this field. Use the
   *  same string on consecutive fields to keep them under one heading. */
  section?: string;
}

export interface GeneratorConfig<I extends Record<string, unknown>> {
  title: string;
  subtitle?: string;
  platform: Platform;
  campaign_type: string;
  fields: InputField[];
  initial: I;
  buildPrompt: (input: I, brain: BrandBrain | null) => string;
  buildTitle: (input: I) => string;
  maxTokens?: number;
  temperature?: number;
  expectJson?: boolean;
  renderJson?: (json: any) => React.ReactNode;
  /** Optional renderer that runs against the streaming text BEFORE final JSON parse. */
  renderStreaming?: (text: string) => React.ReactNode;
}
