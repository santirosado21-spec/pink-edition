import assert from 'node:assert/strict';
import test from 'node:test';
import { allowedPriceIds, billingOrigin, isPaidCheckout, objectId } from '../app/_lib/billing-policy.ts';
import { sameOrigin } from '../app/_lib/request-security.ts';

test('only explicitly configured Stripe price identifiers are allowed', () => {
  assert.deepEqual(allowedPriceIds('price_ABC, price_ABC, ,price_X9,prod_123,https://evil.test'), ['price_ABC', 'price_X9']);
  assert.deepEqual(allowedPriceIds(''), []);
});
test('payment redirects use a fixed HTTPS origin, with localhost allowed for development', () => {
  assert.equal(billingOrigin('https://cutkind.example/'), 'https://cutkind.example');
  assert.equal(billingOrigin('http://localhost:3000'), 'http://localhost:3000');
  for (const value of ['', 'javascript:alert(1)', 'http://cutkind.example', 'https://user:pass@cutkind.example', 'https://cutkind.example/?next=https://evil.test', 'https://cutkind.example/path']) assert.throws(() => billingOrigin(value));
});
test('returning from Checkout does not mean the payment succeeded', () => {
  assert.equal(isPaidCheckout({ status: 'complete', payment_status: 'unpaid' }), false);
  assert.equal(isPaidCheckout({ status: 'open', payment_status: 'paid' }), false);
  assert.equal(isPaidCheckout({ status: 'complete', payment_status: 'paid' }), true);
  assert.equal(isPaidCheckout({ status: 'complete', payment_status: 'no_payment_required' }), true);
});
test('mutation endpoints reject foreign and missing origins', () => {
  const request = origin => new Request('https://cutkind.example/api/billing/checkout', { method: 'POST', headers: origin ? { origin } : {} });
  assert.equal(sameOrigin(request('https://cutkind.example')), true);
  assert.equal(sameOrigin(request('https://evil.test')), false);
  assert.equal(sameOrigin(request()), false);
});
test('expanded Stripe objects and identifiers resolve to the same account', () => {
  assert.equal(objectId('cus_123'), 'cus_123');
  assert.equal(objectId({ id: 'cus_123' }), 'cus_123');
  assert.equal(objectId(null), null);
});
