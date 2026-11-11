import type { Application, ApplicationStatus } from "../data/applications";
import { CLOSED_STATUSES, STATUS_LABELS } from "../data/applications";
import { formatDay } from "./format";

/** Today as an ISO date in local time, e.g. "2026-11-12". */
function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

/** How the desk names an application, e.g. "Acme, Frontend Engineer". */
function applicationName(application: Pick<Application, "company" | "jobTitle">): string {
  return [application.company, application.jobTitle].filter((part) => part !== "").join(", ");
}

function isOpen(status: ApplicationStatus): boolean {
  return !CLOSED_STATUSES.includes(status);
}

/** Whether an open application's next step is today or overdue. */
function isDue(application: Pick<Application, "status" | "nextStepOn">, on = today()): boolean {
  return (
    isOpen(application.status) && application.nextStepOn !== "" && application.nextStepOn <= on
  );
}

/** The status as a .desk-status: an offer or a yes is good news, the rest neutral. */
function statusTone(status: ApplicationStatus) {
  return {
    tone: status === "offer" || status === "accepted" ? ("ok" as const) : ("none" as const),
    text: STATUS_LABELS[status],
  };
}

/** The next step as one line, e.g. "Call back · 14 November 2026"; empty if there is none. */
function nextStepText(application: Pick<Application, "status" | "nextStep" | "nextStepOn">) {
  if (!isOpen(application.status)) {
    return "";
  }

  const date = application.nextStepOn === "" ? "" : formatDay(application.nextStepOn, "en");

  return [application.nextStep, date].filter((part) => part !== "").join(" · ");
}

export { applicationName, isDue, isOpen, nextStepText, statusTone, today };
