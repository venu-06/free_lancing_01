import React from 'react';
import { Empty, Icon } from '../components/UI.jsx';
import { idOf, isToday, money, paidOf, shortDateTime } from '../lib/format.js';

function eventsFor(projects) {
  return projects.flatMap(project => (project.categories || []).flatMap(category => (category.payments || []).filter(payment => isToday(payment.createdAt || payment.date)).map(payment => ({ project, category, payment, happenedAt: payment.createdAt || payment.date })))).sort((a, b) => new Date(b.happenedAt) - new Date(a.happenedAt));
}
export default function CategoriesVendorsPage({ projects, onSendPlaceholder, onOpenProject }) {
  const events = eventsFor(projects);
  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  return <section className="panel records-panel today-panel"><div className="panel-head"><div><div className="panel-title">Today’s changes</div><div className="panel-subtitle">{dateLabel} · Payments recorded today</div></div></div><div className="today-change-list">{events.map(({ project, category, payment, happenedAt }, index) => { const paid = paidOf(category); const balance = Number(category.agreedAmount || 0) - paid; return <article className="today-change" key={`${idOf(project)}-${idOf(category)}-${idOf(payment) || index}`}><div className="today-change-icon payment-change-icon"><Icon name="card" size={17}/></div><div className="today-change-copy"><div className="today-change-title"><b>Payment recorded</b><span>{shortDateTime(happenedAt)}</span></div><div className="today-change-vendor">{category.vendor} <i>·</i> {category.name}</div><p>{money(payment.amount)} · {payment.method || 'Payment'}{payment.reference ? ` · Ref ${payment.reference}` : ''}</p><button className="today-project-link" onClick={() => onOpenProject(project)}>{project.name} <Icon name="arrow" size={12}/></button><div className="today-change-totals"><span>Total paid <b>{money(paid)}</b></span><span>Balance <b className={balance > 0 ? 'due-text' : 'paid-text'}>{money(balance)}</b></span></div></div><button className="whatsapp-send-placeholder" onClick={onSendPlaceholder}>Send WhatsApp</button></article>; })}{events.length === 0 && <Empty title="No payments recorded today" detail="Payments saved today will appear here."/>}</div></section>;
}
