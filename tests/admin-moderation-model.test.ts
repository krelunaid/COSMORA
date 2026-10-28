import test from 'node:test';
import assert from 'node:assert/strict';
import {
  approvalReason,
  availableActions,
  canSubmitDecision,
  decisionReason,
  parseModerationHistory,
  parseModerationQueue,
} from '../admin-web/moderation-model.ts';
import type { ModerationItem } from '../lib/moderation.ts';
const item: ModerationItem = {
  targetType: 'POST',
  targetId: '11111111-1111-4111-8111-111111111111',
  status: 'PENDING_REVIEW',
  title: 'A community post',
  body: 'The body',
  media: [],
  reports: [],
};
test('ordinary approval records a meaningful reason without user typing', () => {
  const reason = decisionReason('APPROVE', '', '');
  assert.equal(reason, approvalReason);
  assert.equal(canSubmitDecision(item, 'APPROVE', reason, true), true);
});
test('approval is blocked when any media is unavailable or has not loaded', () => {
  assert.equal(
    canSubmitDecision(
      { ...item, mediaUnavailable: true },
      'APPROVE',
      approvalReason,
      true,
    ),
    false,
  );
  assert.equal(
    canSubmitDecision(item, 'APPROVE', approvalReason, false),
    false,
  );
});
test('a refusal requires an explicit supported reason or valid custom explanation', () => {
  assert.equal(decisionReason('REJECT', '', ''), '');
  assert.equal(
    decisionReason('REJECT', 'forged', 'A long forged explanation'),
    '',
  );
  assert.equal(
    canSubmitDecision(
      item,
      'REJECT',
      decisionReason('REJECT', 'other', '  no  '),
      true,
    ),
    false,
  );
  assert.equal(
    decisionReason('REJECT', 'other', '  Motivo specifico verificato  '),
    'Motivo specifico verificato',
  );
  assert.equal(
    canSubmitDecision(item, 'REJECT', 'x'.repeat(2001), true),
    false,
  );
});
test('a reported draft or sold item offers report actions, never impossible publication decisions', () => {
  const report = {
    id: '22222222-2222-4222-8222-222222222222',
    reason: 'SPAM',
    details: null,
    created_at: '2026-10-28T09:00:00Z',
  };
  for (const status of ['DRAFT', 'draft', 'SOLD', 'sold', 'MISSING']) {
    assert.deepEqual(availableActions({ ...item, status, reports: [report] }), [
      'DISMISS',
      'RESOLVE',
    ]);
  }
});
test('user handling uses account actions rather than content publication', () => {
  assert.deepEqual(
    availableActions({ ...item, targetType: 'USER', status: 'ACTIVE' }),
    ['SUSPEND'],
  );
  assert.deepEqual(
    availableActions({ ...item, targetType: 'USER', status: 'SUSPENDED' }),
    ['RESTORE'],
  );
  assert.equal(
    canSubmitDecision(
      { ...item, targetType: 'USER', status: 'ACTIVE' },
      'APPROVE',
      approvalReason,
      true,
    ),
    false,
  );
});
test('queue validation rejects unsafe media and malformed contextual reports', () => {
  const valid = { items: [item], more: false };
  assert.deepEqual(parseModerationQueue(valid), valid);
  assert.throws(() =>
    parseModerationQueue({
      ...valid,
      items: [
        { ...item, media: [{ type: 'IMAGE', url: 'javascript:alert(1)' }] },
      ],
    }),
  );
  assert.throws(() =>
    parseModerationQueue({
      ...valid,
      items: [{ ...item, reports: [{ id: 'not-uuid' }] }],
    }),
  );
  assert.throws(() => parseModerationQueue({ ...valid, more: 'false' }));
});
test('history validates audit entries before exposing the log', () => {
  const entry = {
    id: item.targetId,
    target_id: item.targetId,
    target_type: 'POST',
    action: 'APPROVE',
    reason: approvalReason,
    created_at: '2026-10-28T09:00:00Z',
    previous_state: { status: 'PENDING_REVIEW' },
    next_state: { status: 'PUBLISHED' },
  };
  assert.deepEqual(parseModerationHistory({ history: [entry] }), [entry]);
  assert.throws(() =>
    parseModerationHistory({ history: [{ ...entry, action: 'DESTROY' }] }),
  );
  assert.throws(() =>
    parseModerationHistory({
      history: [{ ...entry, next_state: 'published' }],
    }),
  );
});
