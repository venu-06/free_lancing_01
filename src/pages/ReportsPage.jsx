import React from 'react';
import { Empty } from '../components/UI.jsx';
import { idOf, money } from '../lib/format.js';

export default function ReportsPage({ all, totalDue, onOpenProject }) {
  const outstanding = all.filter(row => row.balance > 0);
  return <section className="panel records-panel"><div className="panel-head"><div><div className="panel-title">Outstanding payments</div><div className="panel-subtitle">Current agreed amount minus recorded payments</div></div><strong className="report-total">{money(totalDue)} outstanding</strong></div><div className="record-table"><div className="record-heading"><span>PROJECT / CATEGORY</span><span>PERSON OR COMPANY</span><span>AGREED</span><span>PAID</span><span>BALANCE</span></div>{outstanding.map(row => <div className="record-row" key={idOf(row.category)}><button className="record-link" onClick={() => onOpenProject(row.project)}><b>{row.category.name}</b><span>{row.project.name}</span></button><div><b>{row.category.vendor}</b><span>{row.category.phone || 'No phone number'}</span></div><b>{money(row.category.agreedAmount)}</b><b>{money(row.paid)}</b><b className="due-text">{money(row.balance)}</b></div>)}{outstanding.length === 0 && <Empty title="No outstanding payments" detail="All category balances are paid in full."/>}</div></section>;
}
