import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WebsiteHttp, resolveWebsite, pageIdentity, publicAddress, MAX_WEBSITE_BODY, careersLinks } from '../../src/pipeline/website.ts';
import { HttpTreg } from '../../src/pipeline/treg.ts';
import { matchStage, scoreStage } from '../../src/pipeline/stages.ts';
import { runPipeline } from '../../src/pipeline/runner.ts';
import { decideMatch } from '../../src/domain/ingestion/matching.ts';
import { makeCtx, fakeFetch, fakeTreg, response, clock, worldFetch, worldTreg, WORLD_NAMES } from './helpers.mjs';

const site = { id: 'site', tenant: 'acme', pod: 'wd5', site: 'External', normalized_name: 'acme', enabled: true };
const workday = 'https://acme.wd5.myworkdayjobs.com/en-US/External';
const home = (title = 'Acme', link = workday) => `<html><title>${title}</title><a href="${link}">Careers</a></html>`;
const html = body => response(200, body, { 'content-type': 'text/html' });
function context({ candidates = [{ domain: 'acme.example', company_name: 'Acme' }], pages = {}, robots = 'User-agent: *\nAllow: /', provider, now = clock() } = {}) {
  const fetch = fakeFetch([
    { match: /\/robots\.txt$/, respond: () => response(200, robots) },
    { match: /^https:\/\//, respond: url => pages[url] instanceof Response ? pages[url].clone() : html(pages[url] ?? home()) },
  ]);
  const treg = fakeTreg({ 'hunter.x.domain-finder': provider ?? (() => ({ ok: true, status: 200, cost_usd: 0, call_id: 'free', body: { data: candidates } })) });
  return makeCtx({ fetch, treg, now });
}
const resolve = ctx => resolveWebsite(ctx, 'ACME CORP', [site], new WebsiteHttp(ctx));

test('website: company metadata + exact observed Workday tenant and site confirms; evidence is persisted and reused', async () => {
  const ctx = context();
  const first = await resolve(ctx);
  assert.equal(first.status, 'confirmed');
  assert.equal(first.domain, 'acme.example');
  assert.equal(first.evidence.checks[0].workday_url, workday);
  assert.deepEqual(ctx.treg.calls[0].opts.headers, { 'X-Treg-Route-Max-Cost': '0', 'X-Treg-Route-Waterfall': '0' });
  assert.equal(await resolve(ctx), first);
  assert.equal(ctx.treg.calls.length, 1);
  assert.equal(ctx.fetch.calls.length, 2);
  ctx.now.advanceDays(30);
  await resolve(ctx);
  assert.equal(ctx.treg.calls.length, 2);
});

test('website: provider name, HTTP 200, a body mention, wrong tenant or wrong site alone cannot confirm', async () => {
  for (const body of [home('Another Company'), '<html><title>Welcome</title>Acme ' + `<a href="${workday}">Jobs</a></html>`, home('Acme', 'https://other.wd5.myworkdayjobs.com/External'), home('Acme', 'https://acme.wd5.myworkdayjobs.com/Other')]) {
    const result = await resolve(context({ pages: { 'https://acme.example/': body } }));
    assert.equal(result.status, 'unresolved'); assert.equal(result.domain, null);
  }
  const wrong = context({ candidates: [{ domain: 'acme.example', company_name: 'Acme Games' }] });
  assert.equal((await resolve(wrong)).status, 'unresolved'); assert.equal(wrong.fetch.calls.length, 0);
});

test('website: conflicting corroborated domains require review; provider order does not pick a winner', async () => {
  const ctx = context({ candidates: ['acme.example', 'second.example'].map(domain => ({ domain, company_name: 'Acme' })) });
  const result = await resolve(ctx);
  assert.equal(result.status, 'unresolved'); assert.match(result.reason, /multiple/); assert.equal(result.domain, null);
});

test('website: follows one same-host careers link; a different employer link does not confirm', async () => {
  const ctx = context({ pages: { 'https://acme.example/': home('Acme', '/careers'), 'https://acme.example/careers': home() } });
  assert.equal((await resolve(ctx)).status, 'confirmed');
  const wrong = context({ pages: { 'https://acme.example/': home('Acme', 'https://third-party.example/careers') } });
  assert.equal((await resolve(wrong)).status, 'unresolved'); assert.equal(wrong.fetch.calls.length, 2);
});

test('website: redirect aliases collapse to one verified canonical host, checking robots on the destination', async () => {
  const ctx = context({ candidates: [{ domain: 'acme.example', company_name: 'Acme' }, { domain: 'alias.example', company_name: 'Acme' }], pages: { 'https://alias.example/': response(301, '', { location: 'https://acme.example/' }) } });
  assert.equal((await resolve(ctx)).domain, 'acme.example');
  assert.ok(ctx.fetch.calls.some(c => c.url === 'https://alias.example/robots.txt'));
});

test('website: blocked, oversized, non-HTML, network and robots-denied pages stay unresolved with retry and no bypass', async () => {
  for (const config of [
    { pages: { 'https://acme.example/': response(403, 'blocked') } },
    { pages: { 'https://acme.example/': html('x'.repeat(MAX_WEBSITE_BODY + 1)) } },
    { pages: { 'https://acme.example/': response(200, home()) } },
    { robots: 'User-agent: *\nDisallow: /' },
  ]) {
    const ctx = context(config); const result = await resolve(ctx);
    assert.equal(result.status, 'error'); assert.equal(result.domain, null);
    assert.equal(Date.parse(result.next_check_at) - +ctx.now(), 86400000);
  }
  const ctx = context(); ctx.fetch = async () => { throw Error('offline'); };
  assert.equal((await resolve(ctx)).status, 'error');
});

test('website: empty success retries in seven days; new observed site evidence invalidates the cache immediately', async () => {
  const ctx = context({ candidates: [] });
  assert.equal((await resolve(ctx)).status, 'unresolved');
  await resolve(ctx); assert.equal(ctx.treg.calls.length, 2);
  ctx.now.advanceDays(7); await resolve(ctx); assert.equal(ctx.treg.calls.length, 4);
  await resolveWebsite(ctx, 'ACME CORP', [{ ...site, site: 'NewSite' }], new WebsiteHttp(ctx));
  assert.equal(ctx.treg.calls.length, 6);
});

test('website: disabled transport is not cached; provider outages/malformed replies/positive charges do not become empty successes', async () => {
  const ctx = context(); ctx.treg = null;
  await resolve(ctx); assert.equal(ctx.store.websites.size, 0);
  for (const provider of [
    () => ({ ok: false, status: 429, error: 'treg HTTP 429', cost_usd: 0 }),
    () => ({ ok: true, status: 200, cost_usd: 0, body: { data: {} } }),
    () => ({ ok: true, status: 200, cost_usd: 0.1, body: { data: [] } }),
  ]) assert.equal((await resolve(context({ provider }))).status, 'error');
});

test('website: unsafe URLs, redirect targets and private DNS results are refused before accessing their pages', async () => {
  for (const domain of ['127.0.0.1', 'localhost', 'acme.local', 'acme.example:8000']) {
    const ctx = context({ candidates: [{ domain, company_name: 'Acme' }] });
    assert.notEqual((await resolve(ctx)).status, 'confirmed');
  }
  const ctx = context(); ctx.lookupHost = async () => [{ address: '127.0.0.1', family: 4 }];
  assert.equal((await resolve(ctx)).status, 'error'); assert.equal(ctx.fetch.calls.length, 0);
  const redirect = context({ pages: { 'https://acme.example/': response(302, '', { location: 'http://127.0.0.1/admin' }) } });
  assert.equal((await resolve(redirect)).status, 'error'); assert.equal(redirect.fetch.calls.length, 2);
  for (const address of ['127.0.0.1', '10.1.2.3', '169.254.169.254', '172.16.0.1', '192.168.1.1', '::1', 'fe80::1', '::ffff:127.0.0.1']) assert.equal(publicAddress(address), false);
});

test('website: dry run can evaluate evidence without saving a resolution', async () => {
  const ctx = context();
  assert.equal((await resolveWebsite(ctx, 'ACME CORP', [site], new WebsiteHttp(ctx), true)).status, 'confirmed');
  assert.equal(ctx.store.websites.size, 0);
});

test('website: identity uses structured organization or exact metadata, not fuzzy name fragments', () => {
  assert.equal(pageIdentity('<title>Epic Games</title>', 'Epic Systems Corporation'), null);
  assert.equal(pageIdentity('<script type="application/ld+json">{"@type":"Organization","legalName":"Acme Corporation"}</script>', 'ACME CORP'), 'Acme Corporation');
});

test('domain HTTP transport: missing/malformed/positive charge metadata fails closed; explicit zero succeeds', async () => {
  for (const [header, expected] of [[undefined, false], ['nonsense', false], ['', false], ['10', false], ['0', true]]) {
    const client = new HttpTreg('fixture-key', 'cube', async () => response(200, { data: [] }, header === undefined ? {} : { 'x-treg-cost-micro': header }));
    assert.equal((await client.call('hunter.x.domain-finder', {})).ok, expected);
  }
});

async function pendingWorld() {
  const now = clock(); const ctx = makeCtx({ now, fetch: worldFetch(), treg: worldTreg({ unconfirmed: [WORLD_NAMES[0]] }) });
  await runPipeline(ctx, { plan: 'weekly', limit: 20, dryRun: false, trigger: 'manual' });
  return { ctx, item: ctx.store.reviews.find(r => r.candidate_name.startsWith('Alder')) };
}

test('pending website review: retries when due, admits atomically with source/signals/sites, and repeated matching adds nothing', async () => {
  const { ctx, item } = await pendingWorld();
  assert.equal(item.reason, 'no_website');
  ctx.treg = worldTreg(); await matchStage(ctx);
  assert.equal(item.status, 'pending', 'negative cache prevents repeated daily lookups');
  ctx.now.advanceDays(7);
  const result = await matchStage(ctx);
  assert.equal(result.counts.recovered_reviews, 1); assert.equal(item.status, 'approved');
  const company = ctx.store.companyRows.find(c => c.id === item.resolved_company_id);
  assert.match(company.source, /^https:\/\//);
  assert.ok(ctx.store.signals.filter(s => s.review_item_id === item.id).every(s => s.company_id === company.id));
  assert.ok(ctx.store.sites.filter(s => s.review_item_id === item.id).every(s => s.company_id === company.id));
  const count = ctx.store.companyRows.length; await matchStage(ctx); assert.equal(ctx.store.companyRows.length, count);
});

test('pending website review: a failed admission leaves the review pending; cached verification permits retry', async () => {
  const { ctx, item } = await pendingWorld();
  ctx.treg = worldTreg(); ctx.now.advanceDays(7); ctx.store.failAfter = { admitReview: 0 };
  assert.ok((await matchStage(ctx)).counts.error_match);
  assert.equal(item.status, 'pending'); assert.equal(ctx.store.companyRows.length, 11);
  ctx.store.failAfter = {}; await matchStage(ctx);
  assert.equal(item.status, 'approved'); assert.equal(ctx.store.companyRows.length, 12);
});

test('human review protection: rejected and similar-name reviews cannot be automatically admitted', async () => {
  for (const status of ['rejected', 'similar_name']) {
    const { ctx, item } = await pendingWorld();
    if (status === 'rejected') await ctx.store.resolveReview(item.id, { action: 'reject' }, 'human rejected', null);
    else item.reason = 'similar_name';
    ctx.treg = worldTreg(); ctx.now.advanceDays(8); await matchStage(ctx);
    assert.equal(ctx.store.companyRows.length, 11); assert.equal(item.status, status === 'rejected' ? 'rejected' : 'pending');
    await assert.rejects(ctx.store.admitReview(item.id, 'alderrobotics.example', 'https://source.example/', null, null));
  }
});

test('admission: parent/subdomain website conflicts stay in review instead of creating duplicate companies', () => {
  const decision = decideMatch({ name: 'New Name', domain: 'corporate.acme.example', domain_confirmed: true, best_confidence: 1 }, [{ id: 'known', name: 'Acme', domain: 'acme.example' }], { canCreate: true });
  assert.equal(decision.action, 'review'); assert.equal(decision.suggested_company_id, 'known');
});

test('admission cap: confirmed pending reviews recover on the next run without repeating website requests', async () => {
  const ctx = makeCtx({ fetch: worldFetch(), treg: worldTreg() });
  ctx.store.settingsRows = [{ key: 'max_new_companies_per_run', value: 0 }];
  await runPipeline(ctx, { plan: 'weekly', limit: 20, dryRun: false, trigger: 'manual' });
  assert.equal(ctx.store.reviews.length, 12);
  assert.ok(ctx.store.reviews.every(item => item.reason === 'over_run_cap' && item.candidate_domain));
  const calls = ctx.treg.calls.length;
  ctx.store.settingsRows = [{ key: 'max_new_companies_per_run', value: 3 }];
  const result = await matchStage(ctx);
  assert.equal(result.counts.new_companies, 3); assert.equal(ctx.store.companyRows.length, 3);
  assert.equal(ctx.treg.calls.length, calls);
  assert.equal(ctx.store.reviews.filter(item => item.status === 'approved').length, 3);
});

test('provider outage: rate limit stops further lookup calls and is visible to the scheduler', async () => {
  const ctx = makeCtx({ fetch: worldFetch(), treg: worldTreg({ extra: { 'hunter.x.domain-finder': () => ({ ok: false, status: 429, error: 'treg HTTP 429', cost_usd: 0 }) } }) });
  const report = await runPipeline(ctx, { plan: 'weekly', limit: 20, dryRun: false, trigger: 'manual' });
  const match = report.jobs.find(job => job.job === 'match');
  assert.equal(match.status, 'blocked'); assert.match(match.blocked, /429/);
  assert.equal(ctx.treg.calls.length, 1);
  assert.equal(ctx.store.companyRows.length, 0);
  assert.ok((await ctx.store.unassignedSignals()).length > 0);
});

test('review recovery: expired trusted signals cannot create a company until fresh evidence arrives', async () => {
  const { ctx, item } = await pendingWorld();
  ctx.treg = worldTreg(); ctx.now.advanceDays(15);
  await matchStage(ctx);
  assert.equal(item.status, 'pending'); assert.equal(item.reason, 'untrusted_signal');
  assert.equal(ctx.store.companyRows.length, 11);
  const signal = (await ctx.store.signalsForReview(item.id)).find(s => s.type === 'known_customer');
  signal.last_seen_at = ctx.now().toISOString();
  await matchStage(ctx);
  assert.equal(item.status, 'approved'); assert.equal(ctx.store.companyRows.length, 12);
});

test('robots redirects: follow relative and cross-host redirects, cache rules for original origin, and obey them', async () => {
  for (const disallow of [false, true]) {
    const ctx = context();
    ctx.fetch = fakeFetch([
      { match: /^https:\/\/acme.example\/robots.txt$/, respond: () => response(301, '', { location: '/robots-next' }) },
      { match: /^https:\/\/acme.example\/robots-next$/, respond: () => response(302, '', { location: 'https://www.acme.example/robots.txt' }) },
      { match: /^https:\/\/www.acme.example\/robots.txt$/, respond: () => response(200, `User-agent: *\n${disallow ? 'Disallow' : 'Allow'}: /`) },
      { match: /^https:\/\/acme.example\/$/, respond: () => html(home()) },
    ]);
    const result = await resolve(ctx);
    assert.equal(result.status, disallow ? 'error' : 'confirmed');
    assert.equal(ctx.fetch.calls.filter(c => c.url === 'https://acme.example/').length, disallow ? 0 : 1);
  }
});

test('robots redirects: unsafe targets, private DNS, loops, excessive hops and HTML challenges never permit page access', async () => {
  for (const mode of ['private-url', 'private-dns', 'loop', 'too-many', 'challenge']) {
    const ctx = context();
    ctx.lookupHost = async host => [{ address: host === 'private.example' ? '10.0.0.1' : '93.184.216.34', family: 4 }];
    ctx.fetch = fakeFetch([{ match: /^https:\/\//, respond: url => {
      if (mode === 'private-url') return response(301, '', { location: 'https://127.0.0.1/robots.txt' });
      if (mode === 'private-dns') return response(301, '', { location: 'https://private.example/robots.txt' });
      if (mode === 'loop') return response(301, '', { location: '/robots.txt' });
      if (mode === 'challenge') return html('<html>captcha</html>');
      return response(302, '', { location: url + '/next' });
    } }]);
    const result = await resolve(ctx);
    assert.equal(result.status, 'error');
    assert.ok(ctx.fetch.calls.length <= 4);
    assert.ok(ctx.fetch.calls.every(c => c.url !== 'https://acme.example/'));
    assert.ok(ctx.fetch.calls.every(c => !c.url.includes('private.example') && !c.url.includes('127.0.0.1')));
  }
});

test('lookup fallback: normalized full identity can recover legal-name misses without trusting unrelated suggestions', async () => {
  const ctx = context({ provider: ({ query }) => ({ ok: true, status: 200, cost_usd: 0, body: { data: query.company === 'acme' ? [{ domain: 'acme.example', company_name: 'Acme' }] : [{ domain: 'games.example', company_name: 'Acme Games' }] } }) });
  const result = await resolve(ctx);
  assert.equal(result.status, 'confirmed');
  assert.deepEqual(ctx.treg.calls.map(c => c.opts.query.company), ['ACME CORP', 'acme']);
  assert.equal(result.evidence.queries.length, 2);
  assert.ok(ctx.fetch.calls.every(c => !c.url.includes('games.example')));
});

test('lookup fallback: empty results retry at most once, errors do not trigger fallback, and first-word aliases are not guessed', async () => {
  const empty = context({ candidates: [] });
  await resolve(empty); assert.equal(empty.treg.calls.length, 2);
  const outage = context({ provider: () => ({ ok: false, status: 429, error: 'treg HTTP 429', cost_usd: 0 }) });
  assert.equal((await resolve(outage)).status, 'error'); assert.equal(outage.treg.calls.length, 1);
  const epic = context({ candidates: [{ domain: 'epicgames.example', company_name: 'Epic Games' }] });
  await resolveWebsite(epic, 'Epic Systems Corporation', [site], new WebsiteHttp(epic));
  assert.deepEqual(epic.treg.calls.map(c => c.opts.query.company), ['Epic Systems Corporation', 'epic systems']);
  assert.equal(epic.fetch.calls.length, 0);
});

test('careers navigation: ranks the main landing page above saved jobs, accepts explicitly linked company subdomains, and caps depth', async () => {
  const landing = '<html><title>Acme</title><a href="/careers/saved-jobs">Saved jobs</a><a href="https://corporate.acme.example/careers.html">Careers</a></html>';
  assert.deepEqual(careersLinks(landing, 'https://acme.example/', 'acme.example'), ['https://corporate.acme.example/careers.html']);
  const ctx = context({ pages: {
    'https://acme.example/': landing,
    'https://corporate.acme.example/careers.html': '<html><a href="https://jobs.acme.example/search">Search jobs</a></html>',
    'https://jobs.acme.example/search': home(),
  } });
  assert.equal((await resolve(ctx)).status, 'confirmed');
  const deep = context(); deep.fetch = fakeFetch([
    { match: /\/robots.txt$/, respond: () => response(200, '') },
    { match: /^https:\/\//, respond: url => html(`<html><title>Acme</title><a href="${url}careers/">Careers</a></html>`) },
  ]);
  assert.equal((await resolve(deep)).status, 'unresolved');
  assert.equal(deep.fetch.calls.filter(c => !c.url.endsWith('/robots.txt')).length, 4, 'home plus at most three careers pages');
});

test('website access: ordinary reCAPTCHA form scripts are readable; actual access challenges remain blocked', async () => {
  const ordinary = context({ pages: { 'https://acme.example/': home() + '<script src="https://www.recaptcha.net/recaptcha/api.js"></script>' } });
  assert.equal((await resolve(ordinary)).status, 'confirmed');
  for (const body of ['<html><title>Just a moment</title><div id="cf-chl-test"></div></html>', '<html>Verify you are human</html>']) {
    assert.equal((await resolve(context({ pages: { 'https://acme.example/': body } }))).status, 'error');
  }
});

test('website size: ordinary corporate pages above the old 512 KiB limit can be verified within the 2 MiB cap', async () => {
  const ctx = context({ pages: { 'https://acme.example/': home() + '<!--' + 'x'.repeat(750000) + '-->' } });
  assert.equal((await resolve(ctx)).status, 'confirmed');
});

test('website cache: a previous verifier version is rechecked even before its retry date', async () => {
  const ctx = context(); const old = await resolve(ctx);
  ctx.store.websites.set('acme', { ...old, status: 'error', domain: null, input_signature: 'old-verifier-signature' });
  assert.equal((await resolve(ctx)).status, 'confirmed');
  assert.equal(ctx.treg.calls.length, 2);
});

test('careers navigation: follows job search from the landing page before other homepage links; ignores unrelated job-news links', async () => {
  const ctx = context({ pages: {
    'https://acme.example/': '<title>Acme</title><a href="/news/expansion">Creating new jobs</a><a href="/careers">Careers</a><a href="/careers/life">Life here</a><a href="/careers/stories">Stories</a>',
    'https://acme.example/careers': '<a href="https://jobs.acme.example/search?icmp=nav">Search jobs</a>',
    'https://jobs.acme.example/search': home(),
  } });
  assert.equal((await resolve(ctx)).status, 'confirmed');
  assert.ok(ctx.fetch.calls.some(c => c.url === 'https://jobs.acme.example/search'));
  assert.ok(ctx.fetch.calls.every(c => !c.url.includes('/news/expansion') && !c.url.includes('/careers/life')));
});

test('lookup fallback: short normalized names do not violate the provider three-character minimum', async () => {
  const ctx = context({ candidates: [] });
  assert.equal((await resolveWebsite(ctx, 'GE CORP', [site], new WebsiteHttp(ctx))).status, 'unresolved');
  assert.equal(ctx.treg.calls.length, 1);
});

async function employerCapture(ctx, { domain = 'acme.example', source = 'https://acme.wd5.myworkdayjobs.com/wday/cxs/acme/External/job/role', name = 'acme', fetched = ctx.now().toISOString(), field = 'description', description } = {}) {
  return ctx.store.saveCapture({ source: 'workday-career-sites', url: source, fetched_at: fetched, http_status: 200, content_type: 'application/json', fingerprint: `corp-${source}-${domain}-${fetched}`, raw: JSON.stringify({ jobPostingInfo: { jobDescription: description ?? (field === 'description' ? `<a href="https://${domain}/benefits?tracking=ignored">Benefits</a>` : '<p>Workday role</p>') }, hiringOrganization: { url: field === 'organization' ? `https://${domain}/` : '' } }), meta: { kind: 'workday_job', normalized_name: name, tenant: 'acme', pod: 'wd5', site: 'External' } }, null);
}

test('employer website: a corporate link in an exact observed Workday job plus independent website identity confirms without a reciprocal link', async () => {
  for (const field of ['description', 'organization']) {
    const ctx = context({ pages: { 'https://acme.example/': '<html><title>Acme</title></html>' } });
    const capture = await employerCapture(ctx, { field });
    const result = await resolve(ctx);
    assert.equal(result.status, 'confirmed'); assert.equal(result.domain, 'acme.example');
    assert.equal(result.evidence.checks[0].employer_link.capture_id, capture.id);
    assert.equal(result.evidence.checks[0].employer_link.url.includes('tracking'), false);
    assert.equal(result.evidence.checks[0].employer_link.source_url.includes('/wday/cxs/acme/External/job/'), true);
  }
});

test('employer website: unrelated provider alternatives cannot block a uniquely source-backed, independently verified website', async () => {
  const ctx = context({ candidates: [{ domain: 'dead.example', company_name: 'Acme' }, { domain: 'acme.example', company_name: 'Acme' }], pages: { 'https://acme.example/': '<title>Acme</title>' } });
  await employerCapture(ctx);
  assert.equal((await resolve(ctx)).status, 'confirmed');
  assert.ok(ctx.fetch.calls.every(c => !c.url.includes('dead.example')));
});

test('employer website: third-party benefits links, wrong tenant/site, expired evidence and name mismatches are not confirmation', async () => {
  for (const options of [
    { source: 'https://other.wd5.myworkdayjobs.com/wday/cxs/other/External/job/role' },
    { source: 'https://acme.wd5.myworkdayjobs.com/wday/cxs/acme/Other/job/role' },
    { fetched: '2020-01-01T00:00:00Z' },
    { name: 'somebody else' },
  ]) {
    const ctx = context({ pages: { 'https://acme.example/': '<title>Acme</title>' } });
    await employerCapture(ctx, options);
    assert.equal((await resolve(ctx)).status, 'unresolved');
  }
  const benefits = context({ candidates: [{ domain: 'benefits.example', company_name: 'Acme' }], pages: { 'https://benefits.example/': '<title>Unrelated Benefits Provider</title>' } });
  await employerCapture(benefits, { domain: 'benefits.example' });
  assert.equal((await resolve(benefits)).status, 'unresolved');
});

test('employer website: newly collected job evidence invalidates an unresolved cache immediately', async () => {
  const ctx = context({ pages: { 'https://acme.example/': '<title>Acme</title>' } });
  assert.equal((await resolve(ctx)).status, 'unresolved');
  await employerCapture(ctx);
  assert.equal((await resolve(ctx)).status, 'confirmed');
  assert.equal(ctx.treg.calls.length, 2);
});

test('employer website: two independently verified and source-backed domains remain ambiguous', async () => {
  const ctx = context({ candidates: [{ domain: 'acme.example', company_name: 'Acme' }, { domain: 'second.example', company_name: 'Acme' }], pages: { 'https://acme.example/': '<title>Acme</title>', 'https://second.example/': '<title>Acme</title>' } });
  await employerCapture(ctx); await employerCapture(ctx, { domain: 'second.example' });
  const result = await resolve(ctx);
  assert.equal(result.status, 'unresolved'); assert.match(result.reason, /multiple/);
});

test('human review: confirmed websites fill empty fields without resolving reviews or overwriting human choices', async () => {
  const { ctx, item } = await pendingWorld(); item.reason = 'similar_name';
  ctx.treg = worldTreg(); ctx.now.advanceDays(7);
  const result = await matchStage(ctx);
  assert.equal(result.counts.review_websites_confirmed, 1);
  assert.equal(item.candidate_domain, 'alderrobotics.example'); assert.equal(item.status, 'pending');
  assert.equal(ctx.store.companyRows.length, 11);
  item.candidate_domain = 'human-choice.example'; await matchStage(ctx);
  assert.equal(item.candidate_domain, 'human-choice.example'); assert.equal(item.status, 'pending');
});

test('admission and scoring: fresh employer evidence recovers a no-website review into a sourced new company', async () => {
  const ctx = context({ pages: { 'https://acme.example/': '<title>Acme</title>' } });
  ctx.store.sites.push({ ...site, company_name: 'ACME CORP', match_kind: 'full_name', company_id: null, review_item_id: null, capture_id: 'robots' });
  await ctx.store.upsertSignal({ company_id: null, review_item_id: null, capture_id: 'robots', extraction_id: null, type: 'known_customer', signal_date: null, source_url: workday, quote: 'Workday career site', confidence: 0.95, company_name: 'ACME CORP', products: null, project_type: null, role_seniority: null, timing_words: null, method: 'structured', seen_at: ctx.now().toISOString() });
  const first = await matchStage(ctx);
  assert.equal(first.counts.review_no_website, 1); assert.equal(ctx.store.companyRows.length, 0);
  await employerCapture(ctx);
  const second = await matchStage(ctx);
  assert.deepEqual(second.errors, []); assert.equal(second.counts.recovered_reviews, 1);
  assert.equal(ctx.store.reviews[0].status, 'approved');
  const company = ctx.store.companyRows[0];
  assert.equal(company.domain, 'acme.example'); assert.equal(company.source, workday);
  await scoreStage(ctx);
  assert.equal(ctx.store.scores.filter(s => s.company_id === company.id).length, 1);
  await matchStage(ctx); await scoreStage(ctx);
  assert.equal(ctx.store.companyRows.length, 1); assert.equal(ctx.store.scores.length, 1);
});

test('employer evidence freshness: unchanged job captures remain eligible when their signals were recently seen', async () => {
  const ctx = context({ pages: { 'https://acme.example/': '<title>Acme</title>' } });
  const capture = await employerCapture(ctx, { fetched: '2020-01-01T00:00:00Z' });
  ctx.store.signals.push({ id: 'fresh', capture_id: capture.id, last_seen_at: ctx.now().toISOString() });
  assert.equal((await resolve(ctx)).status, 'confirmed');
});


test('employer evidence: commented and script-only links do not establish corporate ownership', async () => {
  for (const description of ['<!-- <a href="https://acme.example/">Acme</a> -->', `<script>const x = '<a href="https://acme.example/">Acme</a>';</script>`]) {
    const ctx = context({ pages: { 'https://acme.example/': '<title>Acme</title>' } });
    await employerCapture(ctx, { description });
    assert.equal((await resolve(ctx)).status, 'unresolved');
  }
});

test('employer evidence: branded shared document/social/ATS pages are not corporate websites', async () => {
  for (const domain of ['acme.sharepoint.com', 'linkedin.com', 'acme.wd5.myworkdayjobs.com']) {
    const ctx = context({ candidates: [{ domain, company_name: 'Acme' }], pages: { [`https://${domain}/`]: home() } });
    await employerCapture(ctx, { domain });
    assert.equal((await resolve(ctx)).status, 'unresolved');
    assert.equal(ctx.fetch.calls.length, 0);
  }
});
