/**
 * The operator's summary behind `GET /v1/stats`. server.mjs runs this file as a worker thread with its own
 * read-only connection: the JSON-expanding queries read every day record of the last 30 days, and on the
 * request thread they would hold up every report for that long.
 */
import { DatabaseSync } from 'node:sqlite';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';

/** A `models` entry's endpoint: a built-in service by its id, any other as `custom-remote via <module>` / `custom-local via <module>`. */
const VENDOR_LABEL = `CASE WHEN vendor LIKE 'kind:%' THEN endpoint_kind || ' via ' || substr(vendor, 6) ELSE vendor END`;

/** Retention by first date: how many of each cohort were active on day N after it (N = 1, 7, 30); a cohort younger than N days has 0 there. */
export function stats(db) {
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const active = (days) => all(`
    SELECT COUNT(DISTINCT install_id) AS n FROM days
    WHERE interacted_minutes > 0 AND date >= date('now', ?)`, `-${days - 1} days`)[0].n;
  const retention = (on) => all(`
    SELECT i.first_date AS cohort, CAST(julianday('now') - julianday(i.first_date) AS INTEGER) AS ageDays, COUNT(*) AS installs,
      ${[1, 7, 30].map((n) => `SUM(EXISTS (SELECT 1 FROM days d INDEXED BY days_by_install WHERE d.install_id = i.install_id AND d.${on} > 0 AND d.date = date(i.first_date, '+${n} days'))) AS d${n}`).join(', ')}
    FROM installs i WHERE i.first_date >= date('now', '-90 days')
    GROUP BY i.first_date ORDER BY i.first_date`);
  return {
    generatedAt: new Date().toISOString(),
    installs: all(`SELECT COUNT(*) AS total, SUM(uninstalled_at IS NOT NULL) AS uninstalled, SUM(telemetry_off_at IS NOT NULL) AS telemetryOff FROM installs`)[0],
    activeInteracted: { day: active(1), week: active(7), month: active(30) },
    newPerDay: all(`SELECT first_date AS date, COUNT(*) AS n FROM installs WHERE first_date >= date('now', '-60 days') GROUP BY first_date ORDER BY first_date`),
    dailyActive: all(`
      SELECT date, SUM(running_minutes > 0) AS opened, SUM(interacted_minutes > 0) AS interacted,
        SUM(messages) AS messages, SUM(interacted_minutes) AS interactedMinutes
      FROM days WHERE date >= date('now', '-60 days') GROUP BY date ORDER BY date`),
    retentionInteracted: retention('interacted_minutes'),
    retentionOpened: retention('running_minutes'),
    sources: all(`SELECT COALESCE(source, 'unanswered') AS source, COUNT(*) AS n FROM installs GROUP BY 1 ORDER BY n DESC`),
    versions: all(`SELECT version, COUNT(*) AS n FROM installs WHERE last_seen >= datetime('now', '-14 days') GROUP BY version ORDER BY n DESC`),
    platforms: all(`SELECT os, arch, COUNT(*) AS n FROM installs GROUP BY os, arch ORDER BY n DESC`),
    // 0.1.10 counts every failed try in `failed`, retries and cut-off tries included, and sends no `aborted` or `failedStatus`
    models: all(`
      SELECT ${VENDOR_LABEL} AS vendor, model,
        COUNT(DISTINCT install_id) AS installs, SUM(calls) AS calls, SUM(failed) AS failed, SUM(aborted) AS aborted,
        SUM(tokens_in) AS tokensIn, SUM(tokens_cached) AS tokensCached, SUM(tokens_out) AS tokensOut
      FROM day_models WHERE date >= date('now', '-30 days')
      GROUP BY 1, model ORDER BY installs DESC LIMIT 50`),
    failures: all(`
      SELECT ${VENDOR_LABEL} AS vendor, model, s.key AS status, COUNT(DISTINCT install_id) AS installs, SUM(s.value) AS failed
      FROM day_models, json_each(failed_status) s WHERE date >= date('now', '-30 days')
      GROUP BY 1, model, status ORDER BY failed DESC LIMIT 50`),
    crashes: all(`
      SELECT json_extract(data, '$.where') AS "where", json_extract(data, '$.error') AS error, json_extract(data, '$.code') AS code,
        json_extract(data, '$.frames[0]') AS frame, json_extract(data, '$.exitCode') AS exitCode,
        COUNT(DISTINCT install_id) AS installs, COUNT(*) AS n, MAX(ts) AS last
      FROM events WHERE type = 'crash' AND ts >= date('now', '-30 days')
      GROUP BY 1, 2, 3, 4, 5 ORDER BY n DESC LIMIT 50`),
    extensions: all(`
      SELECT name, COUNT(DISTINCT install_id) AS installs FROM day_extensions WHERE date >= date('now', '-30 days')
      GROUP BY name ORDER BY installs DESC LIMIT 50`),
  };
}

if (!isMainThread) {
  const db = new DatabaseSync(workerData.dbFile, { readOnly: true });
  try {
    parentPort.postMessage(stats(db));
  } finally {
    db.close();
  }
}
