/**
 * Sends LinkedIn's job alert mails to a "LinkedIn job alert mails" collector
 * in the desk (/desk/collectors). A Google Apps Script: paste it into a project
 * at script.google.com, signed in to the Gmail account that gets the alerts.
 *
 * Project Settings → Script Properties:
 *   DESK_ENDPOINT  the collector's address, e.g. https://christophstach.de/api/collectors/linkedin-alerts
 *   DESK_SECRET    the collector's secret, shown once when it's made
 *
 * Run `install` once: it allows the script into Gmail and runs `collect` every
 * hour. A sent mail gets the label desk/collected and isn't sent again; a mail
 * the desk turns away stays unlabelled and goes again next hour.
 */

const SEARCH = "from:jobalerts-noreply@linkedin.com -label:desk/collected newer_than:14d";
const LABEL = "desk/collected";
// One run sends at most this many threads, well inside the six-minute limit.
const MAX_THREADS = 20;

function collect() {
  const properties = PropertiesService.getScriptProperties();
  const endpoint = properties.getProperty("DESK_ENDPOINT");
  const secret = properties.getProperty("DESK_SECRET");

  if (!endpoint || !secret) {
    throw new Error("Set DESK_ENDPOINT and DESK_SECRET in the script properties.");
  }

  const label = GmailApp.getUserLabelByName(LABEL) || GmailApp.createLabel(LABEL);

  for (const thread of GmailApp.search(SEARCH, 0, MAX_THREADS)) {
    const messages = thread.getMessages().map((message) => ({
      subject: message.getSubject(),
      plain: message.getPlainBody(),
      // Only the HTML body has each job's workplace and salary.
      html: message.getBody(),
    }));
    const response = UrlFetchApp.fetch(endpoint, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: `Bearer ${secret}` },
      payload: JSON.stringify({ messages }),
      muteHttpExceptions: true,
    });
    const status = response.getResponseCode();

    if (status !== 200) {
      // A bad secret or a paused collector fails every thread alike: stop here.
      throw new Error(`The desk answered ${status}: ${response.getContentText()}`);
    }

    thread.addLabel(label);
    console.log(`${thread.getFirstMessageSubject()}: ${response.getContentText()}`);
  }
}

function install() {
  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (trigger.getHandlerFunction() === "collect") {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  ScriptApp.newTrigger("collect").timeBased().everyHours(1).create();
  collect();
}
