const { FRONTEND_URL } = require("../config/env");

const BASE_URL = FRONTEND_URL || "http://localhost:5173";

// ─────────────────────────────────────────────────────────────
// Shared layout wrapper
// ─────────────────────────────────────────────────────────────

const layout = (content) => `
  <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;color:#1f2937">
    <div style="margin-bottom:24px">
      <h2 style="color:#4f46e5;margin:0;font-size:22px">PlacementOS</h2>
      <p style="color:#6b7280;margin:2px 0 0;font-size:12px">Placement Management System</p>
    </div>

    ${content}

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0" />
    <p style="color:#9ca3af;font-size:11px;margin:0">
      This is an automated email from PlacementOS. Please do not reply to this email.<br/>
      © ${new Date().getFullYear()} PlacementOS. All rights reserved.
    </p>
  </div>
`;

const ctaButton = (text, href) => `
  <a href="${href}"
     style="display:inline-block;background:#4f46e5;color:#ffffff;padding:11px 24px;
            border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;
            margin-top:16px">
    ${text}
  </a>
`;

const infoBox = (content, color = "#4f46e5") => `
  <div style="background:#f9fafb;border-radius:10px;padding:18px 20px;
              margin:18px 0;border-left:4px solid ${color}">
    ${content}
  </div>
`;

const warningBox = (content) => `
  <div style="background:#fef3c7;border-radius:8px;padding:12px 16px;margin:16px 0">
    <p style="margin:0;font-size:13px;color:#92400e">${content}</p>
  </div>
`;

// ─────────────────────────────────────────────────────────────
// 1. Welcome email  (sent after email verification)
// ─────────────────────────────────────────────────────────────

const welcomeEmail = ({ name, role }) => ({
  subject: "Welcome to PlacementOS 🎉",
  html: layout(`
    <h3 style="margin:0 0 8px">Welcome aboard, ${name}!</h3>
    <p style="color:#4b5563;line-height:1.6">
      Your account has been verified and you're all set to use PlacementOS.
    </p>

    ${infoBox(`
      <p style="margin:0;font-size:14px">
        You're registered as a <strong style="text-transform:capitalize">${role}</strong>.
        ${
          role === "student"
            ? "You can now browse drives, apply to companies, and track your placement journey."
            : role === "recruiter"
              ? "Complete your profile and get verified by the TPO to manage placement drives."
              : "Log in to the dashboard to get started."
        }
      </p>
    `)}

    ${ctaButton("Go to Dashboard", `${BASE_URL}/dashboard`)}
  `),
});

// ─────────────────────────────────────────────────────────────
// 2. OTP — email verification
// ─────────────────────────────────────────────────────────────

const otpEmail = ({ otp, purpose = "verify" }) => ({
  subject:
    purpose === "reset"
      ? "Reset your PlacementOS password"
      : "Verify your PlacementOS account",
  html: layout(`
    <h3 style="margin:0 0 8px">
      ${purpose === "reset" ? "Password Reset OTP" : "Email Verification OTP"}
    </h3>
    <p style="color:#4b5563">
      ${
        purpose === "reset"
          ? "Use the OTP below to reset your password."
          : "Use the OTP below to verify your email address."
      }
    </p>

    <div style="text-align:center;margin:24px 0">
      <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#4f46e5">
        ${otp}
      </span>
    </div>

    ${warningBox("⏱ This OTP expires in <strong>10 minutes</strong>. Do not share it with anyone.")}
  `),
});

// ─────────────────────────────────────────────────────────────
// 3. Drive opened  (new drive published — sent to eligible students)
// ─────────────────────────────────────────────────────────────

const driveOpenedEmail = ({
  studentName,
  companyName,
  driveTitle,
  ctc,
  deadline,
  driveId,
}) => ({
  subject: `🚀 New Placement Drive: ${companyName}`,
  html: layout(`
    <h3 style="margin:0 0 4px">Hi ${studentName},</h3>
    <p style="color:#4b5563;margin:0 0 16px">A new placement drive has been published.</p>

    ${infoBox(`
      <p style="margin:0 0 10px;font-size:15px;font-weight:600">${companyName}</p>
      <p style="margin:0 0 6px;font-size:14px;color:#374151">📋 Role: <strong>${driveTitle}</strong></p>
      ${ctc ? `<p style="margin:0 0 6px;font-size:14px;color:#374151">💰 CTC: <strong>${ctc} LPA</strong></p>` : ""}
      ${
        deadline
          ? `<p style="margin:0;font-size:14px;color:#374151">
             📅 Application Deadline:
             <strong>${new Date(deadline).toLocaleDateString("en-IN", {
               day: "numeric",
               month: "long",
               year: "numeric",
             })}</strong>
           </p>`
          : ""
      }
    `)}

    <p style="color:#4b5563;font-size:14px">
      Check your eligibility and apply before the deadline closes.
    </p>

    ${ctaButton("View Drive & Apply", `${BASE_URL}/drives/${driveId}`)}
  `),
});

// ─────────────────────────────────────────────────────────────
// 4. Application status changed  (pipeline stage move)
// ─────────────────────────────────────────────────────────────

const STAGE_LABELS = {
  shortlisted: "Shortlisted ✅",
  oa: "Online Assessment Round",
  interview_1: "Interview Round 1",
  interview_2: "Interview Round 2",
  hr: "HR Round",
  offered: "Offer Extended 🎉",
  accepted: "Offer Accepted",
  rejected: "Not Selected",
};

const applicationStatusEmail = ({
  studentName,
  companyName,
  driveTitle,
  newStage,
  note,
}) => {
  const stageLabel = STAGE_LABELS[newStage] || newStage;
  const isPositive = !["rejected"].includes(newStage);
  const accentColor =
    newStage === "rejected"
      ? "#ef4444"
      : newStage === "offered"
        ? "#10b981"
        : "#4f46e5";

  return {
    subject: `Application Update — ${companyName}: ${stageLabel}`,
    html: layout(`
      <h3 style="margin:0 0 4px">Hi ${studentName},</h3>
      <p style="color:#4b5563;margin:0 0 16px">
        Your application status for <strong>${driveTitle}</strong> at
        <strong>${companyName}</strong> has been updated.
      </p>

      ${infoBox(
        `
        <p style="margin:0 0 6px;font-size:13px;color:#6b7280;text-transform:uppercase;
                  letter-spacing:.5px;font-weight:600">New Status</p>
        <p style="margin:0;font-size:18px;font-weight:700;color:${accentColor}">${stageLabel}</p>
        ${note ? `<p style="margin:8px 0 0;font-size:13px;color:#6b7280;font-style:italic">"${note}"</p>` : ""}
      `,
        accentColor,
      )}

      ${
        isPositive
          ? `<p style="color:#4b5563;font-size:14px">Congratulations! Keep an eye on your dashboard for next steps.</p>`
          : `<p style="color:#4b5563;font-size:14px">Thank you for applying. We encourage you to keep applying to other drives.</p>`
      }

      ${ctaButton("View My Applications", `${BASE_URL}/applications`)}
    `),
  };
};

// ─────────────────────────────────────────────────────────────
// 5. OA reminder  (sent before an assessment window opens)
// ─────────────────────────────────────────────────────────────

const oaReminderEmail = ({
  studentName,
  companyName,
  assessmentTitle,
  startsAt,
  endsAt,
  assessmentId,
}) => ({
  subject: `⏰ OA Reminder: ${companyName} — ${assessmentTitle}`,
  html: layout(`
    <h3 style="margin:0 0 4px">Hi ${studentName},</h3>
    <p style="color:#4b5563;margin:0 0 16px">
      Your Online Assessment for <strong>${companyName}</strong> is coming up soon.
    </p>

    ${infoBox(
      `
      <p style="margin:0 0 8px;font-size:15px;font-weight:600">${assessmentTitle}</p>
      <p style="margin:0 0 6px;font-size:14px;color:#374151">
        🏢 Company: <strong>${companyName}</strong>
      </p>
      ${
        startsAt
          ? `<p style="margin:0 0 6px;font-size:14px;color:#374151">
             🕐 Opens: <strong>${new Date(startsAt).toLocaleString("en-IN", {
               weekday: "short",
               day: "numeric",
               month: "short",
               hour: "2-digit",
               minute: "2-digit",
             })}</strong>
           </p>`
          : ""
      }
      ${
        endsAt
          ? `<p style="margin:0;font-size:14px;color:#374151">
             ⏳ Closes: <strong>${new Date(endsAt).toLocaleString("en-IN", {
               weekday: "short",
               day: "numeric",
               month: "short",
               hour: "2-digit",
               minute: "2-digit",
             })}</strong>
           </p>`
          : ""
      }
    `,
      "#f59e0b",
    )}

    ${warningBox(`
      💡 <strong>Tips before you begin:</strong> Use a stable internet connection,
      keep your workspace quiet, and read the instructions carefully before starting.
      The assessment is <strong>timed and proctored</strong>.
    `)}

    ${assessmentId ? ctaButton("Start Assessment", `${BASE_URL}/assessments/${assessmentId}/take`) : ""}
  `),
});

// ─────────────────────────────────────────────────────────────
// 6. Offer released  (offer letter uploaded by recruiter)
// ─────────────────────────────────────────────────────────────

const offerReleasedEmail = ({
  studentName,
  companyName,
  driveTitle,
  deadline,
}) => ({
  subject: `🎉 Offer Letter Released — ${companyName}`,
  html: layout(`
    <h3 style="margin:0 0 4px">Congratulations, ${studentName}! 🎉</h3>
    <p style="color:#4b5563;margin:0 0 16px">
      Your offer letter from <strong>${companyName}</strong> is ready for review.
    </p>

    ${infoBox(
      `
      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#10b981">Offer Extended!</p>
      <p style="margin:0 0 6px;font-size:14px;color:#374151">
        💼 Company: <strong>${companyName}</strong>
      </p>
      <p style="margin:0 0 6px;font-size:14px;color:#374151">
        📋 Drive: <strong>${driveTitle}</strong>
      </p>
      ${
        deadline
          ? `<p style="margin:0;font-size:14px;color:#ef4444;font-weight:600">
             ⚠ Respond by: ${new Date(deadline).toLocaleDateString("en-IN", {
               day: "numeric",
               month: "long",
               year: "numeric",
             })}
           </p>`
          : ""
      }
    `,
      "#10b981",
    )}

    <p style="color:#4b5563;font-size:14px">
      Please review your offer letter and accept or decline before the deadline.
    </p>

    ${ctaButton("View Offer Letter", `${BASE_URL}/applications`)}
  `),
});

// ─────────────────────────────────────────────────────────────
// 7. Result declared  (drive completed, final results out)
// ─────────────────────────────────────────────────────────────

const resultDeclaredEmail = ({
  studentName,
  companyName,
  driveTitle,
  placed,
}) => ({
  subject: `📢 Results Declared — ${companyName} Drive`,
  html: layout(`
    <h3 style="margin:0 0 4px">Hi ${studentName},</h3>
    <p style="color:#4b5563;margin:0 0 16px">
      The results for the <strong>${companyName}</strong> placement drive have been declared.
    </p>

    ${
      placed
        ? infoBox(
            `
          <p style="margin:0;font-size:15px;font-weight:700;color:#10b981">
            🎉 Congratulations! You have been placed at ${companyName}.
          </p>
          <p style="margin:8px 0 0;font-size:14px;color:#374151">
            Drive: <strong>${driveTitle}</strong>
          </p>
        `,
            "#10b981",
          )
        : infoBox(
            `
          <p style="margin:0;font-size:14px;color:#374151">
            Thank you for participating in the <strong>${driveTitle}</strong> drive at
            <strong>${companyName}</strong>. Unfortunately, you were not selected this time.
          </p>
          <p style="margin:8px 0 0;font-size:13px;color:#6b7280">
            Don't be discouraged — keep applying to other drives. Your next opportunity is just around the corner!
          </p>
        `,
            "#6b7280",
          )
    }

    ${ctaButton("View My Applications", `${BASE_URL}/applications`)}
  `),
});

// ─────────────────────────────────────────────────────────────
// 8. General / announcement
// ─────────────────────────────────────────────────────────────

const generalEmail = ({ recipientName, title, message, link, linkLabel }) => ({
  subject: `PlacementOS — ${title}`,
  html: layout(`
    ${recipientName ? `<h3 style="margin:0 0 12px">Hi ${recipientName},</h3>` : ""}

    ${infoBox(`
      <p style="margin:0 0 6px;font-size:15px;font-weight:600">${title}</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.6">${message}</p>
    `)}

    ${link ? ctaButton(linkLabel || "View Details", `${BASE_URL}${link}`) : ""}
  `),
});

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────

module.exports = {
  welcomeEmail,
  otpEmail,
  driveOpenedEmail,
  applicationStatusEmail,
  oaReminderEmail,
  offerReleasedEmail,
  resultDeclaredEmail,
  generalEmail,
};
