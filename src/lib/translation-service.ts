/**
 * Translation service using Claude Haiku 4.5.
 * Translates BBCode content while preserving tags and glossary terms.
 */

import Anthropic from '@anthropic-ai/sdk';
import { DO_NOT_TRANSLATE, DO_NOT_TRANSLATE_PATTERNS } from './glossary';
import { getApiKey } from './api-key-store';

export interface TranslationSuccess {
  ok: true;
  bbcode: string;
}

export interface TranslationError {
  ok: false;
  error: string;
  code: 'missing_api_key' | 'api_error' | 'network_error' | 'unknown';
}

export type TranslationResult = TranslationSuccess | TranslationError;

/** Supported target languages */
export const SUPPORTED_LANGUAGES: Record<string, string> = {
  'pt-BR': 'Brazilian Portuguese',
  'es-LATAM': 'Latin American Spanish',
};

/**
 * Build the system prompt for translation, including the Do Not Translate glossary.
 */
export function buildSystemPrompt(targetLang: string): string {
  const langName = SUPPORTED_LANGUAGES[targetLang] || targetLang;
  const glossaryList = DO_NOT_TRANSLATE.map(term => `- ${term}`).join('\n');
  const patternDescriptions = DO_NOT_TRANSLATE_PATTERNS.map(p => `- Pattern: ${p.source}`).join('\n');

  return `You are a professional translator. Translate the following BBCode content into ${langName} (${targetLang}).

CRITICAL RULES:
1. Preserve ALL BBCode tags exactly as they are. Never translate, modify, or remove any BBCode tags (e.g., [h1], [b], [url=...], [list], [*], [code], [img], [table], [tr], [td], etc.).
2. Only translate the human-readable text content between tags.
3. Preserve all @mentions exactly as written (e.g., @cloudkicker76).
4. Preserve all URLs exactly as written.
5. Keep the same BBCode structure and formatting — same tags, same nesting, same line breaks.
6. Do NOT add any explanation, commentary, or markdown formatting. Return ONLY the translated BBCode.

DO NOT TRANSLATE these terms — keep them exactly as written in the original language:
${glossaryList}

DO NOT TRANSLATE text matching these patterns:
${patternDescriptions}

Return only the translated BBCode content, nothing else.`;
}

/**
 * Translate BBCode content to a target language using Claude Haiku 4.5.
 */
export async function translateBBCode(
  bbcode: string,
  targetLang: string
): Promise<TranslationResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      ok: false,
      error: 'No API key configured. Please set your Anthropic API key.',
      code: 'missing_api_key',
    };
  }

  try {
    const client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      system: buildSystemPrompt(targetLang),
      messages: [
        {
          role: 'user',
          content: bbcode,
        },
      ],
    });

    const textBlock = message.content.find(block => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return {
        ok: false,
        error: 'No text content in API response.',
        code: 'api_error',
      };
    }

    return {
      ok: true,
      bbcode: textBlock.text,
    };
  } catch (err: unknown) {
    if (err instanceof Anthropic.APIError) {
      return {
        ok: false,
        error: `API error (${err.status}): ${err.message}`,
        code: 'api_error',
      };
    }

    if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('network'))) {
      return {
        ok: false,
        error: 'Network error — check your internet connection.',
        code: 'network_error',
      };
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      ok: false,
      error: message,
      code: 'unknown',
    };
  }
}

/**
 * Compute a simple hash of a string for stale detection.
 * Not cryptographic — just for change detection.
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash;
}
