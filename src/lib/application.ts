import type { Application, ApplicationStatus } from "../data/applications";
import { STATUS_LABELS } from "../data/applications";
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

/** Whether an application's next step is today or overdue. */
function isDue(application: Pick<Application, "nextStepOn">, on = today()): boolean {
  return application.nextStepOn !== "" && application.nextStepOn <= on;
}

/** The status as a .desk-status: sent is done (green), preparing is neutral. */
function statusTone(status: ApplicationStatus) {
  return {
    tone: status === "applied" ? ("ok" as const) : ("none" as const),
    text: STATUS_LABELS[status],
  };
}

/** The next step as one line, e.g. "Call back · 14 November 2026"; empty if there is none. */
function nextStepText(application: Pick<Application, "nextStep" | "nextStepOn">) {
  const date = application.nextStepOn === "" ? "" : formatDay(application.nextStepOn, "en");

  return [application.nextStep, date].filter((part) => part !== "").join(" · ");
}

export { applicationName, isDue, nextStepText, statusTone, today };
