import { createHmac, timingSafeEqual } from 'node:crypto';

export function isValidMercadoPagoSignature(input: {
  secret?: string;
  signature?: string | null;
  requestId?: string | null;
  dataId?: string;
}): boolean {
  const { secret, signature, requestId, dataId } = input;
  if (!secret || !signature || !requestId || !dataId) return false;

  const parts = Object.fromEntries(signature.split(',').map((part) => {
    const separator = part.indexOf('=');
    return separator < 0 ? ['', ''] : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }));
  const timestamp = parts.ts;
  const digestHex = parts.v1;
  if (!timestamp || !/^\d+$/.test(timestamp) || !digestHex || !/^[a-f\d]{64}$/i.test(digestHex)) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const expected = createHmac('sha256', secret).update(manifest).digest();
  const received = Buffer.from(digestHex, 'hex');
  return timingSafeEqual(received, expected);
}
