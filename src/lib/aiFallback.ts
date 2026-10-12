export type AiEndpoint = 'analysis' | 'academy';

function toHttpStatus(value: unknown): number | null {
  if (typeof value !== 'number' && !(typeof value === 'string' && /^\d{3}$/.test(value.trim()))) return null;
  const status = Number(value);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : null;
}

export function getGeminiStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
    code?: unknown;
    response?: { status?: unknown };
    error?: { status?: unknown; statusCode?: unknown; code?: unknown };
    message?: unknown;
  };

  for (const value of [
    candidate.status,
    candidate.statusCode,
    candidate.response?.status,
    candidate.error?.status,
    candidate.error?.statusCode,
    candidate.error?.code,
    candidate.code
  ]) {
    const status = toHttpStatus(value);
    if (status) return status;
  }

  // Google GenAI may expose the HTTP code only inside an ApiError JSON message.
  if (typeof candidate.message === 'string') {
    const match = candidate.message.match(/(?:"(?:code|status)"\s*:\s*"?)(\d{3})(?:"?\s*[,}])/i)
      ?? candidate.message.match(/\b(?:HTTP|status|code)\s*[:=]?\s*(\d{3})\b/i);
    if (match) return toHttpStatus(match[1]);
  }

  return null;
}

export function getGeminiFailureResponse(error: unknown, endpoint: AiEndpoint) {
  const upstreamStatus = getGeminiStatus(error);
  const unavailable = { statusCode: 503, message: 'O Treinador IA está temporariamente indisponível porque os créditos de IA do serviço acabaram. Tente novamente mais tarde.' };
  const rateLimited = { statusCode: 503, message: 'O Treinador IA atingiu o limite temporário de uso. Tente novamente mais tarde.' };

  if (upstreamStatus === 402) return { ...unavailable, upstreamStatus };
  if (upstreamStatus === 429) return { ...rateLimited, upstreamStatus };
  if (endpoint === 'analysis') {
    return {
      statusCode: upstreamStatus === 503 ? 503 : 500,
      message: upstreamStatus === 503
        ? 'O treinador IA está muito requisitado no momento. Por favor, tente novamente em alguns instantes.'
        : 'Falha ao gerar análise da partida. Tente novamente mais tarde.',
      upstreamStatus
    };
  }
  return {
    statusCode: 503,
    message: 'O treinador IA está ocupado ou indisponível. Tente novamente em instantes.',
    upstreamStatus
  };
}

export function parseChatTranslations(rawValue: unknown): Record<'en' | 'pt' | 'es', string> | null {
  try {
    let rawText = String(rawValue || '').trim();
    if (rawText.startsWith('```json')) rawText = rawText.substring(7);
    if (rawText.startsWith('```')) rawText = rawText.substring(3);
    if (rawText.endsWith('```')) rawText = rawText.substring(0, rawText.length - 3);
    const parsed: unknown = JSON.parse(rawText.trim());
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

    const translations = parsed as Record<string, unknown>;
    const languages = ['en', 'pt', 'es'] as const;
    if (!languages.every((language) => typeof translations[language] === 'string')) return null;
    return Object.fromEntries(languages.map((language) => [language, (translations[language] as string).slice(0, 2000)])) as Record<'en' | 'pt' | 'es', string>;
  } catch {
    return null;
  }
}
