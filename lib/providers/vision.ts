import { PROVIDERS } from "./index";
import type { ImagePart, ProviderId } from "./types";

/**
 * Returns true if the given provider + model can accept image inputs.
 * Falls back to provider-level supports_vision when the model doesn't
 * specify. Defaults to false.
 */
export function providerSupportsVision(providerId: ProviderId, modelId: string): boolean {
  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) return false;
  const model = provider.models.find((m) => m.id === modelId);
  if (model?.supports_vision !== undefined) return model.supports_vision;
  return provider.supports_vision === true;
}

/** Tighter limits to keep base64 payloads under most provider input caps.
 *  Claude limit ~5 MB per image, OpenAI ~20 MB total, Gemini ~7 MB. */
export const VISION_LIMITS = {
  max_bytes_per_image: 4_500_000, // 4.5 MB raw — base64-encoded becomes ~6 MB
  allowed_mime_types: ["image/png", "image/jpeg", "image/webp", "image/gif"] as const,
};

/**
 * Read a browser File / Blob and convert it into our neutral ImagePart format.
 * Validates MIME type + size. Throws Error with a user-friendly message.
 */
export async function fileToImagePart(file: File | Blob): Promise<ImagePart> {
  const mime = (file as File).type || "image/png";
  if (!VISION_LIMITS.allowed_mime_types.includes(mime as any)) {
    throw new Error(`Unsupported image type "${mime}". Use PNG, JPEG, WebP, or GIF.`);
  }
  if (file.size > VISION_LIMITS.max_bytes_per_image) {
    const mb = (file.size / 1_000_000).toFixed(1);
    throw new Error(`Image is ${mb} MB — keep it under 4.5 MB.`);
  }
  const buf = await file.arrayBuffer();
  const data = btoa(
    new Uint8Array(buf).reduce((acc, byte) => acc + String.fromCharCode(byte), "")
  );
  return { type: "image", media_type: mime as ImagePart["media_type"], data };
}
