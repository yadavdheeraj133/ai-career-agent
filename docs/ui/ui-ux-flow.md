# AI Career Agent — UI/UX Workflow

> Status: **Locked**
>
> This document defines the current locked UI/UX structure and navigation flow of the AI Career Agent frontend.

# URLs

http://localhost:3000/auth/login
http://localhost:3000/auth/register
http://localhost:3000/auth/forgot-password
http://localhost:3000/skill
http://localhost:3000/dashboard
http://localhost:3000/features/resume/analysis
http://localhost:3000/features/resume/ats
http://localhost:3000/features/resume/skill-gap
http://localhost:3000/features/resume/tailor
http://localhost:3000/features/resume/job-match
http://localhost:3000/features/ai-tools/verdict
http://localhost:3000/features/ai-tools/interview-probability
http://localhost:3000/features/ai-tools/missing-skills
http://localhost:3000/features/ai-tools/job-summary
http://localhost:3000/features/ai-tools/company-insights
http://localhost:3000/features/applications/cover-letter
http://localhost:3000/features/applications/answers
http://localhost:3000/features/applications/message
http://localhost:3000/features/interview
http://localhost:3000/features/career/coach
http://localhost:3000/features/career/roadmap
http://localhost:3000/features/career/learning-path
http://localhost:3000/setting
http://localhost:3000/setting/appearance
http://localhost:3000/setting/preferences
http://localhost:3000/setting/ai
http://localhost:3000/setting/jobs
http://localhost:3000/setting/notifications
http://localhost:3000/setting/security

# 1. Product Overview

AI Career Agent helps users understand their career profile, discover relevant jobs, analyze their compatibility with a job, improve their resume, prepare applications, and prepare for interviews.

The application is divided into four major UI parts:

1. Authentication
2. Current Skills
3. Dashboard
4. Job Workspace

---

# 2. Overall User Workflow

```text
                         AI CAREER AGENT
                                │
                    ┌───────────┴───────────┐
                    │                       │
                 NEW USER              EXISTING USER
                    │                       │
                    ▼                       ▼
              REGISTER                    LOGIN
                    │                       │
          ┌─────────┴─────────┐            │
          │                   │            │
       LinkedIn             Manual         │
          │                (Optional)       │
          └─────────┬─────────┘            │
                    │                       │
                    ▼                       │
              RESUME UPLOAD                │
                    │                       │
                    ▼                       │
                ATS CHECK                  │
                    │                       │
             ┌──────┴──────┐               │
             │             │               │
           >=85%          <85%             │
             │             │               │
             │       IMPROVE RESUME        │
             │             │               │
             │       RE-CHECK ATS          │
             │             │               │
             └──────┬──────┘               │
                    ▼                       │
             CURRENT SKILLS                 │
                    │                       │
                    └──────────┬────────────┘
                               ▼
                          DASHBOARD
                               │
                               ▼
                           FIND JOBS
                               │
                               ▼
                           JOB LIST
                               │
                               ▼
                         SELECT JOB
                               │
                               ▼
                        JOB WORKSPACE
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
               JOB ANALYSIS            APPLY
                    │
        ┌───────────┼────────────┐
        ▼           ▼            ▼
       ATS      RESUME MATCH   SKILL GAP
        │           │            │
        └───────────┼────────────┘
                    ▼
                AI VERDICT
                    │
                    ▼
          INTERVIEW PROBABILITY
                    │
                    ▼
                 ACTIONS
                    │
       ┌────────────┼─────────────┐
       ▼            ▼             ▼
   RESUME        COVER LETTER   INTERVIEW
    TAILOR                       PREPARATION


. Part 1 — Authentication
3.1 Login

Existing users can log in using:

Email / Username
Password
Login UI
┌──────────────────────────────────┐
│         AI Career Agent          │
│                                  │
│ Email / Username                 │
│ [____________________________]   │
│                                  │
│ Password                         │
│ [____________________________]   │
│                                  │
│        Forgot Password?          │
│                                  │
│ [            Login             ] │
│                                  │
│ Don't have an account?           │
│ [          Register            ] │
└──────────────────────────────────┘
Login Flow
Login
  ↓
Email / Username + Password
  ↓
Authentication
  ↓
Dashboard
3.2 Registration

Registration provides two options:

Continue with LinkedIn
Manual Registration — optional
Registration UI
┌──────────────────────────────────┐
│          Create Account          │
│                                  │
│ [ Continue with LinkedIn ]       │
│                                  │
│              OR                  │
│                                  │
│ [ Register Manually ]            │
│                                  │
│ ───────────────────────────────  │
│                                  │
│       Upload Your Resume         │
│                                  │
│ [       Upload Resume          ] │
└──────────────────────────────────┘

Manual registration is optional.

LinkedIn registration provides the primary quick-registration path.

3.3 Resume Upload

After registration:

Registration
     ↓
Resume Upload
     ↓
ATS Analysis

The user must pass the ATS requirement before continuing.

ATS Gate
ATS Score >= 85%
        ↓
    Continue
        ↓
 Current Skills

If:

ATS Score < 85%
        ↓
Improve Resume
        ↓
Upload / Analyze Again
3.4 Forgot Password
Forgot Password
      ↓
Enter Email
      ↓
Verification / OTP
      ↓
Create New Password
      ↓
Login
4. Part 2 — Current Skills

The Current Skills section has one purpose:

Collect the skills the user currently has.

It does not contain:

Career preferences
Location
Salary
Job type
Work mode

Those belong to the Career section.

4.1 Current Skills UI
┌──────────────────────────────────────────────┐
│                                              │
│              Your Current Skills             │
│                                              │
│   Tell us what technologies and skills       │
│   you currently know.                        │
│                                              │
│   ┌──────────────────────────────────────┐   │
│   │ Search or add a skill...          +   │   │
│   └──────────────────────────────────────┘   │
│                                              │
│   Suggested                                  │
│   [JavaScript] [React] [Node.js] [Python]   │
│   [Java] [SQL] [TypeScript]                  │
│                                              │
│   Your Skills                                │
│                                              │
│   [ JavaScript × ] [ React × ]              │
│   [ Node.js × ] [ TypeScript × ]            │
│   [ PostgreSQL × ]                           │
│                                              │
│                         [ Continue → ]       │
│                                              │
└──────────────────────────────────────────────┘
Flow
Registration
    ↓
Resume Upload
    ↓
ATS >= 85%
    ↓
Current Skills
    ↓
Dashboard
5. Part 3 — Dashboard

The Dashboard is the user's overall career overview.

It is not the main place for editing career preferences.

5.1 Dashboard Layout
┌───────────────────────────────────────────────────────────────────┐
│ AI Career Agent                         🔔 Notifications Profile │
├───────────────┬───────────────────────────────────────────────────┤
│               │                                                   │
│ 🏠 Dashboard  │ Good morning, User 👋                            │
│               │ Here's your career overview.                     │
│ 💼 Jobs       │                                                   │
│               │ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│ 📄 Resume     │ │ Resume   │ │ Jobs     │ │Applications│          │
│               │ │ ATS: 91  │ │ Saved:12 │ │    8     │           │
│ 🤖 AI Tools   │ └──────────┘ └──────────┘ └──────────┘           │
│               │                                                   │
│ 📋 Applications│ Your Career Profile                             │
│               │ ┌─────────────────────────────────────────────┐ │
│ 🎯 Interview  │ │ Target Role: Full Stack Developer           │ │
│               │ │ Experience: 0–1 years                       │ │
│ 🚀 Career     │ │ Location: Mumbai                            │ │
│               │ │ Work Mode: Remote                           │ │
│ ⚙ Settings   │ │ Skills: React · Node · TypeScript · SQL     │ │
│               │ │                                             │ │
│               │ │ [View Career Profile →]                     │ │
│               │ └─────────────────────────────────────────────┘ │
│               │                                                   │
│               │ Recommended Jobs                                 │
│               │ ┌─────────────────────────────────────────────┐ │
│               │ │ Frontend Developer             96% Match    │ │
│               │ │ Vercel · Remote · Full-time                 │ │
│               │ │ React · TypeScript · Next.js                │ │
│               │ │                       [View Job] [Apply]    │ │
│               │ └─────────────────────────────────────────────┘ │
│               │                                                   │
│               │ Recent Applications                              │
│               │ ┌─────────────────────────────────────────────┐ │
│               │ │ Company       Role             Status        │ │
│               │ │ Vercel        Frontend Dev     Applied       │ │
│               │ │ Company X     Backend Dev      Interview     │ │
│               │ └─────────────────────────────────────────────┘ │
└───────────────┴───────────────────────────────────────────────────┘
5.2 Dashboard Responsibilities

The Dashboard provides:

Resume / ATS overview
Saved jobs overview
Application overview
Career summary
Recommended jobs
Recent applications
Important AI insights
Quick actions

Career preferences are edited from the Career section.

6. Career Profile

The Career section contains the user's career preferences.

Career Profile Fields
What role are you targeting?
[ Full Stack Developer ]


Experience
[ 0–1 years ▼ ]


Preferred Location
[ Mumbai ]


Work Mode
[ Remote ] [ Hybrid ] [ On-site ]


Job Type
[ Full-time ]


Expected Salary
[ ₹ ______ ] per year


[ Save Changes ]
Separation of responsibilities
Dashboard
    ↓
Show career summary


Career
    ↓
Edit career preferences
7. Part 4 — Job Discovery & Job Workspace

The selected-job workflow is the core application experience.

The global sidebar remains unchanged.

A secondary navigation appears only when the user enters a selected job.

7.1 Find Jobs
Jobs
  ↓
Find Jobs
Search / Filter UI
Role
[ Full Stack Developer ]


Location
[ Mumbai ]


Work Mode
[ Remote ]


Job Type
[ Full-time ]


Experience
[ 0–1 years ]


Salary
[ ... ]


[ Find Jobs ]
8. Job List

After the user searches:

Recommended Jobs


┌─────────────────────────────────────────────┐
│ Frontend Developer                          │
│ Vercel                                      │
│ Remote · Full-time                          │
│ React · TypeScript · Next.js                │
│                                             │
│                              96% Match      │
│                                             │
│ [Save]              [View Job →]            │
└─────────────────────────────────────────────┘

Multiple jobs can be displayed.

9. Job Details / Job Workspace

When the user selects a job:

Find Jobs
    ↓
Job List
    ↓
Select Job
    ↓
Job Details

The selected job becomes the active context.

9.1 Job Header
┌──────────────────────────────────────────────────────────────┐
│ Frontend Developer · Vercel                    [Apply Now]  │
│ Remote · Full-time                                          │
├──────────────────────────────────────────────────────────────┤
│ Overview │ ATS │ Resume Match │ Skill Gap │ Verdict │ ... │
└──────────────────────────────────────────────────────────────┘

The secondary navigation is part of the selected-job experience.

It is not a replacement for the global sidebar.

10. Job Secondary Navigation
Overview
ATS
Resume Match
Skill Gap
AI Verdict
Interview Probability

Additional job-specific actions:

Actions
├── Resume Tailor
├── Cover Letter
├── Application Answers
└── Interview Preparation
11. Job Overview

The Overview page provides:

Job title
Company
Location
Work mode
Job type
Job summary
Responsibilities
Required skills
Preferred skills
Salary
Benefits
Tech stack
AI analysis summary

Example:

Frontend Developer
Vercel


Remote · Full-time


[Apply Now]


────────────────────────────


Job Summary


Responsibilities


Required Skills


Preferred Skills


Salary


Benefits


Tech Stack


────────────────────────────


AI Analysis


Resume Match: 92%
ATS Score: 89%
Skill Gap: 84%
AI Verdict: Strong Match
Interview Probability: 78%
12. ATS
Frontend Developer · Vercel                  [Apply Now]


ATS Score


                 89 / 100


Strong ATS compatibility


...


[ View Resume Match → ]

The Apply button remains available from the selected-job header.

13. Resume ↔ Job Match
Frontend Developer · Vercel                  [Apply Now]


Resume ↔ Job Match


                 92%


Matched Skills
✓ React
✓ TypeScript
✓ JavaScript


Partial Match
◐ Next.js


Missing
✕ GraphQL


[ View Skill Gap → ]
14. Skill Gap
Frontend Developer · Vercel                  [Apply Now]


Skill Gap


Existing Skills
━━━━━━━━━━━━━━━━━━ 88%


Critical
🔴 GraphQL


Important
🟡 Next.js
🟡 Testing


Nice to Have
🟢 AWS


[ View AI Verdict → ]
15. AI Verdict
Frontend Developer · Vercel                  [Apply Now]


AI Verdict


🟢 Strong Match


Your profile aligns strongly
with this position.


Reasons:
✓ Strong React experience
✓ Strong TypeScript skills
✓ Good project alignment


Areas to improve:
• Next.js
• Testing


[ Interview Probability → ]
16. Interview Probability
Frontend Developer · Vercel                  [Apply Now]


Interview Probability


                    78%


AI-estimated probability based on
your profile and job requirements.


[ Continue to Application → ]

Interview probability is an AI estimate and should not be presented as a guarantee.

17. Resume Tailoring
Actions
   ↓
Resume Tailor

Flow:

Current Resume
       +
Job Description
       ↓
AI Resume Tailoring
       ↓
Tailored Resume

Actions:

[ Review Changes ]
[ Save as New Resume ]
18. Cover Letter
Actions
   ↓
Cover Letter
Generate Cover Letter


Job: Frontend Developer
Company: Vercel


[ Generate ]


Generated Cover Letter


...


[ Copy ]
[ Regenerate ]
19. Application Answers
Actions
   ↓
Application Answers
Application Questions


Why do you want to work here?


[ Generate Answer ]


...


[ Copy Answer ]
20. Interview Preparation
Actions
   ↓
Interview Preparation
Interview Preparation


Frontend Developer — Vercel


Technical Questions
Behavioral Questions
Company Questions


[ Start Preparation ]
21. Persistent Apply Action

The selected job has one persistent Apply action:

┌──────────────────────────────────────────────┐
│ Frontend Developer · Vercel   [Apply Now]   │
└──────────────────────────────────────────────┘

The Apply action is not repeated inside every AI feature.

Therefore:

ATS
 ↓
Resume Match
 ↓
Skill Gap
 ↓
AI Verdict
 ↓
Interview Probability

The user can apply at any stage.

22. Navigation & Back Behavior

The selected job context should be preserved.

Example:

Find Jobs
   ↓
Job Details
   ↓
ATS
   ↓
Resume Match
   ↓
Skill Gap

Back navigation:

Skill Gap
   ↓ Back
Resume Match
   ↓ Back
ATS
   ↓ Back
Job Details
   ↓ Back
Find Jobs

The user should not have to search for the same job again.

23. Global Sidebar

The global sidebar remains unchanged.

AI Career Agent


🏠 Dashboard


💼 Jobs
   ├── Find Jobs
   ├── Saved Jobs
   └── Job Details


📄 Resume
   ├── My Resume
   ├── Resume Analysis
   ├── ATS Score
   ├── Skill Gap
   ├── Resume Tailor
   └── Resume ↔ Job Match


🤖 AI Tools
   ├── AI Verdict
   ├── Interview Probability
   ├── Cover Letter
   └── Application Answers


📋 Applications
   └── Application Tracker


🎯 Interview
   └── Interview Preparation


🚀 Career
   ├── Career Profile
   ├── Career Coach
   ├── Career Roadmap
   └── Learning Path


⚙️ Settings