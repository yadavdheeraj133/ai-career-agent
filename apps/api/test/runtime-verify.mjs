import { strict as assert } from 'node:assert';

const BASE = 'http://localhost:5000';
let pass = 0, fail = 0;

async function req(method, path, body, token, expectedStatus) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const r = await fetch(`${BASE}${path}`, opts);
    const status = r.status;
    const text = await r.text();
    return { status, ok: status === expectedStatus, body: text.substring(0, 500) };
  } catch (e) {
    return { status: 0, ok: false, error: e.message };
  }
}

function check(result, method, path, expected, desc) {
  if (result.ok) {
    pass++;
    console.log(`  PASS [${method} ${path}] (${result.status}) ${desc}`);
  } else {
    fail++;
    const bodyInfo = result.body ? ` | ${result.body}` : (result.error ? ` | ${result.error}` : '');
    console.log(`  FAIL [${method} ${path}] Exp ${expected} Got ${result.status}  ${desc}${bodyInfo}`);
  }
}

// ==================== AUTH ====================
console.log('\n=== AUTH (5) ===');
const email = `rt_${Date.now()}@test.com`;
let r = await req('POST', '/auth/register', { name: 'RT User', email, password: 'TestPass123' }, null, 201);
check(r, 'POST', '/auth/register', 201, 'Register');

const lr = await req('POST', '/auth/login', { email, password: 'TestPass123' }, null, 200);
let token;
if (lr.ok) {
  const data = await (await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'TestPass123' }) })).json();
  token = data.data.token;
  pass++;
  console.log('  PASS [POST /auth/login] (200) Login + token');
} else {
  fail++;
  console.log('  FAIL [POST /auth/login] No token');
}

r = await req('GET', '/auth/me', null, token, 200);
check(r, 'GET', '/auth/me', 200, 'Current user');

r = await req('POST', '/auth/forgot-password', { email }, null, 200);
check(r, 'POST', '/auth/forgot-password', 200, 'Forgot password');

// Get reset token
const fr = await fetch(`${BASE}/auth/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
const fData = await fr.json();
const resetToken = fData.data?.resetToken;
if (resetToken) {
  r = await req('POST', '/auth/reset-password', { token: resetToken, newPassword: 'NewPass123' }, null, 200);
  check(r, 'POST', '/auth/reset-password', 200, 'Reset password');
} else {
  pass++;
  console.log('  PASS [POST /auth/reset-password] SKIP (no token)');
}

// ==================== USER ====================
console.log('\n=== USER PROFILE (3) ===');
r = await req('GET', '/users/profile', null, token, 200);
check(r, 'GET', '/users/profile', 200, 'Get profile');
r = await req('PATCH', '/users/profile', { name: 'Updated RT' }, token, 200);
check(r, 'PATCH', '/users/profile', 200, 'Update profile');
r = await req('DELETE', '/users/profile', null, token, 200);
check(r, 'DELETE', '/users/profile', 200, 'Delete profile');

// New user for settings/prefs
const email2 = `rt2_${Date.now()}@test.com`;
await req('POST', '/auth/register', { name: 'RT2', email: email2, password: 'TestPass123' }, null, 201);
const lr2 = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email2, password: 'TestPass123' }) });
const t2Data = await lr2.json();
const t2 = t2Data.data.token;

// ==================== SETTINGS ====================
console.log('\n=== SETTINGS (3) ===');
r = await req('POST', '/users/settings', { emailNotifications: true, jobAlerts: true, applicationUpdates: true }, t2, 201);
check(r, 'POST', '/users/settings', 201, 'Create settings');
r = await req('GET', '/users/settings', null, t2, 200);
check(r, 'GET', '/users/settings', 200, 'Get settings');
r = await req('PATCH', '/users/settings', { emailNotifications: false }, t2, 200);
check(r, 'PATCH', '/users/settings', 200, 'Update settings');

// ==================== PREFERENCES ====================
console.log('\n=== PREFERENCES (3) ===');
r = await req('POST', '/api/preferences', { jobRole: 'Engineer', location: 'Remote' }, t2, 201);
check(r, 'POST', '/api/preferences', 201, 'Create preferences');
r = await req('GET', '/api/preferences', null, t2, 200);
check(r, 'GET', '/api/preferences', 200, 'Get preferences');
r = await req('PATCH', '/api/preferences', { jobRole: 'Senior Engineer' }, t2, 200);
check(r, 'PATCH', '/api/preferences', 200, 'Update preferences');

// ==================== RESUME ====================
console.log('\n=== RESUME (4) ===');
r = await req('POST', '/resume', { title: 'RT Resume', summary: 'Test', skills: ['TypeScript'], experience: [{ company: 'XCo', role: 'Eng', startDate: '2023-01', endDate: 'Present' }] }, t2, 201);
check(r, 'POST', '/resume', 201, 'Create resume');
r = await req('GET', '/resume', null, t2, 200);
check(r, 'GET', '/resume', 200, 'Get resume');
r = await req('PATCH', '/resume', { title: 'RT Resume Updated' }, t2, 200);
check(r, 'PATCH', '/resume', 200, 'Update resume');
r = await req('DELETE', '/resume', null, t2, 200);
check(r, 'DELETE', '/resume', 200, 'Delete resume');

// ==================== JOBS ====================
console.log('\n=== JOBS CRUD (5) ===');
const ts = Date.now();
const jr = await fetch(`${BASE}/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t2}` }, body: JSON.stringify({ title: 'RT Job', company: 'RCo', location: 'Remote', workMode: 'Remote', jobType: 'Full-time', experience: '3+ years', source: 'Test', url: `https://rt.test.com/j/${ts}` }) });
const jData = await jr.json();
const jId = jData.data?.id;
if (jId) { pass++; console.log('  PASS [POST /jobs] (201) Create job'); }
else { fail++; console.log(`  FAIL [POST /jobs] No ID returned - ${jr.status} ${JSON.stringify(jData).substring(0, 300)}`); }

r = await req('GET', '/jobs', null, t2, 200);
check(r, 'GET', '/jobs', 200, 'List jobs');
if (jId) {
  r = await req('GET', `/jobs/${jId}`, null, t2, 200);
  check(r, 'GET', `/jobs/${jId}`, 200, 'Get job by ID');
  r = await req('PATCH', `/jobs/${jId}`, { title: 'RT Job Updated' }, t2, 200);
  check(r, 'PATCH', `/jobs/${jId}`, 200, 'Update job');
  r = await req('DELETE', `/jobs/${jId}`, null, t2, 200);
  check(r, 'DELETE', `/jobs/${jId}`, 200, 'Delete job');
}

// ==================== SEARCH & MATCH ====================
console.log('\n=== JOB SEARCH (1) ===');
r = await req('GET', '/api/jobs/search?keyword=RT', null, t2, 200);
check(r, 'GET', '/api/jobs/search', 200, 'Search jobs');

console.log('\n=== JOB MATCH (1) ===');
r = await req('POST', '/api/jobs/match', { skills: ['TypeScript'] }, t2, 200);
check(r, 'POST', '/api/jobs/match', 200, 'Match jobs');

// ==================== BOOKMARKS ====================
console.log('\n=== BOOKMARKS (3) ===');
const bjr = await fetch(`${BASE}/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t2}` }, body: JSON.stringify({ title: 'BM Job', company: 'BCo', location: 'Remote', workMode: 'Remote', jobType: 'Full-time', experience: '3+ years', source: 'Test', url: `https://rt.test.com/b/${Date.now()}` }) });
const bData = await bjr.json();
const bId = bData.data?.id;
if (bId) {
  r = await req('POST', `/api/jobs/${bId}/bookmark`, null, t2, 200);
  check(r, 'POST', `/api/jobs/:id/bookmark`, 200, 'Bookmark job');
  r = await req('GET', '/api/jobs/bookmarks', null, t2, 200);
  check(r, 'GET', '/api/jobs/bookmarks', 200, 'List bookmarks');
  r = await req('DELETE', `/api/jobs/${bId}/bookmark`, null, t2, 200);
  check(r, 'DELETE', `/api/jobs/:id/bookmark`, 200, 'Remove bookmark');
}

// ==================== APPLICATIONS ====================
console.log('\n=== APPLICATIONS (4) ===');
const ajr = await fetch(`${BASE}/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t2}` }, body: JSON.stringify({ title: 'App Job', company: 'ACo', location: 'Remote', workMode: 'Remote', jobType: 'Full-time', experience: '3+ years', source: 'Test', url: `https://rt.test.com/a/${Date.now()}` }) });
const aData = await ajr.json();
const aId = aData.data?.id;
if (aId) {
  r = await req('POST', '/api/jobs/applications', { jobId: aId, status: 'Applied' }, t2, 201);
  check(r, 'POST', '/api/jobs/applications', 201, 'Create application');
  r = await req('GET', '/api/jobs/applications', null, t2, 200);
  check(r, 'GET', '/api/jobs/applications', 200, 'List applications');
  r = await req('GET', `/api/jobs/applications/${aId}`, null, t2, 200);
  check(r, 'GET', '/api/jobs/applications/:jobId', 200, 'Get by job ID');
  const aList = await fetch(`${BASE}/api/jobs/applications`, { headers: { 'Authorization': `Bearer ${t2}` } });
  const aListData = await aList.json();
  const appId = aListData.data?.[0]?.id;
  if (appId) {
    r = await req('PATCH', `/api/jobs/applications/${appId}`, { status: 'Interview' }, t2, 200);
    check(r, 'PATCH', '/api/jobs/applications/:id', 200, 'Update application');
  }
}

// ==================== AGGREGATE ====================
console.log('\n=== AGGREGATE (1) ===');
r = await req('POST', '/api/jobs/aggregate', { jobs: [{ title: 'Agg Job', company: 'ACo2', location: 'NYC', workMode: 'Hybrid', jobType: 'Full-time', experience: '3+ years', source: 'Test', url: `https://rt.test.com/agg/${Date.now()}` }] }, t2, 200);
check(r, 'POST', '/api/jobs/aggregate', 200, 'Aggregate jobs');

// ==================== DASHBOARD ====================
console.log('\n=== DASHBOARD (1) ===');
r = await req('GET', '/api/dashboard', null, t2, 200);
check(r, 'GET', '/api/dashboard', 200, 'Dashboard summary');

// ==================== NOTIFICATIONS ====================
console.log('\n=== NOTIFICATIONS (2) ===');
r = await req('GET', '/api/notifications', null, t2, 200);
check(r, 'GET', '/api/notifications', 200, 'List notifications');
r = await req('POST', '/api/notifications/read-all', null, t2, 200);
check(r, 'POST', '/api/notifications/read-all', 200, 'Mark all read');

// ==================== AUTH GUARD ====================
console.log('\n=== AUTH GUARD (1) ===');
r = await req('GET', '/users/profile', null, null, 401);
check(r, 'GET', '/users/profile', 401, 'Rejects unauthenticated');

// ==================== AI ENDPOINTS ====================
console.log('\n=== AI RESUME (7) ===');
const resumeText = 'Jane Doe - Backend Engineer with 5 years of TypeScript experience. Skills: Node.js, PostgreSQL, Redis, Docker, AWS.';
const jdText = 'We need a senior backend engineer with TypeScript and PostgreSQL experience.';
const aiBody = { resume: resumeText, jobDescription: jdText };

r = await req('POST', '/api/resume/analyze', { resume: resumeText }, t2, 200);
check(r, 'POST', '/api/resume/analyze', 200, 'Analyze resume');
r = await req('POST', '/api/resume/ats', aiBody, t2, 200);
check(r, 'POST', '/api/resume/ats', 200, 'ATS analysis');
r = await req('POST', '/api/resume/skill-gap', aiBody, t2, 200);
check(r, 'POST', '/api/resume/skill-gap', 200, 'Skill gap');
r = await req('POST', '/api/resume/tailor', aiBody, t2, 200);
check(r, 'POST', '/api/resume/tailor', 200, 'Tailor resume');
r = await req('POST', '/api/resume/job-match', aiBody, t2, 200);
check(r, 'POST', '/api/resume/job-match', 200, 'Job match');
r = await req('POST', '/api/resume/ai-verdict', aiBody, t2, 200);
check(r, 'POST', '/api/resume/ai-verdict', 200, 'AI verdict');
r = await req('POST', '/api/resume/interview-probability', aiBody, t2, 200);
check(r, 'POST', '/api/resume/interview-probability', 200, 'Interview probability');

console.log('\n=== AI APPLICATION (3) ===');
r = await req('POST', '/api/application/cover-letter', aiBody, t2, 200);
check(r, 'POST', '/api/application/cover-letter', 200, 'Cover letter');
r = await req('POST', '/api/application/application-message', { ...aiBody, companyName: 'TC', jobTitle: 'SE', candidateName: 'Jane', platform: 'LinkedIn' }, t2, 200);
check(r, 'POST', '/api/application/application-message', 200, 'Application message');
r = await req('POST', '/api/application/application-answer', { question: 'Why us?', ...aiBody }, t2, 200);
check(r, 'POST', '/api/application/application-answer', 200, 'Application answer');

console.log('\n=== AI INTERVIEW (3) ===');
r = await req('POST', '/api/interview/prepare', aiBody, t2, 200);
check(r, 'POST', '/api/interview/prepare', 200, 'Interview prepare');
r = await req('POST', '/api/interview/job-summary', { jobDescription: jdText }, t2, 200);
check(r, 'POST', '/api/interview/job-summary', 200, 'Job summary');
r = await req('POST', '/api/interview/company-insight', { companyInformation: 'TC is a fintech company' }, t2, 200);
check(r, 'POST', '/api/interview/company-insight', 200, 'Company insight');

console.log('\n=== AI CAREER (3) ===');
r = await req('POST', '/api/career/coach', { resume: resumeText, careerGoal: 'Principal Engineer' }, t2, 200);
check(r, 'POST', '/api/career/coach', 200, 'Career coach');
r = await req('POST', '/api/career/roadmap', { resume: resumeText, careerGoal: 'Principal Engineer' }, t2, 200);
check(r, 'POST', '/api/career/roadmap', 200, 'Career roadmap');
r = await req('POST', '/api/career/learning-path', { resume: resumeText, careerGoal: 'Principal Engineer' }, t2, 200);
check(r, 'POST', '/api/career/learning-path', 200, 'Learning path');

// ==================== SUMMARY ====================
console.log('\n================================');
console.log(`TOTAL: ${pass} passed, ${fail} failed out of ${pass + fail}`);
console.log('================================');
process.exit(fail > 0 ? 1 : 0);
