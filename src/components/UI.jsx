import React from 'react';
import { idOf, money, paidOf, shortDate } from '../lib/format.js';

export function Icon({ name, size = 18 }) {
  const shapes = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    building: <><path d="M3 21h18M5 21V7l8-4 6 4v14M9 9h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1M11 21v-4h3v4"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-7.8a4 4 0 0 1 0 7.6M20 21v-2a4 4 0 0 0-3-3.87"/></>,
    chart: <><path d="M3 3v18h18M18 17V9m-5 8V5M8 17v-4"/></>,
    plus: <path d="M12 5v14m-7-7h14"/>, search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4"/></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10"/></>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    card: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3"/></>,
    close: <path d="m18 6-12 12M6 6l12 12"/>, edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{shapes[name] || shapes.grid}</svg>;
}

export function Stat({ title, value, detail, icon, tone }) { return <div className="stat-card"><div className="stat-top"><span>{title}</span><span className={`stat-icon ${tone}`}><Icon name={icon} size={17}/></span></div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>; }
export function Empty({ title, detail }) { return <div className="empty-state"><b>{title}</b><span>{detail}</span></div>; }
export function ProjectCard({ project, onClick, onDelete }) { const categories = project.categories || []; const agreed = categories.reduce((sum, category) => sum + Number(category.agreedAmount || 0), 0); const paid = categories.reduce((sum, category) => sum + paidOf(category), 0); return <article className="project-card-shell"><button className="project-card" onClick={onClick}><div className="project-card-top"><div className="health-icon health-0"><Icon name="building"/></div><span className={`status status-${(project.status || 'In progress').toLowerCase().replace(' ', '-')}`}>{project.status || 'In progress'}</span></div><b>{project.name}</b><span className="project-card-location">{project.location || 'Location not set'}</span><div className="progress-track"><i style={{ width: `${agreed ? Math.min(100, paid / agreed * 100) : 0}%` }}/></div><div className="health-foot"><span>{categories.length} categories · {money(paid)} paid</span><span>{agreed ? Math.round(paid / agreed * 100) : 0}%</span></div></button>{onDelete && <button className="delete-project-button" onClick={event => { event.stopPropagation(); onDelete(project); }}>Delete project</button>}</article>; }
export function TransactionList({ transactions }) { return <div className="transaction-table"><div className="table-header"><span>VENDOR</span><span>PROJECT / CATEGORY</span><span>DATE</span><span>AMOUNT</span></div>{transactions.map((payment, i) => <div className="transaction-row" key={idOf(payment)}><div className="vendor-cell"><div className={`vendor-avatar va-${i % 5}`}>{payment.category.vendor.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase()}</div><div><b>{payment.category.vendor}</b><span>{payment.method || 'Payment'}</span></div></div><div className="project-cell"><b>{payment.project.name}</b><span>{payment.category.name}</span></div><div className="date-cell">{shortDate(payment.date)}</div><div className="amount-cell">{money(payment.amount)}</div></div>)}{transactions.length === 0 && <div className="empty">No payments recorded yet.</div>}</div>; }
