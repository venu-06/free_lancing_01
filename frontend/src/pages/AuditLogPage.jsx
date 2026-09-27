import React from 'react';
import { Empty } from '../components/UI.jsx';
import { idOf, shortDateTime } from '../lib/format.js';

export default function AuditLogPage({ entries }) {
  return <section className="panel records-panel audit-panel"><div className="panel-head"><div><div className="panel-title">Change audit log</div><div className="panel-subtitle">Category edits and payment changes, newest first</div></div><span className="report-total">{entries.length} events</span></div><div className="audit-list">{entries.map(entry => <article className="audit-entry" key={idOf(entry)}><div className="audit-dot"/><div className="audit-copy"><div><b>{entry.action} · {entry.entityLabel}</b><span>{shortDateTime(entry.createdAt)}</span></div><p>{entry.details}</p><small>{entry.projectName} · {entry.entityType} · {entry.actor}</small></div></article>)}{entries.length === 0 && <Empty title="No changes logged yet" detail="Category and payment changes will appear here."/>}</div></section>;
}
