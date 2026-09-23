"use client";

import Link from "next/link";
import { useState } from "react";

import { AiEmptyState, AiLoadingState, AiToolPanel } from "@/components/ai-tool-panel";
import { useAiAction, useResumeText } from "@/lib/use-ai";
import type { ApplicationMessageResult } from "@/lib/types";

import "./message.css";

type MessageTypeId = "recruiter" | "linkedin" | "follow-up";

const MESSAGE_PLATFORM: Record<MessageTypeId, string> = {
  recruiter: "email",
  linkedin: "linkedin",
  "follow-up": "email",
};

const messageTypes: {
  id: MessageTypeId;
  title: string;
  description: string;
}[] = [
  {
    id: "recruiter",
    title: "Recruiter Message",
    description: "Short message to introduce yourself to a recruiter.",
  },
  {
    id: "linkedin",
    title: "LinkedIn Message",
    description: "Professional connection message for LinkedIn.",
  },
  {
    id: "follow-up",
    title: "Application Follow-up",
    description: "Follow up after submitting your application.",
  },
];

export default function ApplicationMessagePage() {
  const resume = useResumeText();
  const [jobDescription, setJobDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [selectedType, setSelectedType] = useState<MessageTypeId>("recruiter");
  const [copied, setCopied] = useState(false);

  const action = useAiAction<ApplicationMessageResult>();

  const canRun =
    resume.text.trim().length > 0 &&
    jobDescription.trim().length > 0 &&
    !action.loading;

  const result = action.data;

  const submit = () =>
    action.run("/api/application/application-message", {
      resume: resume.text,
      jobDescription,
      companyName,
      jobTitle,
      candidateName,
      platform: MESSAGE_PLATFORM[selectedType],
    });

  const copyMessage = async () => {
    if (!result) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        `${result.subject}\n\n${result.message}`
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="feature-page application-message-page">
      <div className="feature-container">
        <header className="feature-header">
          <div>
            <Link href="/dashboard" className="back-link">
              ← Dashboard
            </Link>

            <p className="feature-eyebrow">AI APPLICATION TOOLS</p>

            <h1>Application Message</h1>

            <p className="feature-description">
              Create short, personalized messages for recruiters, hiring
              managers, and professional connections.
            </p>
          </div>

          <Link
            href="/features/applications/answers"
            className="secondary-button"
          >
            Application Answers
          </Link>
        </header>

        <AiToolPanel
          eyebrow="MESSAGE DETAILS"
          title="Generate your message"
          description="Choose a purpose, add the job details, and AI will write a concise message."
          fields={[
            {
              id: "resume",
              label: "Resume",
              value: resume.text,
              onChange: resume.setText,
              rows: 7,
              placeholder: "Paste your resume text here…",
              hint: resume.loading
                ? "Loading your saved resume…"
                : resume.hasResume
                  ? "Prefilled from your saved resume."
                  : "Paste your resume to get started.",
            },
            {
              id: "jobDescription",
              label: "Job Description",
              value: jobDescription,
              onChange: setJobDescription,
              rows: 7,
              placeholder: "Paste the job description here…",
            },
            {
              id: "companyName",
              label: "Company Name",
              value: companyName,
              onChange: setCompanyName,
              placeholder: "e.g. TechNova",
              singleLine: true,
            },
            {
              id: "jobTitle",
              label: "Job Title",
              value: jobTitle,
              onChange: setJobTitle,
              placeholder: "e.g. Full Stack Developer",
              singleLine: true,
            },
            {
              id: "candidateName",
              label: "Your Name",
              value: candidateName,
              onChange: setCandidateName,
              placeholder: "e.g. Alex Johnson",
              singleLine: true,
            },
          ]}
          submitLabel="Generate Message"
          onSubmit={submit}
          loading={action.loading}
          disabled={!canRun}
          error={action.error}
        >
          <div className="form-group">
            <span className="ai-field-label">Message Purpose</span>

            <div className="message-type-grid">
              {messageTypes.map((type) => (
                <button
                  type="button"
                  key={type.id}
                  className={`message-type-card ${
                    selectedType === type.id ? "active" : ""
                  }`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <span className="type-radio">
                    {selectedType === type.id ? "✓" : ""}
                  </span>

                  <strong>{type.title}</strong>

                  <p>{type.description}</p>
                </button>
              ))}
            </div>
          </div>
        </AiToolPanel>

        {action.loading ? (
          <AiLoadingState label="Writing your message…" />
        ) : null}

        {!action.loading && !result ? (
          <AiEmptyState
            title="No message yet"
            description="Fill in the job details and generate a message tailored to your outreach."
          />
        ) : null}

        {result ? (
          <section className="generated-message-card">
            <div className="generated-header">
              <div>
                <p className="card-label">GENERATED MESSAGE</p>

                <h2>{result.subject}</h2>
              </div>

              <button
                type="button"
                className="copy-button"
                onClick={copyMessage}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="message-preview">
              <div className="message-avatar">
                {selectedType === "linkedin" ? "in" : "✉"}
              </div>

              <div className="message-bubble">
                {result.message.split("\n").map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>

            <div className="generated-footer">
              <span>Concise · Professional · Personalized</span>

              <button
                type="button"
                className="secondary-button"
                onClick={submit}
                disabled={action.loading}
              >
                Regenerate
              </button>
            </div>
          </section>
        ) : null}

        <section className="message-tips">
          <div className="tips-icon">✦</div>

          <div>
            <p className="card-label">AI TIP</p>

            <h2>Keep outreach short and relevant</h2>

            <p>
              Recruiters receive many messages every day. Mention the role,
              show why you are relevant, and make the message easy to respond
              to.
            </p>
          </div>
        </section>

        <section className="message-action">
          <div>
            <p className="card-label">NEXT STEP</p>

            <h2>Ready to apply?</h2>

            <p>
              Review your resume, application answers, and message before
              submitting your application.
            </p>
          </div>

          <div className="action-buttons">
            <Link
              href="/features/applications/answers"
              className="secondary-button"
            >
              Review Answers
            </Link>

            <Link
              href="/features/applications/cover-letter"
              className="primary-button"
            >
              Cover Letter
              <span>→</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
