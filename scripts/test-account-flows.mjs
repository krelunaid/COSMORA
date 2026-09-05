import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const base = process.env.TEST_APP_URL || 'http://localhost:3000';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const created = [];
const uploaded = [];
const communityUploaded = [];
const testOrders = [];
async function request(path, token, method = 'GET', body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
}
try {
  assert.equal((await request('/api/messages')).status, 401);
  const users = [];
  for (let i = 0; i < 3; i++) {
    const email = `cosmora-test-${crypto.randomUUID()}@example.com`;
    const password = crypto.randomUUID() + 'aA!9';
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    created.push(data.user.id);
    const client = createClient(
      url,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } },
    );
    const signed = await client.auth.signInWithPassword({ email, password });
    if (signed.error) throw signed.error;
    users.push({
      id: data.user.id,
      token: signed.data.session.access_token,
      email,
    });
    assert.equal(
      (
        await request('/api/account', users[i].token, 'PUT', {
          displayName: `Temporary test ${i}`,
          country: 'Italy',
        })
      ).status,
      200,
    );
  }
  const [a, b, c] = users;
  const seller = {
    displayName: 'Temporary seller',
    country: 'IT',
    sellerType: 'private',
    email: a.email,
    phone: '0000000000',
  };
  assert.equal(
    (await request('/api/seller/profile', a.token, 'POST', seller)).status,
    200,
  );
  assert.equal(
    (await request('/api/seller/profile', a.token)).body.profile.country_code,
    'IT',
  );
  assert.equal(
    (await request('/api/seller/profile', b.token)).body.profile,
    null,
  );
  assert.equal(
    (await request('/api/account', a.token)).body.displayName,
    'Temporary seller',
  );
  const message = {
    id: crypto.randomUUID(),
    recipientId: b.id,
    body: 'Account integration test',
  };
  assert.equal(
    (await request('/api/messages', a.token, 'POST', message)).status,
    201,
  );
  assert.equal(
    (await request('/api/messages', a.token, 'POST', message)).status,
    200,
  );
  assert.equal(
    (await request(`/api/messages?peer=${a.id}`, b.token)).body.messages.length,
    1,
  );
  assert.equal(
    (await request(`/api/messages?peer=${a.id}`, c.token)).body.messages.length,
    0,
  );
  assert.equal((await request('/api/orders', a.token)).body.orders.length, 0);
  const form = new FormData();
  for (const [key, value] of Object.entries({
    title: 'Temporary integration listing',
    description: 'Temporary test listing to verify storage.',
    category: 'Cosplay',
    condition: 'New',
    saleMode: 'buy',
    salePrice: '10',
  }))
    form.set(key, value);
  form.append(
    'photos',
    new Blob(
      [
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF8cAAAAASUVORK5CYII=',
          'base64',
        ),
      ],
      { type: 'image/png' },
    ),
    'test.png',
  );
  const listingResponse = await fetch(`${base}/api/listings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${a.token}` },
    body: form,
  });
  const listingBody = await listingResponse.json();
  assert.equal(listingResponse.status, 201);
  const imageRows = await admin
    .from('listing_images')
    .select('storage_path')
    .eq('listing_id', listingBody.listing.id);
  uploaded.push(...imageRows.data.map((row) => row.storage_path));
  const catalog = await request(
    `/api/listings?slug=${listingBody.listing.slug}`,
  );
  assert.equal(catalog.body.listings[0].seller_id, a.id);
  assert.equal(catalog.body.listings[0].images.length, 1);
  const savedItem = { listingId: listingBody.listing.id, kind: 'cart' };
  assert.equal((await request('/api/saved-items?kind=cart')).status, 401);
  assert.equal(
    (await request('/api/saved-items', b.token, 'POST', savedItem)).status,
    200,
  );
  assert.equal(
    (await request('/api/saved-items', b.token, 'POST', savedItem)).status,
    200,
  );
  assert.equal(
    (await request('/api/saved-items?kind=cart', b.token)).body.items.length,
    1,
  );
  assert.equal(
    (await request('/api/saved-items?kind=cart', c.token)).body.items.length,
    0,
  );
  assert.equal(
    (await request('/api/saved-items', a.token, 'POST', savedItem)).status,
    409,
  );
  assert.equal(
    (
      await request('/api/saved-items', b.token, 'POST', {
        ...savedItem,
        kind: 'favorite',
      })
    ).status,
    200,
  );
  assert.equal(
    (await request('/api/saved-items', b.token, 'DELETE', savedItem)).status,
    200,
  );
  assert.equal(
    (await request('/api/saved-items?kind=cart', b.token)).body.items.length,
    0,
  );
  assert.equal(
    (await request('/api/saved-items?kind=favorite', b.token)).body.items
      .length,
    1,
  );
  assert.equal(
    (await request('/api/stripe/checkout', null, 'POST', {})).status,
    401,
  );
  assert.equal(
    (
      await request('/api/stripe/checkout', b.token, 'POST', {
        listingId: listingBody.listing.id,
        checkoutKey: crypto.randomUUID(),
        amount: 1,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request('/api/stripe/checkout', a.token, 'POST', {
        listingId: listingBody.listing.id,
        checkoutKey: crypto.randomUUID(),
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request('/api/stripe/checkout', b.token, 'POST', {
        listingId: listingBody.listing.id,
        checkoutKey: crypto.randomUUID(),
      })
    ).status,
    409,
  );
  const orderId = crypto.randomUUID();
  const fixture = await admin
    .from('marketplace_orders')
    .insert({
      id: orderId,
      buyer_id: b.id,
      seller_id: a.id,
      listing_id: listingBody.listing.id,
      item_title: 'Temporary webhook test',
      transaction_kind: 'sale',
      amount_cents: 1000,
      fee_rate_bps: 1000,
      platform_fee_cents: 100,
      seller_net_cents: 900,
      is_test: true,
      stripe_account_id: 'acct_cosmora_fixture',
      stripe_checkout_session_id: 'cs_test_' + orderId,
      status: 'pending',
    });
  if (fixture.error) throw fixture.error;
  testOrders.push(orderId);
  assert.equal((await request('/api/orders/' + orderId, c.token)).status, 404);
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  async function webhook(
    paid,
    overrides = {},
    account = 'acct_cosmora_fixture',
    type = 'checkout.session.completed',
  ) {
    const payload = JSON.stringify({
      id: 'evt_' + crypto.randomUUID(),
      object: 'event',
      livemode: false,
      type,
      account,
      data: {
        object: {
          id: 'cs_test_' + orderId,
          object: 'checkout.session',
          livemode: false,
          metadata: { cosmora_order_id: orderId },
          payment_status: paid ? 'paid' : 'unpaid',
          status: type === 'checkout.session.expired' ? 'expired' : 'complete',
          amount_total: 1000,
          currency: 'eur',
          payment_intent: 'pi_test_' + orderId,
          ...overrides,
        },
      },
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    });
    return fetch(base + '/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': signature,
        'Content-Type': 'application/json',
      },
      body: payload,
    });
  }
  assert.equal(
    (await request('/api/stripe/webhook', null, 'POST', {})).status,
    400,
  );
  assert.equal((await webhook(false)).status, 200);
  assert.equal(
    (
      await admin
        .from('marketplace_orders')
        .select('status')
        .eq('id', orderId)
        .single()
    ).data.status,
    'pending',
  );
  assert.equal((await webhook(true, { amount_total: 1 })).status, 503);
  assert.equal((await webhook(true, {}, 'acct_wrong')).status, 503);
  assert.equal((await webhook(true)).status, 200);
  assert.equal((await webhook(true)).status, 200);
  assert.equal(
    (
      await webhook(
        false,
        {},
        'acct_cosmora_fixture',
        'checkout.session.expired',
      )
    ).status,
    200,
  );
  assert.equal(
    (await request('/api/orders/' + orderId, b.token)).body.order.status,
    'paid',
  );
  assert.equal(
    (await request('/api/listings?slug=' + listingBody.listing.slug)).body
      .listings.length,
    1,
  );
  console.log(
    'PASS: saved cart/favorites isolation, checkout validation, signed test webhook payment/account/amount checks and replay safety. No real charge created.',
  );
  assert.equal(
    (await request('/api/listings?category=Cards&seller=' + a.id)).body.listings
      .length,
    0,
  );
  assert.equal(
    (await request('/api/listings?category=Cosplay&seller=' + a.id)).body
      .listings.length,
    1,
  );
  assert.equal(
    (await request('/api/profiles?id=' + a.id)).body.profiles[0].display_name,
    'Temporary seller',
  );
  const crewCreated = await request('/api/squads', a.token, 'POST', {
    name: 'Temporary test crew',
    description: 'An integration test crew in a public venue.',
    type: 'COSPLAY_SQUAD',
    city: 'Lucca',
    startsAt: new Date(Date.now() + 86400000).toISOString(),
    location: 'Ingresso principale della fiera',
    maxMembers: 2,
    approval: true,
    rules: 'Respect everyone and the public venue.',
    fandom: 'Cosplay',
  });
  assert.equal(crewCreated.status, 201);
  const crewId = crewCreated.body.squad.id;
  assert.equal(
    (
      await request('/api/squads', b.token, 'PATCH', {
        id: crewId,
        action: 'join',
      })
    ).body.status,
    'PENDING',
  );
  assert.equal(
    (
      await request('/api/squads', c.token, 'PATCH', {
        id: crewId,
        action: 'approve',
        memberId: b.id,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request('/api/squads', a.token, 'PATCH', {
        id: crewId,
        action: 'approve',
        memberId: b.id,
      })
    ).body.status,
    'ACTIVE',
  );
  assert.equal(
    (
      await request('/api/squads', c.token, 'PATCH', {
        id: crewId,
        action: 'join',
      })
    ).body.status,
    'PENDING',
  );
  assert.equal(
    (
      await request('/api/squads', a.token, 'PATCH', {
        id: crewId,
        action: 'approve',
        memberId: c.id,
      })
    ).status,
    409,
  );
  assert.equal(
    (await request('/api/squads?id=' + crewId)).body.squads[0].memberCount,
    2,
  );
  assert.equal(
    (
      await request('/api/squads', b.token, 'PATCH', {
        id: crewId,
        action: 'leave',
      })
    ).body.status,
    'LEFT',
  );
  const postForm = new FormData();
  postForm.set('caption', 'Temporary test post with a real uploaded image.');
  postForm.set('category', 'Cosplay');
  postForm.append(
    'media',
    new Blob(
      [
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF8cAAAAASUVORK5CYII=',
          'base64',
        ),
      ],
      { type: 'image/png' },
    ),
    'test.png',
  );
  const postResponse = await fetch(base + '/api/community/posts', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + a.token },
    body: postForm,
  });
  const postBody = await postResponse.json();
  assert.equal(postResponse.status, 201);
  const postMedia = await admin
    .from('post_media')
    .select('storage_path')
    .eq('post_id', postBody.post.id);
  communityUploaded.push(...postMedia.data.map((row) => row.storage_path));
  const feed = await request(
    '/api/community/posts?q=Temporary%20test%20post',
    b.token,
  );
  assert.ok(
    feed.body.posts.some(
      (p) => p.id === postBody.post.id && p.media.length === 1,
    ),
  );
  assert.equal(
    (
      await request('/api/reports', b.token, 'POST', {
        targetType: 'POST',
        targetId: postBody.post.id,
        reason: 'OTHER',
        details: 'Temporary integration test.',
      })
    ).status,
    201,
  );
  const owned = await request('/api/seller/listings', a.token);
  assert.equal(owned.status, 200);
  const editable = owned.body.listings.find(
    (item) => item.id === listingBody.listing.id,
  );
  assert.ok(editable);
  assert.equal(
    (await request('/api/seller/listings', b.token)).body.listings.length,
    0,
  );
  assert.equal((await request('/api/seller/listings')).status, 401);
  const changes = {
    id: editable.id,
    updatedAt: editable.updated_at,
    title: 'Updated test listing',
    description: editable.description,
    status: 'paused',
    salePriceCents: 1200,
    rentalPriceCents: null,
  };
  assert.equal(
    (await request('/api/seller/listings', b.token, 'PATCH', changes)).status,
    404,
  );
  const saved = await request(
    '/api/seller/listings',
    a.token,
    'PATCH',
    changes,
  );
  assert.equal(saved.status, 200);
  assert.equal(
    (await request(`/api/listings?slug=${editable.slug}`)).body.listings.length,
    0,
  );
  assert.equal(
    (await request('/api/seller/listings', a.token, 'PATCH', changes)).status,
    409,
  );
  assert.equal(
    (
      await request('/api/seller/listings', a.token, 'PATCH', {
        ...changes,
        updatedAt: saved.body.listing.updated_at,
        status: 'active',
      })
    ).status,
    200,
  );
  assert.equal(
    (await request(`/api/listings?slug=${editable.slug}`)).body.listings[0]
      .sale_price_cents,
    1200,
  );
  const block = await admin
    .from('user_blocks')
    .insert({ blocker_id: b.id, blocked_id: a.id });
  if (block.error) throw block.error;
  assert.equal(
    (await request('/api/community/posts?q=Temporary%20test%20post', b.token))
      .body.posts.length,
    0,
  );
  assert.equal(
    (
      await request('/api/messages', a.token, 'POST', {
        ...message,
        id: crypto.randomUUID(),
      })
    ).status,
    403,
  );
  const recoveryRedirect =
    'https://cosmora-app.andreagadducci.chatgpt.site/auth/recovery';
  const link = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: c.email,
    options: { redirectTo: recoveryRedirect },
  });
  if (link.error) throw link.error;
  assert.equal(
    new URL(link.data.properties.action_link).searchParams.get('redirect_to'),
    recoveryRedirect,
  );
  const recovery = createClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const verified = await recovery.auth.verifyOtp({
    token_hash: link.data.properties.hashed_token,
    type: 'recovery',
  });
  if (verified.error) throw verified.error;
  const replacement = crypto.randomUUID() + 'aA!9';
  const changed = await recovery.auth.updateUser({ password: replacement });
  if (changed.error) throw changed.error;
  const relogin = await recovery.auth.signInWithPassword({
    email: c.email,
    password: replacement,
  });
  if (relogin.error) throw relogin.error;
  console.log(
    'PASS: recovery redirect, recovery token and password replacement (no email sent).',
  );
  console.log(
    'PASS: account, messages, isolation, orders, listing ownership/edit/pause/reactivation/conflict, blocked sender.',
  );
} finally {
  if (testOrders.length) {
    const result = await admin
      .from('marketplace_orders')
      .delete()
      .in('id', testOrders);
    if (result.error) throw result.error;
  }
  if (communityUploaded.length)
    await admin.storage.from('community-media').remove(communityUploaded);
  if (uploaded.length) {
    const result = await admin.storage.from('listing-images').remove(uploaded);
    if (result.error) throw result.error;
  }
  for (const id of created) {
    const result = await admin.auth.admin.deleteUser(id);
    if (result.error) throw result.error;
  }
  console.log('Temporary test accounts removed.');
}
