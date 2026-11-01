// src/lib/supabase/server.ts
import { createClient } from "@supabase/supabase-js";
var projectUrl = "https://pwdpwgonvnuwmgfiidut.supabase.co";
function getSupabaseAdmin(env) {
  if (env.SUPABASE_URL !== projectUrl || !env.SUPABASE_SERVICE_ROLE_KEY)
    return null;
  return createClient(projectUrl, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, {
        ...init,
        signal: AbortSignal.timeout(15e3)
      })
    }
  });
}
async function requireAuthenticatedUser(request, env, allowDeleting = false) {
  const admin = getSupabaseAdmin(env);
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!admin || !token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user || data.user.app_metadata?.deletion_pending && !allowDeleting) return null;
  if (allowDeleting) return { admin, user: data.user };
  const moderation = await admin.from("user_moderation").select("user_id").eq("user_id", data.user.id).eq("suspended", true).maybeSingle();
  if (moderation.error || moderation.data) return null;
  return { admin, user: data.user };
}

// src/lib/preview-token.ts
var encoder = new TextEncoder();
async function key(secret) {
  return crypto.subtle.importKey("raw", encoder.encode("COSMORA preview v1:" + secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function previewSignature(secret, id, expiry) {
  const bytes2 = new Uint8Array(await crypto.subtle.sign("HMAC", await key(secret), encoder.encode(id + ":" + expiry)));
  return Array.from(bytes2, (b) => b.toString(16).padStart(2, "0")).join("");
}
async function validPreviewToken(secret, id, expiry, signature, now = Date.now()) {
  if (!/^[0-9a-f-]{36}$/.test(id) || !Number.isSafeInteger(expiry) || expiry <= now / 1e3 || expiry > now / 1e3 + 3700 || !/^[0-9a-f]{64}$/.test(signature)) return false;
  const bytes2 = Uint8Array.from(signature.match(/../g), (h) => parseInt(h, 16));
  return crypto.subtle.verify("HMAC", await key(secret), bytes2, encoder.encode(id + ":" + expiry));
}

// src/lib/server/review-fixture-visibility.ts
var reviewFixtureUserIds = [
  "66b0c100-e397-4971-946a-a8e3416b5f5b",
  "89d20859-246f-4619-a363-285655bb8e0f",
  "a082786e-8ef2-42c6-80c5-95b7ca3e997b"
];
var reviewFixtureUsers = new Set(reviewFixtureUserIds);
var excludedUsersFilter = "(" + reviewFixtureUserIds.join(",") + ")";
function canViewReviewFixtures(viewer) {
  return Boolean(viewer && reviewFixtureUsers.has(viewer.user.id));
}
function isHiddenReviewFixture(userId, viewer) {
  return reviewFixtureUsers.has(userId) && !canViewReviewFixtures(viewer);
}
function applyReviewFixtureVisibility(query, authorColumn, viewer) {
  return canViewReviewFixtures(viewer) ? query : query.not(authorColumn, "in", excludedUsersFilter);
}

// src/routes/thumbnail.ts
async function GET(request, env) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id") || "";
  if (!await validPreviewToken(env.SUPABASE_SERVICE_ROLE_KEY, id, Number(params.get("expires")), params.get("signature") || "")) return new Response(null, { status: 404 });
  const admin = getSupabaseAdmin(env);
  if (!admin) return new Response(null, { status: 503 });
  const preview = await admin.rpc("cosmora_read_media_preview", { p_media_id: id }).maybeSingle();
  const row = preview.data;
  if (preview.error || !row || typeof row.author_id !== "string" || isHiddenReviewFixture(row.author_id, null) || typeof row.jpeg_base64 !== "string" || row.jpeg_base64.length > 131072 || !/^[A-Za-z0-9+/]+={0,2}$/.test(row.jpeg_base64)) return new Response(null, { status: 404 });
  const bytes2 = Uint8Array.from(atob(row.jpeg_base64), (c) => c.charCodeAt(0));
  if (bytes2[0] !== 255 || bytes2[1] !== 216 || bytes2[2] !== 255) return new Response(null, { status: 404 });
  return new Response(bytes2, { headers: { "Content-Type": "image/jpeg", "Content-Length": String(bytes2.length), "Cache-Control": "private, no-store" } });
}

// src/lib/server/public-profile-visibility.ts
var hiddenPublicProfileIds = [
  "39ed3f97-f290-41f2-9cb0-c0fb0ad6ac53",
  "5127b626-1077-48ee-a266-de2948e49b66",
  "1606e1bd-1635-4760-a1ac-51561b43accc"
];
var hiddenPublicProfilesFilter = "(" + hiddenPublicProfileIds.join(",") + ")";
function isPublicProfileVisible(id) {
  return !hiddenPublicProfileIds.some((hiddenId) => hiddenId === id);
}

// src/lib/server/community-post-interactions.ts
var communityInteractionTables = {
  like: "community_post_likes",
  save: "community_post_saves"
};
async function readCommunityPostInteractions(admin, viewerId, postIds) {
  if (!viewerId || !postIds.length)
    return {
      likedIds: /* @__PURE__ */ new Set(),
      savedIds: /* @__PURE__ */ new Set(),
      error: null
    };
  const [likes, saves] = await Promise.all([
    admin.from(communityInteractionTables.like).select("post_id").eq("user_id", viewerId).in("post_id", postIds),
    admin.from(communityInteractionTables.save).select("post_id").eq("user_id", viewerId).in("post_id", postIds)
  ]);
  return {
    likedIds: new Set((likes.data ?? []).map((row) => row.post_id)),
    savedIds: new Set((saves.data ?? []).map((row) => row.post_id)),
    error: likes.error || saves.error
  };
}

// src/lib/blocked-content.ts
function blockedAuthorIds(rows, viewerId) {
  return [...new Set(rows.flatMap((row) => {
    const other = row.blocker_id === viewerId ? row.blocked_id : row.blocked_id === viewerId ? row.blocker_id : null;
    return other && other !== viewerId ? [other] : [];
  }))];
}

// src/lib/server/blocked-content.ts
async function getBlockedAuthorIds(admin, viewerId) {
  if (!viewerId) return { ids: [], error: null };
  const ids = /* @__PURE__ */ new Set();
  for (let offset = 0; offset < 1e4; offset += 500) {
    const { data, error } = await admin.from("user_blocks").select("blocker_id,blocked_id").or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`).order("blocker_id").order("blocked_id").range(offset, offset + 499);
    if (error) return { ids: [], error };
    for (const id of blockedAuthorIds(data ?? [], viewerId)) ids.add(id);
    if ((data?.length ?? 0) < 500) return { ids: [...ids], error: null };
  }
  return { ids: [], error: new Error("Blocked content lookup limit reached.") };
}

// src/routes/feed.ts
async function GET2(request, env) {
  const admin = getSupabaseAdmin(env);
  if (!admin)
    return Response.json(
      { error: "Community non disponibile." },
      { status: 503 }
    );
  const params = new URL(request.url).searchParams;
  const offset = Math.max(
    0,
    Math.min(1e4, Number(params.get("offset")) || 0)
  );
  const auth = await requireAuthenticatedUser(request, env);
  const savedOnly = params.get("saved") === "1";
  if ((request.headers.has("authorization") || savedOnly) && !auth)
    return Response.json({ error: "Accedi per continuare." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  let query = admin.from("community_posts").select(
    "id, author_id, caption, country_code, language_code, created_at, link_label, link_url, post_categories(label), post_media(id,storage_path,media_type,sort_order)" + (savedOnly ? ", saved_by:community_post_saves!inner(user_id)" : "")
  ).eq("status", "ACTIVE");
  if (savedOnly && auth) query = query.eq("saved_by.user_id", auth.user.id);
  query = applyReviewFixtureVisibility(query, "author_id", auth);
  if (params.get("q"))
    query = query.ilike(
      "caption",
      "%" + params.get("q").slice(0, 100).replace(/[%_]/g, "") + "%"
    );
  if (auth) {
    const blocks = await getBlockedAuthorIds(admin, auth.user.id);
    if (blocks.error)
      return Response.json(
        { error: "Community non disponibile." },
        { status: 503 }
      );
    if (blocks.ids.length)
      query = query.not("author_id", "in", "(" + blocks.ids.join(",") + ")");
  }
  const { data, error } = await query.order("created_at", { ascending: false }).order("id").range(offset, offset + 19);
  if (error)
    return Response.json(
      { error: "Non \xE8 stato possibile caricare i post." },
      { status: 503 }
    );
  const rows = data ?? [];
  const ids = [...new Set(rows.map((row) => row.author_id))];
  const profiles = ids.length ? await applyReviewFixtureVisibility(
    admin.from("profiles").select("id,display_name").eq("moderation_hidden", false).in("id", ids),
    "id",
    auth
  ) : { data: [], error: null };
  if (profiles.error)
    return Response.json(
      { error: "Non \xE8 stato possibile caricare gli autori dei post." },
      { status: 503 }
    );
  const interactions = await readCommunityPostInteractions(admin, auth?.user.id, rows.map((post) => post.id));
  if (interactions.error)
    return Response.json(
      { error: "Non \xE8 stato possibile caricare i post. Riprova." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } }
    );
  const mediaItems = rows.flatMap((row) => row.post_media.filter((item) => item.media_type === "IMAGE" && item.id));
  const previewRows = mediaItems.length ? await admin.from("community_media_previews").select("media_id,original_path").in("media_id", mediaItems.map((item) => item.id)) : { data: [], error: null };
  const previews = /* @__PURE__ */ new Map();
  if (!previewRows.error) for (const item of mediaItems) {
    if (!previewRows.data?.some((row) => row.media_id === item.id && row.original_path === item.storage_path)) continue;
    const expires = Math.floor(Date.now() / 1e3) + 3600;
    const signature = await previewSignature(env.SUPABASE_SERVICE_ROLE_KEY, item.id, expires);
    previews.set(item.id, env.SUPABASE_URL + "/functions/v1/cosmora-community/api/community/thumbnail?" + new URLSearchParams({ id: item.id, expires: String(expires), signature }));
  }
  const posts = await Promise.all(
    rows.map(async (post) => {
      const authorProfile = profiles.data?.find((p) => p.id === post.author_id);
      const media = post.post_media.sort((a, b) => a.sort_order - b.sort_order);
      const urls = media.length ? await admin.storage.from("community-media").createSignedUrls(
        media.map((item) => item.storage_path),
        3600
      ) : { data: [] };
      return {
        ...post,
        link_label: null,
        link_url: null,
        author: authorProfile?.display_name || "Utente COSMORA",
        author_profile_url: authorProfile && isPublicProfileVisible(authorProfile.id) ? "/profile/" + authorProfile.id : null,
        post_media: void 0,
        saved_by: void 0,
        liked: interactions.likedIds.has(post.id),
        saved: interactions.savedIds.has(post.id),
        media: media.map((item, index) => {
          const thumbnailUrl = previews.get(item.id) || null;
          return { type: item.media_type, url: urls.data?.[index]?.signedUrl || "", thumbnail_url: thumbnailUrl };
        }).filter((item) => item.url)
      };
    })
  );
  return Response.json(
    { posts, hasMore: posts.length === 20, userId: auth?.user.id },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

// src/routes/interaction.ts
import { z } from "zod";
var schema = z.object({
  postId: z.uuid(),
  action: z.enum(["like", "save"]),
  active: z.boolean()
}).strict();
var headers = { "Cache-Control": "private, no-store" };
async function PUT(request, env) {
  const auth = await requireAuthenticatedUser(request, env);
  if (!auth)
    return Response.json(
      { error: "Accedi per continuare." },
      { status: 401, headers }
    );
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success)
    return Response.json(
      { error: "Operazione non valida." },
      { status: 400, headers }
    );
  const { postId, action, active } = input.data;
  const blocks = await getBlockedAuthorIds(auth.admin, auth.user.id);
  if (blocks.error)
    return Response.json(
      { error: "Post non disponibile. Riprova." },
      { status: 503, headers }
    );
  let query = applyReviewFixtureVisibility(
    auth.admin.from("community_posts").select("id,author_id").eq("id", postId).eq("status", "ACTIVE"),
    "author_id",
    auth
  );
  if (blocks.ids.length)
    query = query.not("author_id", "in", "(" + blocks.ids.join(",") + ")");
  const post = await query.maybeSingle();
  if (post.error)
    return Response.json(
      { error: "Post non disponibile. Riprova." },
      { status: 503, headers }
    );
  if (!post.data)
    return Response.json(
      { error: "Post non disponibile." },
      { status: 404, headers }
    );
  const table = communityInteractionTables[action];
  const result = active ? await auth.admin.from(table).upsert(
    { user_id: auth.user.id, post_id: postId },
    { onConflict: "user_id,post_id", ignoreDuplicates: true }
  ) : await auth.admin.from(table).delete().eq("user_id", auth.user.id).eq("post_id", postId);
  if (result.error)
    return Response.json(
      { error: "Operazione non riuscita. Riprova." },
      { status: 503, headers }
    );
  return Response.json({ postId, action, active }, { headers });
}

// src/lib/public-name.ts
function normalizePublicName(value) {
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim();
}
function validPublicName(value) {
  const name = normalizePublicName(value);
  const length = Array.from(name).length;
  return length >= 2 && length <= 80 && !/[\p{Cc}\p{Cf}]/u.test(name);
}
function isPublicNameConflict(error) {
  return error?.code === "23505" && !!error.message?.includes("profiles_public_name_unique");
}
var PUBLIC_NAME_TAKEN = "Nome gi\xE0 in uso. Aggiungi qualcosa o scegli un altro nome.";

// src/lib/server/public-name.ts
async function publicNameAvailable(admin, name, ownerId) {
  const literal = normalizePublicName(name).replace(/[\\%_]/g, "\\$&");
  let query = admin.from("profiles").select("id").ilike("display_name", literal);
  if (ownerId) query = query.neq("id", ownerId);
  const result = await query.limit(1);
  return { available: !result.error && result.data?.length === 0, error: result.error };
}

// src/routes/account.ts
import { z as z2 } from "zod";
var schema2 = z2.object({
  displayName: z2.string().max(160).transform(normalizePublicName).refine(validPublicName),
  country: z2.string().trim().max(80)
});
async function GET3(request, env) {
  const auth = await requireAuthenticatedUser(request, env, true);
  if (!auth) return Response.json({ error: "Accedi per vedere il tuo account." }, { status: 401 });
  const { data, error } = await auth.admin.from("profiles").select("display_name, country").eq("id", auth.user.id).maybeSingle();
  if (error) return Response.json({ error: "Profilo non disponibile. Riprova." }, { status: 503 });
  const moderation = await auth.admin.from("user_moderation").select("suspended").eq("user_id", auth.user.id).maybeSingle();
  if (moderation.error) return Response.json({ error: "Stato account non disponibile. Riprova." }, { status: 503 });
  return Response.json({ email: auth.user.email, displayName: data?.display_name ?? "", country: data?.country ?? "", suspended: moderation.data?.suspended === true, deletionPending: auth.user.app_metadata?.deletion_pending === true }, { headers: { "Cache-Control": "private, no-store" } });
}
async function PUT2(request, env) {
  const auth = await requireAuthenticatedUser(request, env);
  if (!auth) return Response.json({ error: "Accedi per modificare il profilo." }, { status: 401 });
  const parsed = schema2.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Inserisci un nome da 2 a 80 caratteri e un paese valido." }, { status: 400 });
  const name = await publicNameAvailable(auth.admin, parsed.data.displayName, auth.user.id);
  if (name.error) return Response.json({ error: "Salvataggio non riuscito. Riprova." }, { status: 503 });
  if (!name.available) return Response.json({ error: PUBLIC_NAME_TAKEN, code: "PUBLIC_NAME_TAKEN" }, { status: 409 });
  const { error } = await auth.admin.from("profiles").upsert({ id: auth.user.id, display_name: parsed.data.displayName, country: parsed.data.country, updated_at: (/* @__PURE__ */ new Date()).toISOString() });
  if (isPublicNameConflict(error)) return Response.json({ error: PUBLIC_NAME_TAKEN, code: "PUBLIC_NAME_TAKEN" }, { status: 409 });
  if (error) return Response.json({ error: "Salvataggio non riuscito. Riprova." }, { status: 503 });
  return Response.json({ saved: true, displayName: parsed.data.displayName });
}

// src/routes/name-availability.ts
async function GET4(request, env) {
  const headers2 = { "Cache-Control": "private, no-store" };
  const name = new URL(request.url).searchParams.get("name") || "";
  if (name.length > 160 || !validPublicName(name)) return Response.json({ error: "Nome non valido." }, { status: 400, headers: headers2 });
  const admin = getSupabaseAdmin(env);
  if (!admin) return Response.json({ error: "Servizio non disponibile." }, { status: 503, headers: headers2 });
  const result = await publicNameAvailable(admin, name);
  if (result.error) return Response.json({ error: "Servizio non disponibile." }, { status: 503, headers: headers2 });
  return Response.json({ available: result.available }, { headers: headers2 });
}

// src/routes/seller-profile.ts
import { z as z3 } from "zod";
var countries = [
  "IT",
  "FR",
  "DE",
  "ES",
  "BE",
  "NL",
  "AT",
  "PT",
  "IE",
  "GB",
  "PL",
  "SE",
  "DK",
  "FI",
  "GR",
  "CZ",
  "RO",
  "HU",
  "CH"
];
var text = z3.string().trim().max(2e3).default("");
var schema3 = z3.object({
  displayName: z3.string().trim().min(2).max(100),
  updatePublicName: z3.boolean().default(false),
  sellerType: z3.enum(["private", "shop"]),
  businessType: z3.enum(["individual", "company"]).default("individual"),
  country: z3.enum(countries),
  legalName: text,
  vatNumber: text,
  registrationNumber: text,
  registeredAddress: text,
  legalRepresentative: text,
  phone: text,
  email: z3.email(),
  description: text,
  billingAddress: text,
  shippingPolicy: text,
  returnsPolicy: text
});
async function GET5(request, env) {
  const a = await requireAuthenticatedUser(request, env);
  if (!a)
    return Response.json(
      { error: "Accedi per continuare." },
      { status: 401 }
    );
  const { data, error } = await a.admin.from("seller_details").select("seller_type,country_code,details").eq("user_id", a.user.id).maybeSingle();
  if (error)
    return Response.json(
      { error: "Profilo non disponibile." },
      { status: 503 }
    );
  const publicProfile = await a.admin.from("profiles").select("display_name").eq("id", a.user.id).maybeSingle();
  if (publicProfile.error) return Response.json({ error: "Profilo non disponibile." }, { status: 503 });
  const accountDisplayName = publicProfile.data?.display_name || registeredAccountName(a.user.user_metadata);
  return Response.json(
    { profile: data, accountDisplayName },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
async function POST(request, env) {
  const a = await requireAuthenticatedUser(request, env);
  if (!a)
    return Response.json(
      { error: "Accedi prima di creare il profilo venditore." },
      { status: 401 }
    );
  const p = schema3.safeParse(await request.json().catch(() => null));
  if (!p.success)
    return Response.json(
      { error: "Controlla nome, paese e indirizzo email." },
      { status: 400 }
    );
  const d = p.data;
  const publicProfile = await a.admin.from("profiles").select("display_name").eq("id", a.user.id).maybeSingle();
  if (publicProfile.error) return Response.json({ error: "Profilo non disponibile." }, { status: 503 });
  const registeredDisplayName = publicProfile.data?.display_name || registeredAccountName(a.user.user_metadata);
  if (d.sellerType === "private" && registeredDisplayName.length < 2)
    return Response.json(
      { error: "Completa prima il nome del tuo account COSMORA." },
      { status: 400 }
    );
  const publicDisplayName = normalizePublicName(d.sellerType === "shop" && d.updatePublicName ? d.displayName : publicProfile.data?.display_name || (d.sellerType === "shop" ? d.legalName : registeredDisplayName));
  if (!validPublicName(publicDisplayName)) return Response.json({ error: "Inserisci un nome pubblico valido da 2 a 80 caratteri." }, { status: 400 });
  if (d.sellerType === "shop" && [
    d.legalName,
    d.vatNumber,
    d.registeredAddress,
    d.legalRepresentative,
    d.shippingPolicy,
    d.returnsPolicy
  ].some((v) => !v))
    return Response.json(
      { error: "Completa i dati aziendali e le condizioni di vendita." },
      { status: 400 }
    );
  const availability = await publicNameAvailable(a.admin, publicDisplayName, a.user.id);
  if (availability.error) return Response.json({ error: "Profilo non disponibile." }, { status: 503 });
  if (!availability.available) return Response.json({ error: PUBLIC_NAME_TAKEN, code: "PUBLIC_NAME_TAKEN" }, { status: 409 });
  if (d.sellerType === "shop" && d.updatePublicName) {
    const { error } = await a.admin.rpc("cosmora_save_shop_public_name", {
      p_user_id: a.user.id,
      p_public_name: publicDisplayName,
      p_country: d.country,
      p_details: { ...d, displayName: publicDisplayName }
    });
    if (isPublicNameConflict(error)) return Response.json({ error: PUBLIC_NAME_TAKEN, code: "PUBLIC_NAME_TAKEN" }, { status: 409 });
    if (error) return Response.json({ error: "Impossibile salvare i dati venditore." }, { status: 503 });
    return Response.json({ ok: true, displayName: publicDisplayName });
  }
  const details = await a.admin.from("seller_details").upsert({
    user_id: a.user.id,
    seller_type: d.sellerType,
    country_code: d.country,
    details: { ...d, displayName: publicDisplayName },
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (details.error)
    return Response.json(
      { error: "Impossibile salvare i dati venditore." },
      { status: 503 }
    );
  const saved = await a.admin.from("profiles").upsert({
    id: a.user.id,
    display_name: publicDisplayName,
    role: d.sellerType === "shop" ? "pro_shop" : "seller",
    country: d.country,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (isPublicNameConflict(saved.error)) return Response.json({ error: PUBLIC_NAME_TAKEN, code: "PUBLIC_NAME_TAKEN" }, { status: 409 });
  if (saved.error)
    return Response.json(
      {
        error: "Dati salvati, ma il profilo pubblico non \xE8 stato aggiornato. Riprova."
      },
      { status: 503 }
    );
  return Response.json({ ok: true, displayName: publicDisplayName });
}
function registeredAccountName(metadata) {
  for (const key2 of ["display_name", "full_name", "name"]) {
    const value = metadata?.[key2];
    if (typeof value === "string" && value.trim().length >= 2)
      return value.trim();
  }
  return "";
}

// src/routes/create-post.ts
import { z as z4 } from "zod";

// src/lib/community-moderation.ts
var suspiciousSale = /(whatsapp|telegram).*(bonifico|bank transfer|paypal friends)|pagami fuori|pay me directly/i;
var suspiciousLink = /(bit\.ly|tinyurl\.com|t\.me\/|wa\.me\/)/i;
var offensive = /\b(fuck|nazi|odio razziale)\b/i;
function moderateText(title, description) {
  const text2 = `${title} ${description}`.trim();
  const reasons = [];
  if (title.trim().length < 4) reasons.push("Title is too short.");
  if (description.trim().length < 12) reasons.push("Description needs more useful detail.");
  if (suspiciousSale.test(text2)) reasons.push("Possible off-marketplace transaction.");
  if (suspiciousLink.test(text2)) reasons.push("Suspicious external link.");
  if (offensive.test(text2)) reasons.push("Potentially offensive content.");
  return { status: reasons.length ? "PENDING_REVIEW" : "ACTIVE", reasons };
}

// src/lib/community-media.ts
var MAX_COMMUNITY_MEDIA_FILES = 8;
var MAX_COMMUNITY_MEDIA_BYTES = 25 * 1024 * 1024;
var IMAGE_TYPES = /* @__PURE__ */ new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence"
]);
var VIDEO_TYPES = /* @__PURE__ */ new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v"
]);
var EXT_TO_TYPE = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/x-m4v"
};
var COMMUNITY_MEDIA_LIMIT_ERROR = "Inserisci fino a 8 foto o video supportati (massimo 25 MB ciascuno).";
function fileExtension(name) {
  return name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
}
function communityMediaStorageExtension(file) {
  const fromName = fileExtension(file.name);
  if (fromName) return fromName;
  if (file.type.startsWith("video/")) return "mp4";
  if (file.type.includes("png")) return "png";
  if (file.type.includes("webp")) return "webp";
  if (file.type.includes("heif")) return "heif";
  if (file.type.includes("heic")) return "heic";
  return "jpg";
}
function isVideoMedia(file) {
  if (file.type.toLowerCase().startsWith("video/")) return true;
  return ["mp4", "webm", "mov", "m4v"].includes(fileExtension(file.name));
}
function sniffCommunityMediaType(header) {
  if (header.length >= 3 && header[0] === 255 && header[1] === 216) {
    return "image/jpeg";
  }
  if (header.length >= 8 && header[0] === 137 && header[1] === 80 && header[2] === 78 && header[3] === 71) {
    return "image/png";
  }
  if (header.length >= 12 && header[0] === 82 && header[1] === 73 && header[2] === 70 && header[3] === 70 && header[8] === 87 && header[9] === 69 && header[10] === 66 && header[11] === 80) {
    return "image/webp";
  }
  if (header.length >= 12 && header[4] === 102 && header[5] === 116 && header[6] === 121 && header[7] === 112) {
    const brand = String.fromCharCode(
      header[8],
      header[9],
      header[10],
      header[11]
    ).toLowerCase();
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heif"].includes(
      brand.trim()
    )) {
      return "image/heic";
    }
    if (brand.startsWith("qt")) return "video/quicktime";
    return "video/mp4";
  }
  return "";
}
function inferCommunityMediaType(file, sniff = "") {
  const declared = file.type.toLowerCase();
  if (IMAGE_TYPES.has(declared) || VIDEO_TYPES.has(declared)) return declared;
  if (sniff && (IMAGE_TYPES.has(sniff) || VIDEO_TYPES.has(sniff))) return sniff;
  return EXT_TO_TYPE[fileExtension(file.name)] ?? "";
}
function isAllowedCommunityMediaType(type) {
  const normalized = type.toLowerCase();
  return IMAGE_TYPES.has(normalized) || VIDEO_TYPES.has(normalized);
}

// src/lib/photo-privacy.ts
var encoder2 = new TextEncoder();
var ascii = (data, from = 0, length = data.length - from) => String.fromCharCode(...data.subarray(from, from + length));
var bytes = (text2) => encoder2.encode(text2);
var PhotoPrivacyError = class extends Error {
};
var fail = () => {
  throw new PhotoPrivacyError("La foto non \xE8 valida. Esportala di nuovo come JPEG, PNG o WebP e riprova.");
};
var MAX_PHOTO_STRUCTURE_UNITS = 4096;
var MAX_SANITIZED_PHOTO_BATCH_BYTES = 32 * 1024 * 1024;
var budgetForRequest = () => ({ remaining: MAX_PHOTO_STRUCTURE_UNITS });
function spendStructureUnit(budget) {
  if (budget.remaining-- <= 0) {
    throw new PhotoPrivacyError("Le foto hanno una struttura troppo complessa. Esportale di nuovo o caricane meno alla volta.");
  }
}
var view = (data) => new DataView(data.buffer, data.byteOffset, data.byteLength);
var concat = (parts) => {
  const result = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
};
function orientationOf(input) {
  const data = ascii(input, 0, 6) === "Exif\0\0" ? input.subarray(6) : input;
  if (data.length < 8) fail();
  const endian = ascii(data, 0, 2);
  if (endian !== "II" && endian !== "MM") fail();
  const little = endian === "II";
  const v = view(data);
  if (v.getUint16(2, little) !== 42) fail();
  const start = v.getUint32(4, little);
  if (start < 8 || start + 2 > data.length) fail();
  const count = v.getUint16(start, little);
  if (start + 2 + count * 12 + 4 > data.length) fail();
  let orientation;
  for (let i = 0; i < count; i++) {
    const p = start + 2 + i * 12;
    if (v.getUint16(p, little) !== 274) continue;
    if (v.getUint16(p + 2, little) !== 3 || v.getUint32(p + 4, little) !== 1) fail();
    const next = v.getUint16(p + 8, little);
    if (next < 1 || next > 8 || orientation !== void 0 && orientation !== next) fail();
    orientation = next;
  }
  return orientation;
}
function mergeOrientation(current, data) {
  const next = orientationOf(data);
  if (current !== void 0 && next !== void 0 && current !== next) fail();
  return next ?? current;
}
function orientationTiff(orientation) {
  const data = new Uint8Array(26);
  const v = view(data);
  data.set(bytes("II"));
  v.setUint16(2, 42, true);
  v.setUint32(4, 8, true);
  v.setUint16(8, 1, true);
  v.setUint16(10, 274, true);
  v.setUint16(12, 3, true);
  v.setUint32(14, 1, true);
  v.setUint16(18, orientation, true);
  return data;
}
function jpeg(data, budget) {
  if (data[0] !== 255 || data[1] !== 216) fail();
  const kept = [];
  let p = 2, orientation, sawFrame = false, sawScan = false;
  while (p < data.length) {
    spendStructureUnit(budget);
    const start = p;
    if (data[p++] !== 255) fail();
    while (data[p] === 255) p++;
    if (p >= data.length) fail();
    const marker = data[p++];
    if (marker === 217) {
      if (p !== data.length || !sawFrame || !sawScan) fail();
      const parts = [data.subarray(0, 2)];
      if (orientation !== void 0) {
        const payload2 = concat([bytes("Exif\0\0"), orientationTiff(orientation)]);
        const header = new Uint8Array([255, 225, 0, 0]);
        view(header).setUint16(2, payload2.length + 2);
        parts.push(header, payload2);
      }
      return concat([...parts, ...kept, data.subarray(start, p)]);
    }
    if (marker === 0 || marker === 216 || marker >= 208 && marker <= 215) fail();
    if (marker === 1) {
      kept.push(data.subarray(start, p));
      continue;
    }
    if (p + 2 > data.length) fail();
    const length = view(data).getUint16(p);
    if (length < 2 || p + length > data.length) fail();
    const payload = data.subarray(p + 2, p + length);
    p += length;
    if (marker >= 192 && marker <= 207 && ![196, 200, 204].includes(marker)) sawFrame = true;
    if (marker === 225 && ascii(payload, 0, 6) === "Exif\0\0") {
      orientation = mergeOrientation(orientation, payload);
    } else if (marker === 224 && ascii(payload, 0, 5) === "JFIF\0") {
      if (payload.length < 14 || payload.length !== 14 + 3 * payload[12] * payload[13]) fail();
      const jfif = payload.slice(0, 14);
      jfif[12] = 0;
      jfif[13] = 0;
      kept.push(new Uint8Array([255, 224, 0, 16]), jfif);
    } else if (marker === 226 && ascii(payload, 0, 12) === "ICC_PROFILE\0") {
      if (payload.length < 14 || payload[12] < 1 || payload[13] < payload[12]) fail();
      kept.push(data.subarray(start, p));
    } else if (marker === 238 && ascii(payload, 0, 5) === "Adobe") {
      if (payload.length !== 12) fail();
      kept.push(data.subarray(start, p));
    } else if (!(marker >= 224 && marker <= 239) && marker !== 254) {
      kept.push(data.subarray(start, p));
    }
    if (marker === 218) {
      if (!sawFrame) fail();
      sawScan = true;
      const scanStart = p;
      while (p < data.length) {
        if (data[p] !== 255) {
          p++;
          continue;
        }
        const markerStart = p;
        while (data[p] === 255) p++;
        if (p >= data.length) fail();
        if (data[p] === 0 || data[p] >= 208 && data[p] <= 215) {
          p++;
          continue;
        }
        p = markerStart;
        break;
      }
      kept.push(data.subarray(scanStart, p));
    }
  }
  return fail();
}
var crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = crc >>> 1 ^ (crc & 1 ? 3988292384 : 0);
  return crc >>> 0;
});
function crc32(data) {
  let crc = 4294967295;
  for (const value of data) crc = crc >>> 8 ^ crcTable[(crc ^ value) & 255];
  return (crc ^ 4294967295) >>> 0;
}
function pngChunk(type, payload) {
  const chunk = new Uint8Array(12 + payload.length);
  const v = view(chunk);
  v.setUint32(0, payload.length);
  chunk.set(bytes(type), 4);
  chunk.set(payload, 8);
  v.setUint32(chunk.length - 4, crc32(chunk.subarray(4, chunk.length - 4)));
  return chunk;
}
var pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
var pngPreserved = /* @__PURE__ */ new Set(["IHDR", "PLTE", "IDAT", "IEND", "cHRM", "gAMA", "iCCP", "sRGB", "sBIT", "pHYs", "tRNS", "bKGD", "acTL", "fcTL", "fdAT", "cICP", "mDCv", "cLLi"]);
function png(data, budget) {
  if (!pngSignature.every((value, i) => data[i] === value)) fail();
  const kept = [];
  let p = 8, orientation, sawData = false;
  while (p < data.length) {
    spendStructureUnit(budget);
    if (p + 12 > data.length) fail();
    const length = view(data).getUint32(p), end = p + 12 + length;
    if (end > data.length) fail();
    const type = ascii(data, p + 4, 4);
    if (!/^[A-Za-z]{4}$/.test(type) || type[2] !== type[2].toUpperCase()) fail();
    if (crc32(data.subarray(p + 4, end - 4)) !== view(data).getUint32(end - 4)) fail();
    if (p === 8 && (type !== "IHDR" || length !== 13) || p !== 8 && type === "IHDR") fail();
    if (type === "IHDR" && (!view(data).getUint32(p + 8) || !view(data).getUint32(p + 12))) fail();
    if (type === "IDAT") sawData = true;
    if (type === "eXIf") orientation = mergeOrientation(orientation, data.subarray(p + 8, end - 4));
    else if (pngPreserved.has(type)) kept.push(data.subarray(p, end));
    else if (type[0] === type[0].toUpperCase()) fail();
    p = end;
    if (type === "IEND") {
      if (length !== 0 || p !== data.length || !sawData) fail();
      return concat([pngSignature, kept[0], ...orientation === void 0 ? [] : [pngChunk("eXIf", orientationTiff(orientation))], ...kept.slice(1)]);
    }
  }
  return fail();
}
function riffChunk(type, payload) {
  const result = new Uint8Array(8 + payload.length + payload.length % 2);
  result.set(bytes(type));
  view(result).setUint32(4, payload.length, true);
  result.set(payload, 8);
  return result;
}
function riffChunks(data, start, budget) {
  const chunks = [];
  let p = start;
  while (p < data.length) {
    spendStructureUnit(budget);
    if (p + 8 > data.length) fail();
    const length = view(data).getUint32(p + 4, true), end = p + 8 + length;
    if (end + length % 2 > data.length || length % 2 && data[end] !== 0) fail();
    chunks.push({ type: ascii(data, p, 4), payload: data.subarray(p + 8, end) });
    p = end + length % 2;
  }
  return chunks;
}
function webp(data, budget) {
  if (data.length < 20 || ascii(data, 0, 4) !== "RIFF" || ascii(data, 8, 4) !== "WEBP" || view(data).getUint32(4, true) !== data.length - 8) fail();
  const chunks = riffChunks(data, 12, budget), kept = [];
  let orientation, extended, sawPixels = false;
  for (const [index, { type, payload }] of chunks.entries()) {
    if (type === "EXIF") orientation = mergeOrientation(orientation, payload);
    else if (type === "VP8X") {
      if (extended || index !== 0 || payload.length !== 10 || payload[0] & 193 || payload[1] || payload[2] || payload[3]) fail();
      extended = payload.slice();
      kept.push(riffChunk(type, extended));
    } else if (type === "ANMF") {
      if (!extended || payload.length < 24) fail();
      const frames = riffChunks(payload, 16, budget), frameParts = [];
      let framePixels = 0;
      for (const frame of frames) {
        if (frame.type === "VP8 " || frame.type === "VP8L") framePixels++;
        if (["ALPH", "VP8 ", "VP8L"].includes(frame.type)) frameParts.push(riffChunk(frame.type, frame.payload));
      }
      if (framePixels !== 1) fail();
      kept.push(riffChunk(type, concat([payload.subarray(0, 16), ...frameParts])));
      sawPixels = true;
    } else if (["ICCP", "ANIM", "ALPH", "VP8 ", "VP8L"].includes(type)) {
      if (["ICCP", "ANIM", "ALPH"].includes(type) && !extended) fail();
      if (type === "VP8 " || type === "VP8L") {
        if (!payload.length) fail();
        sawPixels = true;
      }
      if (type === "ANIM" && payload.length !== 6) fail();
      kept.push(riffChunk(type, payload));
    }
  }
  if (!sawPixels || orientation !== void 0 && !extended) fail();
  if (extended) {
    extended[0] = extended[0] & ~12 | (orientation === void 0 ? 0 : 8);
    kept[0] = riffChunk("VP8X", extended);
  }
  if (orientation !== void 0) kept.push(riffChunk("EXIF", orientationTiff(orientation)));
  const body = concat([bytes("WEBP"), ...kept]), header = new Uint8Array(8);
  header.set(bytes("RIFF"));
  view(header).setUint32(4, body.length, true);
  return concat([header, body]);
}
function sanitizeWithBudget(data, contentType, budget) {
  if (["image/jpeg", "image/jpg", "image/pjpeg"].includes(contentType)) return jpeg(data, budget);
  if (contentType === "image/png") return png(data, budget);
  if (contentType === "image/webp") return webp(data, budget);
  throw new Error("Formato non supportato dalla pulizia dei metadati.");
}
async function sanitizePhotoUploads(files, contentTypes = files.map((file) => file.type)) {
  if (files.length !== contentTypes.length) fail();
  const photoTypes = /* @__PURE__ */ new Set(["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp"]);
  const totalPhotoBytes = files.reduce((total, file, index) => total + (photoTypes.has(contentTypes[index]) ? file.size : 0), 0);
  if (totalPhotoBytes > MAX_SANITIZED_PHOTO_BATCH_BYTES) throw new PhotoPrivacyError("Prepara un gruppo di foto di massimo 32 MB.");
  const budget = budgetForRequest();
  const sanitized = [];
  for (const [index, file] of files.entries()) {
    const type = contentTypes[index];
    if (!photoTypes.has(type)) {
      const prefix = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      if (prefix[0] === 255 && prefix[1] === 216 || pngSignature.every((v, i) => prefix[i] === v) || ascii(prefix, 0, 4) === "RIFF" && ascii(prefix, 8, 4) === "WEBP") fail();
      sanitized.push(file);
      continue;
    }
    const clean = sanitizeWithBudget(new Uint8Array(await file.arrayBuffer()), type, budget);
    const canonicalType = type === "image/png" || type === "image/webp" ? type : "image/jpeg";
    const extension = canonicalType === "image/jpeg" ? "jpg" : canonicalType.slice(6);
    sanitized.push(new File([clean.buffer], `photo.${extension}`, { type: canonicalType, lastModified: file.lastModified }));
  }
  return sanitized;
}

// src/routes/create-post.ts
var schema4 = z4.object({
  caption: z4.string().trim().min(1).max(2e3),
  category: z4.string().trim().min(2).max(50)
});
async function resolveMediaType(item) {
  const inferred = inferCommunityMediaType(item);
  if (isAllowedCommunityMediaType(inferred)) return inferred;
  const header = new Uint8Array(await item.slice(0, 16).arrayBuffer());
  return sniffCommunityMediaType(header) || inferred;
}
function slugify(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
async function POST2(request, env) {
  const authenticated = await requireAuthenticatedUser(request, env);
  if (!authenticated)
    return Response.json(
      { error: "Accedi per pubblicare." },
      { status: 401 }
    );
  const form = await request.formData();
  const parsed = schema4.safeParse({
    caption: form.get("caption"),
    category: form.get("category")
  });
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Dati non validi." },
      { status: 400 }
    );
  const media = form.getAll("media").filter((item) => item instanceof File && item.size > 0);
  if (media.reduce((total, file) => total + file.size, 0) > 32 * 1024 * 1024)
    return Response.json({ error: "Carica al massimo 32 MB complessivi per post." }, { status: 413 });
  const mediaTypes = await Promise.all(
    media.map((item) => resolveMediaType(item))
  );
  if (!media.length || media.length > MAX_COMMUNITY_MEDIA_FILES || media.some(
    (item, index) => !isAllowedCommunityMediaType(mediaTypes[index] ?? "") || item.size > MAX_COMMUNITY_MEDIA_BYTES
  )) {
    return Response.json(
      {
        error: COMMUNITY_MEDIA_LIMIT_ERROR
      },
      { status: 400 }
    );
  }
  const { admin, user } = authenticated;
  const recent = await admin.from("community_posts").select("id", { count: "exact", head: true }).eq("author_id", user.id).gte("created_at", new Date(Date.now() - 36e5).toISOString());
  if (recent.error || (recent.count ?? 0) >= 20)
    return Response.json(
      {
        error: "Pubblicazione momentaneamente non disponibile. Riprova pi\xF9 tardi."
      },
      { status: 429 }
    );
  let uploadMedia;
  try {
    uploadMedia = await sanitizePhotoUploads(media, mediaTypes);
  } catch (error) {
    return Response.json({ error: error instanceof PhotoPrivacyError ? error.message : "Una foto non \xE8 valida. Esportala di nuovo come JPEG, PNG o WebP e riprova." }, { status: 400 });
  }
  const categorySlug = slugify(parsed.data.category);
  const category = await admin.from("post_categories").upsert(
    { slug: categorySlug, label: parsed.data.category },
    { onConflict: "slug" }
  ).select("id").single();
  if (category.error)
    return Response.json(
      { error: "Categoria non disponibile." },
      { status: 500 }
    );
  const signal = moderateText("Community post", parsed.data.caption);
  const moderation = { ...signal, status: "PENDING_REVIEW" };
  const id = crypto.randomUUID();
  const post = await admin.from("community_posts").insert({
    id,
    author_id: user.id,
    category_id: category.data.id,
    caption: parsed.data.caption,
    country_code: user.user_metadata?.country_code ?? null,
    language_code: user.user_metadata?.language_code ?? "it",
    status: "DRAFT",
    risk_score: signal.status === "ACTIVE" ? 0 : 1,
    // Ignore legacy connection fields from older clients.
    link_type: null,
    link_label: null,
    link_url: null
  }).select("id, status").single();
  if (post.error)
    return Response.json(
      { error: "Pubblicazione non riuscita." },
      { status: 500 }
    );
  const paths = [];
  try {
    for (const [index, item] of uploadMedia.entries()) {
      const type = mediaTypes[index] || item.type;
      const extension = communityMediaStorageExtension({
        name: item.name,
        type
      });
      const path = `${user.id}/${id}/${index}-${crypto.randomUUID()}.${extension}`;
      const upload = await admin.storage.from("community-media").upload(path, item, { contentType: type || item.type });
      if (upload.error) throw upload.error;
      paths.push(path);
    }
    const savedMedia = await admin.from("post_media").insert(
      paths.map((storagePath, index) => ({
        post_id: id,
        storage_path: storagePath,
        media_type: isVideoMedia({
          name: media[index]?.name ?? "",
          type: mediaTypes[index] || media[index]?.type || ""
        }) ? "VIDEO" : "IMAGE",
        sort_order: index
      }))
    );
    if (savedMedia.error) throw savedMedia.error;
    const activated = await admin.from("community_posts").update({ status: moderation.status }).eq("id", id);
    if (activated.error) throw activated.error;
  } catch {
    if (paths.length) await admin.storage.from("community-media").remove(paths);
    await admin.from("community_posts").delete().eq("id", id);
    return Response.json(
      { error: "Caricamento dei contenuti non riuscito." },
      { status: 500 }
    );
  }
  return Response.json(
    { post: { ...post.data, status: moderation.status }, moderation },
    { status: 201 }
  );
}

// src/index.ts
var feedPath = "/api/community/posts";
var interactionPath = "/api/community/posts/interaction";
var allowedOrigins = /* @__PURE__ */ new Set([
  "https://cosmora.kreluna.it",
  "capacitor://localhost",
  "http://localhost",
  "https://localhost"
]);
var maximumBodyBytes = 4096;
var uploadBodyBytes = 34 * 1024 * 1024;
var routes = {
  [feedPath]: { GET: GET2, POST: POST2 },
  [interactionPath]: { PUT },
  "/api/community/thumbnail": { GET },
  "/api/account": { GET: GET3, PUT: PUT2 },
  "/api/account/name-availability": { GET: GET4 },
  "/api/seller/profile": { GET: GET5, POST }
};
function normalizeMountedPath(path) {
  for (const prefix of ["/functions/v1/cosmora-community", "/cosmora-community"]) {
    for (const route of Object.keys(routes)) if (path === prefix + route) return route;
  }
  return null;
}
function finish(response, origin) {
  const headers2 = new Headers(response.headers);
  headers2.set("Cache-Control", "private, no-store");
  headers2.set("X-Content-Type-Options", "nosniff");
  headers2.set("Referrer-Policy", "no-referrer");
  headers2.set("Vary", "Origin");
  if (origin && allowedOrigins.has(origin)) {
    headers2.set("Access-Control-Allow-Origin", origin);
    headers2.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    headers2.set("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept, Accept-Language, Cache-Control");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers2
  });
}
async function smallRequest(request, maximumBytes = maximumBodyBytes) {
  const contentLength = request.headers.get("Content-Length");
  if (contentLength && Number(contentLength) > maximumBytes) return null;
  const reader = request.body?.getReader();
  const chunks = [];
  let total = 0;
  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const headers2 = new Headers(request.headers);
  headers2.delete("Content-Length");
  return new Request(request.url, { method: request.method, headers: headers2, body });
}
async function handleRequest(request, env) {
  const origin = request.headers.get("Origin");
  const response = (body, status, headers2) => finish(Response.json(body, { status, headers: headers2 }), origin);
  const path = normalizeMountedPath(new URL(request.url).pathname);
  if (!path || !routes[path])
    return response({ error: "Risorsa non disponibile." }, 404);
  if (origin && !allowedOrigins.has(origin))
    return response({ error: "Origine non consentita." }, 403);
  if (request.method === "OPTIONS")
    return finish(new Response(null, { status: 204 }), origin);
  const handler = routes[path][request.method];
  if (!handler) return response({ error: "Metodo non consentito." }, 405, { Allow: Object.keys(routes[path]).join(", ") + ", OPTIONS" });
  const upload = path === feedPath && request.method === "POST";
  try {
    if (request.method === "GET") return finish(await handler(request, env), origin);
    if (upload && !await requireAuthenticatedUser(request, env)) return response({ error: "Accedi per pubblicare." }, 401);
    if (!request.headers.get("Content-Type")?.toLowerCase().startsWith(upload ? "multipart/form-data;" : "application/json"))
      return response({ error: "Formato non valido." }, 415);
    const bounded = await smallRequest(request, upload ? uploadBodyBytes : maximumBodyBytes);
    if (!bounded) return response({ error: upload ? "Carica al massimo 32 MB complessivi per post. Riduci i file o dividili in pi\xF9 post." : "Richiesta troppo grande." }, 413);
    return finish(await handler(bounded, env), origin);
  } catch {
    return response({ error: "Servizio temporaneamente non disponibile. Riprova." }, 503);
  }
}

// index.ts
Deno.serve((request) => handleRequest(request, {
  SUPABASE_URL: Deno.env.get("SUPABASE_URL") ?? "",
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
}));
