# AI Career Agent --- API Documentation

**Base URL:** `http://localhost:5000`

> This document is based on the route/controller code shared in the
> conversation plus the uploaded API project structure.\
> The current Sprint 4 additions **AI Verdict** and **Interview
> Probability** are included from the latest code shared in the
> conversation.

------------------------------------------------------------------------

## 1. Authentication

### POST `/auth/register`

Register a new user.

**Auth:** No

**Body**

``` json
{
  "name": "Swayam Yadav",
  "email": "swayam@example.com",
  "password": "Password123"
}
```

### POST `/auth/login`

Login and receive a JWT.

**Auth:** No

**Body**

``` json
{
  "email": "swayam@example.com",
  "password": "Password123"
}
```

**Response**

``` json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "USER_ID",
      "name": "Swayam Yadav",
      "email": "swayam@example.com"
    },
    "token": "JWT_TOKEN"
  }
}
```

### GET `/auth/me`

Get the currently authenticated user.

**Auth:** Bearer JWT

**Headers**

``` text
Authorization: Bearer YOUR_JWT_TOKEN
```

------------------------------------------------------------------------

# 2. User Profile

### GET `/users/profile`

Get current user's profile.

**Auth:** Bearer JWT

### PATCH `/users/profile`

Update current user's profile.

**Auth:** Bearer JWT

**Body**

``` json
{
  "name": "Swayam Yadav"
}
```

### DELETE `/users/profile`

Delete current user's account.

**Auth:** Bearer JWT

**Body:** None

------------------------------------------------------------------------

# 3. Resume CRUD

### POST `/resume`

Create a resume.

**Auth:** Bearer JWT

**Body**

``` json
{
  "title": "Software Engineer Resume",
  "summary": "Full stack developer and cybersecurity researcher.",
  "experience": [
    {
      "company": "Independent",
      "role": "Cybersecurity Researcher",
      "location": "Mumbai",
      "startDate": "2024",
      "endDate": "",
      "currentlyWorking": true,
      "description": "Conduct web application security research."
    }
  ],
  "education": [
    {
      "institution": "University",
      "degree": "BSc Computer Science",
      "fieldOfStudy": "Computer Science",
      "startDate": "2024",
      "endDate": "",
      "grade": ""
    }
  ],
  "skills": [
    "TypeScript",
    "Node.js",
    "React.js",
    "PostgreSQL"
  ],
  "projects": [
    {
      "title": "AI Career Agent",
      "description": "AI-powered career platform.",
      "technologies": [
        "TypeScript",
        "Node.js",
        "PostgreSQL"
      ],
      "github": "https://github.com/example/project",
      "liveDemo": "https://example.com"
    }
  ],
  "certifications": [],
  "achievements": [],
  "languages": ["English", "Hindi"],
  "links": {
    "github": "https://github.com/example",
    "linkedin": "https://linkedin.com/in/example",
    "portfolio": "https://example.com"
  },
  "template": "modern",
  "isDefault": true
}
```

### GET `/resume`

Get current user's resume.

**Auth:** Bearer JWT

### PATCH `/resume`

Update current user's resume.

**Auth:** Bearer JWT

**Body:** Resume fields to update.

### DELETE `/resume`

Delete current user's resume.

**Auth:** Bearer JWT

------------------------------------------------------------------------

# 4. Jobs CRUD

### POST `/jobs`

Create a job.

**Auth:** No route-level auth currently present.

**Body**

``` json
{
  "title": "Full Stack Developer",
  "company": "TechNova",
  "location": "Mumbai, India",
  "workMode": "Hybrid",
  "jobType": "Full-time",
  "experience": "1-3 years",
  "salary": "₹8-12 LPA",
  "description": "Build React and Node.js applications.",
  "source": "LinkedIn",
  "url": "https://example.com/jobs/full-stack"
}
```

`workMode`: `Remote | Hybrid | Onsite`

`jobType`: `Full-time | Part-time | Internship | Contract | Freelance`

### GET `/jobs`

Get all jobs.

### GET `/jobs/:id`

Get a job by ID.

Example:

``` text
GET /jobs/cme123456
```

### PATCH `/jobs/:id`

Update a job.

**Body:** Any subset of the create-job fields.

### DELETE `/jobs/:id`

Delete a job.

------------------------------------------------------------------------

# 5. AI --- Resume

All current resume AI endpoints are mounted under:

``` text
/api/resume
```

### POST `/api/resume/analyze`

Analyze resume quality.

**Auth:** No route-level auth currently present.

**Body**

``` json
{
  "resume": "FULL RESUME TEXT"
}
```

### POST `/api/resume/ats`

Analyze ATS compatibility against a job.

**Body**

``` json
{
  "resume": "FULL RESUME TEXT",
  "jobDescription": "FULL JOB DESCRIPTION"
}
```

### POST `/api/resume/skill-gap`

Analyze skill gaps.

**Body**

``` json
{
  "resume": "FULL RESUME TEXT",
  "jobDescription": "FULL JOB DESCRIPTION"
}
```

### POST `/api/resume/tailor`

Tailor the resume to a job while preserving factual information.

**Body**

``` json
{
  "resume": "FULL RESUME TEXT",
  "jobDescription": "FULL JOB DESCRIPTION"
}
```

### POST `/api/resume/job-match`

Calculate resume ↔ job compatibility.

**Body**

``` json
{
  "resume": "FULL RESUME TEXT",
  "jobDescription": "FULL JOB DESCRIPTION"
}
```

**Response data**

``` json
{
  "overallMatch": 0,
  "matchedSkills": [],
  "missingSkills": [],
  "experienceMatch": 0,
  "educationMatch": 0,
  "strengths": [],
  "weaknesses": [],
  "recommendations": []
}
```

### POST `/api/resume/ai-verdict`

Generate a final suitability verdict.

**Body**

``` json
{
  "resume": "FULL RESUME TEXT",
  "jobDescription": "FULL JOB DESCRIPTION"
}
```

**Response data**

``` json
{
  "verdict": "Good Match",
  "score": 0,
  "summary": "",
  "reasons": [],
  "strengths": [],
  "concerns": [],
  "recommendation": ""
}
```

### POST `/api/resume/interview-probability`

Estimate interview probability.

**Body**

``` json
{
  "resume": "FULL RESUME TEXT",
  "jobDescription": "FULL JOB DESCRIPTION"
}
```

**Response data**

``` json
{
  "probability": 0,
  "confidence": "Medium",
  "assessment": "",
  "positiveFactors": [],
  "riskFactors": [],
  "recommendations": []
}
```

------------------------------------------------------------------------

# 6. AI --- Application

Base path:

``` text
/api/application
```

### POST `/api/application/cover-letter`

**Body**

``` json
{
  "resume": "FULL RESUME TEXT",
  "jobDescription": "FULL JOB DESCRIPTION"
}
```

### POST `/api/application/application-message`

**Body**

``` json
{
  "resume": "FULL RESUME TEXT",
  "jobDescription": "FULL JOB DESCRIPTION",
  "companyName": "TechNova",
  "jobTitle": "Full Stack Developer",
  "candidateName": "Swayam Yadav",
  "platform": "LinkedIn"
}
```

### POST `/api/application/application-answer`

**Body**

``` json
{
  "question": "Why should we hire you?",
  "resume": "FULL RESUME TEXT",
  "jobDescription": "FULL JOB DESCRIPTION"
}
```

------------------------------------------------------------------------

# 7. AI --- Interview & Job Intelligence

Base path:

``` text
/api/interview
```

### POST `/api/interview/prepare`

Generate interview preparation.

**Body**

``` json
{
  "resume": "FULL RESUME TEXT",
  "jobDescription": "FULL JOB DESCRIPTION"
}
```

### POST `/api/interview/job-summary`

Generate a structured job summary.

**Body**

``` json
{
  "jobDescription": "FULL JOB DESCRIPTION"
}
```

### POST `/api/interview/company-insight`

Generate company insights from supplied company information.

**Body**

``` json
{
  "companyInformation": "Company name, website information, description, products, industry, etc."
}
```

------------------------------------------------------------------------

# 8. AI --- Career Guidance

Base path:

``` text
/api/career
```

### POST `/api/career/coach`

Generate career coaching.

**Body**

``` json
{
  "resume": "FULL RESUME TEXT",
  "currentRole": "Junior Software Developer",
  "careerGoal": "Full Stack Engineer"
}
```

### POST `/api/career/roadmap`

Generate a career roadmap.

**Body**

``` json
{
  "resume": "FULL RESUME TEXT",
  "currentRole": "Junior Software Developer",
  "careerGoal": "Senior Full Stack Engineer"
}
```

### POST `/api/career/learning-path`

Generate a learning path.

**Body**

``` json
{
  "resume": "FULL RESUME TEXT",
  "careerGoal": "Full Stack Engineer"
}
```

------------------------------------------------------------------------

# 9. Job Aggregation

Base path:

``` text
/api/jobs
```

### POST `/api/jobs/aggregate`

Aggregate external job data into the job system.

**Authorization:** worker or admin only — the request must carry the
configured `x-worker-secret` header, or the caller's account email must be
listed in `ADMIN_EMAILS`. Without this configuration the endpoint fails
closed in production.

**Body**

``` json
{
  "jobs": [
    {
      "title": "Full Stack Developer",
      "company": "TechNova",
      "location": "Mumbai",
      "workMode": "Hybrid",
      "jobType": "Full-time",
      "experience": "1-3 years",
      "salary": "₹8-12 LPA",
      "description": "Build web applications.",
      "source": "LinkedIn",
      "url": "https://example.com/job/1"
    }
  ]
}
```

------------------------------------------------------------------------

### Job provider architecture (worker ingestion)

Scheduled ingestion is performed by the worker (`apps/worker`) through
legitimate public or registered APIs; it never scrapes websites. Built-in
adapters cover Arbeitnow, Adzuna, The Muse, Remote OK, and Jobicy, alongside
deployment-configured HTTP JSON feeds and an optional local fixture.

**Configuration**

``` text
JOB_PROVIDER_URLS="arbeitnow|https://arbeitnow.com/api/job-board-api|data,themuse|https://www.themuse.com/api/public/jobs?page=0,remoteok|https://remoteok.com/api,jobicy|https://jobicy.com/api/v2/remote-jobs?count=100,adzuna|https://api.adzuna.com/v1/api/jobs/gb/search/1"
JOB_PROVIDER_HEADERS='{"custom":{"Authorization":"Bearer <secret>"}}'
ADZUNA_APP_ID=<registered Adzuna app id>
ADZUNA_APP_KEY=<registered Adzuna app key>
THE_MUSE_API_KEY=<optional registered app key>
JOB_FIXTURE_FILE="./fixtures/jobs.json"
AUTOMATION_ENABLED=true
AUTOMATION_RUN_ON_START=true
JOB_FETCH_INTERVAL_MS=900000
JOB_EXPIRE_INTERVAL_MS=21600000
JOB_TTL_MS=2592000000
AUTOMATION_MAX_ATTEMPTS=3
AUTOMATION_BASE_BACKOFF_MS=200
AUTOMATION_MAX_BACKOFF_MS=5000
JOB_MAX_PER_PROVIDER=500
WORKER_SECRET=<shared secret accepted via the x-worker-secret header>
ADMIN_EMAILS=ops@example.com
```

**Built-in developer providers**

| Provider | Authentication | Official developer filter | Additional fallback |
| --- | --- | --- | --- |
| Arbeitnow | None | No server-side developer filter is offered | Fetch the official JSON feed, then apply the shared developer-role classifier |
| Adzuna | `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` | Default `what_or` software-development query; preserve any explicit `what*`, `title_only`, or `category` query | Apply the shared classifier |
| The Muse | Optional `THE_MUSE_API_KEY` | Default `category=Software Engineer`; preserve an explicit category | Apply the shared classifier |
| Remote OK | None | Default `tag=dev`; preserve explicit `tag` or `tags` | Apply the shared classifier |
| Jobicy | None | Default `industry=engineering`; preserve an explicit industry | Apply the shared classifier |

The official method references are [Arbeitnow](https://www.arbeitnow.com/blog/job-board-api),
[Adzuna](https://developer.adzuna.com/docs/search), [The Muse](https://www.themuse.com/developers/api/v2),
[Remote OK](https://remoteok.com/faq), and [Jobicy](https://jobicy.com/jobs-rss-feed).
Arbeitnow filtering is deliberately local because its documented API does not
offer a developer-only parameter. Remote OK's `tags` value is a site-wide
taxonomy rather than a per-job skill list, so it is not persisted as job
skills; Remote OK rows are classified from their actual title and description.
Explicit query parameters in configured URLs are never overwritten.

- `JOB_PROVIDER_URLS` entries are `name|url[|jobsPath]`; `jobsPath` selects a
  nested jobs array (for example `data.jobs`). Without it, a top-level array
  or the `jobs` / `data` / `results` / `items` keys are accepted.
- Provider URLs and auth headers come from the environment only and are never
  logged; failure details record the provider name and error kind, not
  credentials or response bodies.
- To add a legitimate source, point `JOB_PROVIDER_URLS` at its authorized
  API/feed. Do not add scrapers for sites without an authorized API.

**Pipeline guarantees**

- Built-in provider results pass through a conservative shared classifier before
  normalization. It accepts explicit development roles and development evidence
  in the title, description, skills, or raw requirements while rejecting
  business, design, sales, marketing, HR, finance, legal, education, and health
  roles. Existing catalogue rows are classified at read time by search and
  matching, so legacy data is preserved rather than deleted or rewritten.
- Each built-in provider summary reports `fetched`, `accepted`, and `rejected`
  counts. `fetched` is the number returned by the provider, while `accepted` is
  the number that passed developer-role classification before per-provider
  limits, normalization, deduplication, and persistence.
- Provider field aliases are normalized (`jobTitle`, `companyName`,
  `applyUrl`/`link`, `externalId`/`jobId`, `work_mode`, `job_type`,
  posting-date variants); malformed records are skipped and reported without
  aborting the batch.
- Deduplication is by `(provider, externalId)` first, then canonical URL
  (tracking params stripped). The database additionally enforces
  `UNIQUE(provider, externalId)`, so concurrent runs cannot create
  duplicates; the loser of an insert race falls back to the update path.
- Providers run sequentially with bounded retries (transient failures only:
  network errors, timeouts, HTTP 429/5xx). One failing provider never blocks
  the others.
- Jobs that stop appearing in feeds are marked `EXPIRED` after `JOB_TTL_MS`
  (never deleted, so bookmarks and applications stay intact).

------------------------------------------------------------------------

# 10. Job Search

### GET `/api/jobs/search`

Search jobs using query parameters.

**Query parameters**

``` text
keyword
location
workMode
jobType
source
experience
page
pageSize
```

Results include only developer roles. Non-developer legacy rows remain stored
and accessible through their existing detail endpoints but are omitted from
search and matching.

Example:

``` text
GET /api/jobs/search?keyword=developer&location=Mumbai&workMode=Hybrid&jobType=Full-time
```

------------------------------------------------------------------------

# 11. Job Matching

### POST `/api/jobs/match`

Match available jobs against candidate preferences/skills.

**Body**

``` json
{
  "skills": [
    "React.js",
    "TypeScript",
    "Node.js",
    "PostgreSQL"
  ],
  "preferredLocation": "Mumbai",
  "preferredWorkMode": "Hybrid",
  "preferredJobType": "Full-time"
}
```

Matching includes only developer roles. A user without a saved profile or
supplied skills can send a pagination-only body (for example `{ "page": 1 }`)
to browse available developer jobs with neutral `0` match scores.

------------------------------------------------------------------------

# 12. Job Bookmarks

### POST `/api/jobs/:id/bookmark`

Bookmark a job.

Example:

``` text
POST /api/jobs/cme123456/bookmark
```

**Body:** None

### DELETE `/api/jobs/:id/bookmark`

Remove a bookmark.

Example:

``` text
DELETE /api/jobs/cme123456/bookmark
```

**Body:** None

------------------------------------------------------------------------

# 13. Job Applications

### POST `/api/jobs/applications`

Create an application record.

**Body**

``` json
{
  "jobId": "JOB_ID",
  "status": "Applied",
  "appliedAt": "2026-08-21T10:00:00.000Z",
  "notes": "Applied through company website."
}
```

`status`:

``` text
Applied
Interview
Offer
Rejected
Withdrawn
```

### GET `/api/jobs/applications/:jobId`

Get application information for a job.

Example:

``` text
GET /api/jobs/applications/JOB_ID
```

------------------------------------------------------------------------

# 14. User Preferences

Base path:

``` text
/api/preferences
```

All three require Bearer JWT.

### GET `/api/preferences`

Get preferences.

### POST `/api/preferences`

Create preferences.

**Body**

``` json
{
  "jobRole": "Full Stack Developer",
  "location": "Mumbai",
  "workMode": "Hybrid",
  "jobType": "Full-time",
  "salary": "₹8-12 LPA"
}
```

### PATCH `/api/preferences`

Update preferences.

**Body**

``` json
{
  "jobRole": "Backend Developer",
  "location": "Mumbai",
  "workMode": "Remote",
  "jobType": "Full-time",
  "salary": "₹10-15 LPA"
}
```

------------------------------------------------------------------------

# 15. User Settings

Base path:

``` text
/users/settings
```

All three require Bearer JWT.

### GET `/users/settings`

Get user settings.

### POST `/users/settings`

Create user settings.

**Body**

``` json
{
  "emailNotifications": true,
  "jobAlerts": true,
  "applicationUpdates": true
}
```

### PATCH `/users/settings`

Update user settings.

**Body**

``` json
{
  "emailNotifications": true,
  "jobAlerts": false,
  "applicationUpdates": true
}
```

------------------------------------------------------------------------

# 16. Common Headers

For JSON requests:

``` text
Content-Type: application/json
```

For authenticated endpoints:

``` text
Authorization: Bearer YOUR_JWT_TOKEN
```

------------------------------------------------------------------------

# 17. Endpoint Summary

  ------------------------------------------------------------------------------------------------
                     \# Method           Endpoint                                 Purpose
  --------------------- ---------------- ---------------------------------------- ----------------
                      1 POST             `/auth/register`                         Register

                      2 POST             `/auth/login`                            Login

                      3 GET              `/auth/me`                               Current user

                      4 GET              `/users/profile`                         Get profile

                      5 PATCH            `/users/profile`                         Update profile

                      6 DELETE           `/users/profile`                         Delete profile

                      7 POST             `/resume`                                Create resume

                      8 GET              `/resume`                                Get resume

                      9 PATCH            `/resume`                                Update resume

                     10 DELETE           `/resume`                                Delete resume

                     11 POST             `/jobs`                                  Create job

                     12 GET              `/jobs`                                  Get jobs

                     13 GET              `/jobs/:id`                              Get job

                     14 PATCH            `/jobs/:id`                              Update job

                     15 DELETE           `/jobs/:id`                              Delete job

                     16 POST             `/api/resume/analyze`                    Resume analysis

                     17 POST             `/api/resume/ats`                        ATS score

                     18 POST             `/api/resume/skill-gap`                  Skill gap

                     19 POST             `/api/resume/tailor`                     Resume tailoring

                     20 POST             `/api/resume/job-match`                  Resume ↔ Job
                                                                                  match

                     21 POST             `/api/resume/ai-verdict`                 AI verdict

                     22 POST             `/api/resume/interview-probability`      Interview
                                                                                  probability

                     23 POST             `/api/application/cover-letter`          Cover letter

                     24 POST             `/api/application/application-message`   Application
                                                                                  message

                     25 POST             `/api/application/application-answer`    Application
                                                                                  answer

                     26 POST             `/api/interview/prepare`                 Interview
                                                                                  preparation

                     27 POST             `/api/interview/job-summary`             Job summary

                     28 POST             `/api/interview/company-insight`         Company insights

                     29 POST             `/api/career/coach`                      Career coach

                     30 POST             `/api/career/roadmap`                    Career roadmap

                     31 POST             `/api/career/learning-path`              Learning path

                     32 POST             `/api/jobs/aggregate`                    Aggregate jobs

                     33 GET              `/api/jobs/search`                       Search jobs

                     34 POST             `/api/jobs/match`                        Match jobs

                     35 POST             `/api/jobs/:id/bookmark`                 Bookmark job

                     36 DELETE           `/api/jobs/:id/bookmark`                 Remove bookmark

                     37 POST             `/api/jobs/applications`                 Create
                                                                                  application

                     38 GET              `/api/jobs/applications/:jobId`          Get application

                     39 GET              `/api/preferences`                       Get preferences

                     40 POST             `/api/preferences`                       Create
                                                                                  preferences

                     41 PATCH            `/api/preferences`                       Update
                                                                                  preferences

                     42 GET              `/users/settings`                        Get settings

                     43 POST             `/users/settings`                        Create settings

                     44 PATCH            `/users/settings`                        Update settings
  ------------------------------------------------------------------------------------------------

**Total: 44 endpoints.**

------------------------------------------------------------------------

## Important Implementation Note

Based on the route files reviewed, authentication middleware is
explicitly attached to:

-   `/auth/me`
-   `/users/profile`
-   `/resume`
-   `/api/preferences`
-   `/users/settings`

The other route files currently shown do **not** attach `authMiddleware`
themselves. If these endpoints are intended to be private,
authentication should be added before production deployment.

Also, the uploaded project snapshot predates the latest AI Verdict and
Interview Probability route changes, so those two endpoints are
documented from the latest code shared in the conversation.
