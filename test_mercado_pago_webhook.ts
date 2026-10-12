import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { isValidMercadoPagoSignature } from './src/lib/mercadoPagoWebhook';

const secret = 'local-test-webhook-secret';
const requestId = 'request-123';
const dataId = 'payment-456';
const timestamp = '1781009491';
const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
const digest = createHmac('sha256', secret).update(manifest).digest('hex');
const signature = `ts=${timestamp},v1=${digest}`;

assert.equal(isValidMercadoPagoSignature({ secret, signature, requestId, dataId }), true);
assert.equal(isValidMercadoPagoSignature({ secret, signature, requestId: 'another-request', dataId }), false);
assert.equal(isValidMercadoPagoSignature({ secret, signature, requestId, dataId: 'another-payment' }), false);
assert.equal(isValidMercadoPagoSignature({ secret: 'wrong-secret', signature, requestId, dataId }), false);
assert.equal(isValidMercadoPagoSignature({ secret, signature: `ts=${timestamp},v1=${digest}zz`, requestId, dataId }), false);
assert.equal(isValidMercadoPagoSignature({ secret, signature: `ts=${timestamp},v1=${digest.slice(0, 62)}`, requestId, dataId }), false);
assert.equal(isValidMercadoPagoSignature({ secret, signature: `ts=not-a-time,v1=${digest}`, requestId, dataId }), false);
assert.equal(isValidMercadoPagoSignature({ secret, signature, requestId: null, dataId }), false);

console.log('Mercado Pago webhook signature: PASS (valid digest accepted; altered, missing, and malformed inputs rejected).');
