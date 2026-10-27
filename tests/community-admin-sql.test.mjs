// Run against an isolated PostgreSQL WASM database, never the linked project:
// COSMORA_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js \
// node --test tests/community-admin-sql.test.mjs
// PGlite 0.5.12 is the version used to verify this migration.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const { PGlite } = await import(process.env.COSMORA_PGLITE_MODULE
  ? pathToFileURL(process.env.COSMORA_PGLITE_MODULE).href : '@electric-sql/pglite');
const migration = readFileSync(new URL('../supabase/migrations/20261027150204_community_admin_dashboard.sql', import.meta.url), 'utf8');

test('private dashboard SQL executes with least privilege and correct read-only projections', async (t) => {
  const db = new PGlite();
  try {
    // Minimal column-compatible fixtures, verified against the live schema only
    // (no real user records or tokens are used by this test).
    await db.exec(`
      create role anon; create role authenticated; create role service_role; create role unrelated;
      create schema auth;
      create table auth.users (id uuid primary key, email text, created_at timestamptz,
        last_sign_in_at timestamptz, email_confirmed_at timestamptz,
        raw_app_meta_data jsonb, is_anonymous boolean default false, deleted_at timestamptz);
      create table public.profiles (id uuid primary key, display_name text, country text);
      create table public.user_moderation (user_id uuid primary key, suspended boolean);
      create table public.community_posts (id integer);
      create table public.listings (id integer);
      create table public.squads (id integer);
      create table public.meetups (id integer);
      create table public.reports (status text);
      create table public.push_devices (platform text, token text);
      insert into public.community_posts values (1),(2);
      insert into public.listings values (1);
      insert into public.squads values (1),(2),(3);
      insert into public.reports values ('OPEN'),('REVIEWING'),('RESOLVED');
      insert into public.push_devices values ('ios','never-return-token-a'),('android','never-return-token-b');
      insert into auth.users (id,email,created_at,last_sign_in_at,email_confirmed_at,raw_app_meta_data)
        select ('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
          'fixture' || n || '@example.test', now() - interval '40 days',
          case when n=1 then now() else null end, now(), '{"providers":["email"]}'::jsonb
        from generate_series(1,30) n;
      insert into auth.users (id,email,created_at,last_sign_in_at,email_confirmed_at,raw_app_meta_data) values
        ('00000000-0000-4000-8000-000000000031','literal%_@example.test',now(),now(),now(),'{"providers":["email","email","apple",1,null]}'),
        ('00000000-0000-4000-8000-000000000032','without-profile@example.test',(((now() at time zone 'Europe/Rome')::date - 6)::timestamp at time zone 'Europe/Rome'),null,null,'{}'),
        ('00000000-0000-4000-8000-000000000033','review@example.test',(((now() at time zone 'Europe/Rome')::date - 29)::timestamp at time zone 'Europe/Rome'),null,null,'{"providers":["email"]}'),
        ('00000000-0000-4000-8000-000000000034','deleting@example.test',(((now() at time zone 'Europe/Rome')::date - 29)::timestamp at time zone 'Europe/Rome') - interval '1 second',null,null,'{"providers":"bad-shape","deletion_pending":true}');
      insert into auth.users (id,email,created_at,is_anonymous,deleted_at) values
        ('00000000-0000-4000-8000-000000000035','anonymous@example.test',now(),true,null),
        ('00000000-0000-4000-8000-000000000036','deleted@example.test',now(),false,now());
      insert into public.profiles values
        ('00000000-0000-4000-8000-000000000031','Literal %_ Name','IT'),
        ('00000000-0000-4000-8000-000000000033','Review Fixture','IT');
      insert into public.user_moderation values ('00000000-0000-4000-8000-000000000031',true);
    `);
    await db.exec(migration);
    const read = async (search = '', page = 1) => (await db.query(
      'select public.cosmora_admin_dashboard($1::text,$2::integer) as data', [search, page]
    )).rows[0].data;

    await t.test('anonymous, authenticated and arbitrary PUBLIC members cannot execute the RPC', async () => {
      for (const role of ['anon', 'authenticated', 'unrelated']) {
        await db.exec('set role ' + role);
        try { await assert.rejects(read(), /permission denied for function cosmora_admin_dashboard/); }
        finally { await db.exec('reset role'); }
      }
      const { rows } = await db.query(`select prosecdef,proconfig from pg_proc
        where oid='public.cosmora_admin_dashboard(text,integer)'::regprocedure`);
      assert.equal(rows[0].prosecdef, true);
      assert.ok(rows[0].proconfig.includes('search_path=""'));
    });

    await db.exec('set role service_role');
    await t.test('service role reads aggregate totals and a complete 30-day Rome chart', async () => {
      const data = await read();
      assert.equal(data.timezone, 'Europe/Rome');
      assert.ok(Number.isFinite(Date.parse(data.generatedAt)));
      assert.deepEqual(data.summary, {
        totalUsers: 34, confirmedUsers: 31, newUsers7d: 2, newUsers30d: 3, signIns30d: 2,
        posts: 2, listings: 1, squads: 3, meetups: 0, openReports: 2,
        pushDevices: 2, pushIOS: 1, pushAndroid: 1,
      });
      assert.equal(data.registrations.length, 30);
      assert.equal(data.registrations.reduce((sum, day) => sum + day.count, 0), 3);
      assert.equal(data.registrations[0].count, 1);
      assert.equal(data.registrations[29].count, 1);
      assert.ok(data.registrations.every((day) => /^\d{4}-\d{2}-\d{2}$/.test(day.date)));
      assert.equal(data.users.total, 34);
      assert.equal(data.users.pageSize, 25);
      assert.equal(data.users.items.length, 25);
      assert.doesNotMatch(JSON.stringify(data), /never-return-token|raw_app_meta_data|secret_hash/);
    });

    await t.test('pagination is stable, bounded, disjoint and returns empty arrays past the end', async () => {
      const first = await read();
      const second = await read('', 2);
      assert.equal(second.users.items.length, 9);
      assert.equal(new Set([...first.users.items, ...second.users.items].map((u) => u.id)).size, 34);
      assert.deepEqual((await read('', 10000)).users.items, []);
    });

    await t.test('search treats percent and underscore literally; filtering never changes global totals', async () => {
      const result = await read('%_');
      assert.equal(result.users.total, 1);
      assert.equal(result.summary.totalUsers, 34);
      assert.deepEqual(result.users.items[0].providers, ['apple', 'email']);
      assert.equal(result.users.items[0].suspended, true);
      assert.equal(result.users.items[0].country, 'IT');
      assert.equal((await read('REVIEW FIXTURE')).users.total, 1);
      assert.equal((await read('000000000031')).users.total, 1);
      assert.equal((await read("' OR 1=1 --")).users.total, 0);
    });

    await t.test('accounts without profiles, test accounts and deletion flags are represented safely', async () => {
      const noProfile = (await read('without-profile')).users.items[0];
      assert.equal(noProfile.displayName, null);
      assert.deepEqual(noProfile.providers, []);
      assert.equal(noProfile.lastSignInAt, null);
      const deleting = (await read('deleting')).users.items[0];
      assert.equal(deleting.deletionPending, true);
      assert.deepEqual(deleting.providers, []);
      assert.equal((await read('review')).users.total, 1);
      assert.equal((await read('anonymous')).users.total, 0);
      assert.equal((await read('deleted')).users.total, 0);
      assert.deepEqual(Object.keys(deleting).sort(), ['id','email','displayName','country','createdAt','lastSignInAt','emailConfirmed','suspended','deletionPending','providers'].sort());
    });

    await t.test('RPC independently rejects invalid bounds', async () => {
      for (const page of [0, -1, 10001, null]) await assert.rejects(read('', page), /Invalid dashboard query/);
      await assert.rejects(read('x'.repeat(101)), /Invalid dashboard query/);
    });
    await db.exec('reset role');
    assert.equal((await db.query('select count(*)::integer as count from auth.users')).rows[0].count, 36);
  } finally {
    await db.close();
  }
});
