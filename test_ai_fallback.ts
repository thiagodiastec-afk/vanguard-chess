import assert from 'node:assert/strict';
import { getGeminiFailureResponse, getGeminiStatus, parseChatTranslations } from './src/lib/aiFallback';

const credits = getGeminiFailureResponse({ status: 402 }, 'analysis');
assert.equal(credits.statusCode, 503);
assert.match(credits.message, /créditos de IA.*acabaram/);
assert.equal(credits.upstreamStatus, 402);

const sdkCreditsError = new Error('ApiError: {"error":{"code":402,"message":"Your prepayment credits are depleted.","status":"RESOURCE_EXHAUSTED"}}');
const sdkCredits = getGeminiFailureResponse(sdkCreditsError, 'analysis');
assert.equal(sdkCredits.statusCode, 503);
assert.match(sdkCredits.message, /créditos de IA.*acabaram/);
assert.equal(sdkCredits.upstreamStatus, 402, 'Google GenAI ApiError JSON message should preserve the provider HTTP code');

const quota = getGeminiFailureResponse({ code: '429' }, 'academy');
assert.equal(quota.statusCode, 503);
assert.match(quota.message, /limite temporário/);
assert.equal(quota.upstreamStatus, 429);

assert.equal(getGeminiFailureResponse({ status: 503 }, 'analysis').statusCode, 503);
assert.match(getGeminiFailureResponse({ status: 503 }, 'analysis').message, /muito requisitado/);
assert.equal(getGeminiStatus({ error: { code: '429' } }), 429);
assert.equal(getGeminiFailureResponse(new Error('provider detail'), 'analysis').statusCode, 500);
assert.equal(getGeminiFailureResponse(new Error('provider detail'), 'academy').statusCode, 503);
assert.equal(getGeminiStatus(new Error('no status')), null);

assert.deepEqual(parseChatTranslations('{"en":"Hello","pt":"Olá","es":"Hola"}'), {
  en: 'Hello', pt: 'Olá', es: 'Hola'
});
assert.deepEqual(parseChatTranslations('```json\n{"en":"Hello","pt":"Olá","es":"Hola"}\n```'), {
  en: 'Hello', pt: 'Olá', es: 'Hola'
});
assert.equal(parseChatTranslations('{"en":"Hello","pt":"Olá"}'), null, 'partial translations should preserve original-message fallback');
assert.equal(parseChatTranslations('not json'), null);
assert.equal(parseChatTranslations('["en","pt","es"]'), null);
assert.equal(parseChatTranslations(JSON.stringify({ en: 'x'.repeat(2100), pt: 'Olá', es: 'Hola' }))?.en.length, 2000);

console.log('AI fallback behavior: PASS (billing/quota errors are classified; translation failures can fall back to original text).');
