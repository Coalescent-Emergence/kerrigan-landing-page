// Run: node --test assets/js/finder-upgrade.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const U = createRequire(import.meta.url)('./finder-upgrade.js');

const PLANS = { plans: [
  { code: 'solo', name: 'Solo', price_cents: 4900, interval: 'month', trial_days: 14, available: true },
  { code: 'founder', name: 'Founder', price_cents: 29900, interval: 'year', trial_days: 14, available: false },
  { code: 'team', name: 'Team', price_cents: 9950, interval: 'month', trial_days: 0, available: true }
] };

test('only available plans are offered, in API order', () => {
  assert.deepEqual(U.offered(PLANS).map((p) => p.code), ['solo', 'team']);
  assert.deepEqual(U.offered(null), []);
  assert.deepEqual(U.offered({ plans: 'x' }), []);
});

test('wording says the trial when the plans carry trial days', () => {
  assert.equal(U.heading(U.offered(PLANS)), 'Start your 14-day trial');
  assert.equal(U.heading([{ code: 'a', trial_days: 0 }]), 'Upgrade to full Kerrigan');
  assert.equal(U.hasTrial([{ trial_days: 0 }]), false);
  assert.equal(U.planLabel(PLANS.plans[0]), 'Solo - $49 per month - 14-day trial');
  assert.equal(U.planLabel(PLANS.plans[2]), 'Team - $99.50 per month');
});

test('a checkout URL reply redirects; a non-https or missing URL does not', () => {
  assert.deepEqual(U.checkoutOutcome({ status: 200, body: { url: 'https://checkout.stripe.com/c/pay/x' } }), { go: 'https://checkout.stripe.com/c/pay/x' });
  assert.match(U.checkoutOutcome({ status: 200, body: { url: 'javascript:alert(1)' } }).text, /did not return/);
  assert.match(U.checkoutOutcome({ status: 200, body: {} }).text, /did not return/);
});

test('already_subscribed sends them to the app (flat error shape)', () => {
  const o = U.checkoutOutcome({ status: 409, body: { error: 'already_subscribed' } }, 'https://app.example/');
  assert.equal(o.app, 'https://app.example/');
  assert.match(o.text, /already has a Kerrigan subscription/);
  assert.equal(U.checkoutOutcome({ status: 409, body: { error: 'already_subscribed' } }).app, 'https://ui.latentworx.com/');
});

test('founder_full, invalid_tier and checkout_unavailable have plain messages (both error shapes)', () => {
  const f = U.checkoutOutcome({ status: 409, body: { error: 'founder_full' } });
  assert.match(f.text, /Founder plan is full/); assert.equal(f.retry, true);
  const t = U.checkoutOutcome({ status: 400, body: { error: { code: 'invalid_tier' } } });
  assert.match(t.text, /no longer offered/); assert.equal(t.retry, true);
  assert.match(U.checkoutOutcome({ status: 503, body: { error: { code: 'checkout_unavailable' } } }).text, /not available right now/);
});

test('401 and unknown failures read plainly and never carry a link', () => {
  assert.match(U.checkoutOutcome({ status: 401, body: null }).text, /sign-in expired/);
  const o = U.checkoutOutcome({ status: 500, body: { error: 'x' } });
  assert.match(o.text, /Could not start checkout/);
  assert.equal(o.app, undefined);
  assert.match(U.checkoutOutcome(null).text, /Could not start checkout/);
});
