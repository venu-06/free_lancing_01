import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import { Project, AuditLog, WorkspaceProfile } from './models.js';

const app = express();
app.use(cors()); app.use(express.json());
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const sumPaid = category => category.payments.reduce((sum, p) => sum + p.amount, 0);
const logChange = data => AuditLog.create({ ...data, actor: 'Workspace owner' });

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'BuildLedger API' }));
app.get('/api/workspace-profile', wrap(async (_req, res) => {
  const profile = await WorkspaceProfile.findById('workspace-profile').lean();
  res.json(profile || { ownerName: '', organizationName: 'Construction workspace', startedYear: null });
}));
app.put('/api/workspace-profile', wrap(async (req, res) => {
  const ownerName = String(req.body.ownerName || '').trim();
  const organizationName = String(req.body.organizationName || '').trim();
  const startedYear = Number(req.body.startedYear);
  if (!ownerName || !organizationName) return res.status(400).json({ message: 'Enter your name and organization name.' });
  if (!Number.isInteger(startedYear) || startedYear < 1800 || startedYear > new Date().getFullYear()) return res.status(400).json({ message: `Enter a valid start year between 1800 and ${new Date().getFullYear()}.` });
  const profile = await WorkspaceProfile.findByIdAndUpdate('workspace-profile', { ownerName, organizationName, startedYear }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
  res.json(profile);
}));
app.get('/api/projects', wrap(async (_req, res) => res.json(await Project.find().sort({ updatedAt: -1 }))));
app.post('/api/projects', wrap(async (req, res) => { const project = await Project.create(req.body); await logChange({ projectId: project._id, projectName: project.name, entityType: 'project', entityId: String(project._id), entityLabel: project.name, action: 'created', details: 'Project created' }); res.status(201).json(project); }));
app.patch('/api/projects/:projectId', wrap(async (req, res) => {
  const project = await Project.findByIdAndUpdate(req.params.projectId, req.body, { new: true, runValidators: true });
  if (!project) return res.status(404).json({ message: 'Project not found' }); res.json(project);
}));
app.delete('/api/projects/:projectId', wrap(async (req, res) => {
  const project = await Project.findById(req.params.projectId); if (!project) return res.status(404).json({ message: 'Project not found' });
  await logChange({ projectId: project._id, projectName: project.name, entityType: 'project', entityId: String(project._id), entityLabel: project.name, action: 'deleted', details: 'Project and all associated categories and payments were deleted' });
  await Project.findByIdAndDelete(req.params.projectId); res.sendStatus(204);
}));
app.post('/api/projects/:projectId/categories', wrap(async (req, res) => {
  const project = await Project.findById(req.params.projectId); if (!project) return res.status(404).json({ message: 'Project not found' });
  project.categories.push(req.body); await project.save(); const category = project.categories.at(-1); await logChange({ projectId: project._id, projectName: project.name, entityType: 'category', entityId: String(category._id), entityLabel: category.name, action: 'created', details: `Assigned to ${category.vendor}; agreed ${category.agreedAmount}` }); res.status(201).json(project);
}));
app.get('/api/categories/import-template.xlsx', wrap(async (_req, res) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Categories');
  sheet.columns = [
    { header: 'Work category', key: 'name', width: 24 },
    { header: 'Person or company', key: 'vendor', width: 30 },
    { header: 'Phone number', key: 'phone', width: 20 },
    { header: 'Agreed amount', key: 'agreedAmount', width: 18 },
    { header: 'Expected payment date', key: 'dueDate', width: 24 },
  ];
  sheet.getRow(1).font = { bold: true, color: { argb: 'FF30462B' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  const instructions = workbook.addWorksheet('Instructions');
  instructions.addRows([['Fill one category per row on the Categories sheet.'], ['Required: Work category, Person or company, Agreed amount.'], ['Optional: Phone number, Expected payment date.'], ['Expected payment date can be entered as a date in Excel.']]);
  instructions.getColumn(1).width = 74;
  instructions.getRow(1).font = { bold: true };
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="category-import-template.xlsx"');
  res.send(Buffer.from(await workbook.xlsx.writeBuffer()));
}));
app.post('/api/projects/:projectId/categories/import.xlsx', express.raw({ type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', limit: '5mb' }), wrap(async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ message: 'Choose a valid .xlsx file to import.' });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(req.body);
  const sheet = workbook.getWorksheet('Categories') || workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) return res.status(400).json({ message: 'The workbook has no category rows to import.' });
  const headerMap = new Map();
  sheet.getRow(1).eachCell((cell, column) => headerMap.set(String(cell.value || '').trim().toLowerCase(), column));
  const column = name => headerMap.get(name.toLowerCase());
  const nameCol = column('Work category'), vendorCol = column('Person or company'), phoneCol = column('Phone number'), amountCol = column('Agreed amount'), dueCol = column('Expected payment date');
  if (!nameCol || !vendorCol || !amountCol) return res.status(400).json({ message: 'Required columns: Work category, Person or company, and Agreed amount. Download the template for the full column list.' });
  const imported = [];
  const cellText = cell => cell?.text ? String(cell.text).trim() : cell?.value == null ? '' : String(cell.value).trim();
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const name = cellText(row.getCell(nameCol));
    const vendor = cellText(row.getCell(vendorCol));
    const amountText = cellText(row.getCell(amountCol));
    if (!name && !vendor && !amountText) continue;
    const amount = Number(amountText.replace(/[₹,\s]/g, ''));
    if (!name || !vendor || !Number.isFinite(amount) || amount < 0) return res.status(400).json({ message: `Row ${rowNumber}: category, person/company, and a non-negative agreed amount are required.` });
    let dueDate = null;
    if (dueCol) {
      const rawDate = row.getCell(dueCol).value;
      if (rawDate instanceof Date) dueDate = rawDate;
      else if (typeof rawDate === 'number') dueDate = new Date(Date.UTC(1899, 11, 30) + rawDate * 86400000);
      else if (cellText(row.getCell(dueCol))) dueDate = new Date(cellText(row.getCell(dueCol)));
      if (dueDate && Number.isNaN(dueDate.getTime())) return res.status(400).json({ message: `Row ${rowNumber}: expected payment date is not valid.` });
    }
    imported.push({ name, vendor, phone: phoneCol ? cellText(row.getCell(phoneCol)) : '', agreedAmount: amount, dueDate });
  }
  if (!imported.length) return res.status(400).json({ message: 'No valid category rows found to import.' });
  project.categories.push(...imported);
  await project.save();
  const added = project.categories.slice(-imported.length);
  await Promise.all(added.map(category => logChange({ projectId: project._id, projectName: project.name, entityType: 'category', entityId: String(category._id), entityLabel: category.name, action: 'created', details: `Imported from Excel; assigned to ${category.vendor}; agreed ${category.agreedAmount}` })));
  res.status(201).json({ project, imported: added.length });
}));
app.patch('/api/projects/:projectId/categories/:categoryId', wrap(async (req, res) => {
  const project = await Project.findById(req.params.projectId); const category = project?.categories.id(req.params.categoryId);
  if (!category) return res.status(404).json({ message: 'Category not found' }); const before = { name: category.name, vendor: category.vendor, agreedAmount: category.agreedAmount, dueDate: category.dueDate }; category.set(req.body); await project.save(); await logChange({ projectId: project._id, projectName: project.name, entityType: 'category', entityId: String(category._id), entityLabel: category.name, action: 'updated', details: `Category details updated (${before.vendor} → ${category.vendor}; agreed ${before.agreedAmount} → ${category.agreedAmount})` }); res.json(project);
}));
app.delete('/api/projects/:projectId/categories/:categoryId', wrap(async (req, res) => {
  const project = await Project.findById(req.params.projectId); const category = project?.categories.id(req.params.categoryId); if (!category) return res.status(404).json({ message: 'Category not found' });
  const label = category.name; project.categories.pull(req.params.categoryId); await project.save(); await logChange({ projectId: project._id, projectName: project.name, entityType: 'category', entityId: req.params.categoryId, entityLabel: label, action: 'deleted', details: `Category ${label} removed` }); res.json(project);
}));
app.post('/api/projects/:projectId/categories/:categoryId/payments', wrap(async (req, res) => {
  const project = await Project.findById(req.params.projectId); const category = project?.categories.id(req.params.categoryId);
  if (!category) return res.status(404).json({ message: 'Category not found' });
  const amount = Number(req.body.amount); if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Payment amount must be greater than zero' });
  category.payments.push({ ...req.body, amount }); await project.save(); const payment = category.payments.at(-1); await logChange({ projectId: project._id, projectName: project.name, entityType: 'payment', entityId: String(payment._id), entityLabel: category.vendor, action: 'recorded', details: `${amount} payment to ${category.vendor} for ${category.name}${payment.reference ? ` · Ref ${payment.reference}` : ''}` }); res.status(201).json(project);
}));
app.delete('/api/projects/:projectId/categories/:categoryId/payments/:paymentId', wrap(async (req, res) => {
  const project = await Project.findById(req.params.projectId); const category = project?.categories.id(req.params.categoryId);
  const payment = category?.payments.id(req.params.paymentId); if (!payment) return res.status(404).json({ message: 'Payment not found' }); const details = `${payment.amount} payment removed from ${category.vendor} for ${category.name}`; category.payments.pull(req.params.paymentId); await project.save(); await logChange({ projectId: project._id, projectName: project.name, entityType: 'payment', entityId: req.params.paymentId, entityLabel: category.vendor, action: 'deleted', details }); res.json(project);
}));
app.get('/api/audit', wrap(async (_req, res) => res.json(await AuditLog.find().sort({ createdAt: -1 }).limit(500).lean())));
app.get('/api/backup', wrap(async (_req, res) => {
  const backup = { format: 'buildledger-backup-v1', createdAt: new Date().toISOString(), projects: await Project.find().lean() };
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Content-Disposition', 'attachment; filename="buildledger-backup.json"'); res.json(backup);
}));
app.post('/api/backup/restore', wrap(async (req, res) => {
  const projects = req.body?.projects;
  if (req.body?.format !== 'buildledger-backup-v1' || !Array.isArray(projects)) return res.status(400).json({ message: 'This is not a supported BuildLedger backup file' });
  const existingIds = new Set((await Project.distinct('_id')).map(String));
  const toRestore = projects.filter(project => project?._id && !existingIds.has(String(project._id)) && project.name && Array.isArray(project.categories));
  if (toRestore.length) await Project.insertMany(toRestore, { ordered: false });
  res.json({ restored: toRestore.length, skipped: projects.length - toRestore.length, mode: 'merge' });
}));
app.get('/api/projects/:projectId/report.xlsx', wrap(async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BuildLedger';
  workbook.created = new Date();
  workbook.modified = new Date();
  const generatedAt = new Date();
  const headerStyle = row => {
    row.height = 24;
    row.eachCell(cell => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF476D3C' } }; cell.alignment = { vertical: 'middle' }; });
  };
  const setReportIntro = (sheet, subtitle, headerRow) => {
    sheet.mergeCells('A1:I1'); sheet.getCell('A1').value = project.name; sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF30462B' } };
    sheet.mergeCells('A2:I2'); sheet.getCell('A2').value = subtitle;
    sheet.getCell('A2').font = { color: { argb: 'FF687264' }, size: 10 };
    sheet.mergeCells('A3:I3'); sheet.getCell('A3').value = `Report generated: ${generatedAt.toLocaleString('en-IN')}`;
    sheet.getCell('A3').font = { color: { argb: 'FF858B82' }, size: 9 };
    sheet.views = [{ state: 'frozen', ySplit: headerRow }];
  };

  const summary = workbook.addWorksheet('Category Summary');
  summary.columns = [
    { header: 'Project', key: 'project', width: 26 }, { header: 'Category', key: 'category', width: 22 },
    { header: 'Vendor', key: 'vendor', width: 25 }, { header: 'Phone', key: 'phone', width: 19 },
    { header: 'Agreed Amount (₹)', key: 'agreed', width: 20 }, { header: 'Total Paid (₹)', key: 'paid', width: 18 },
    { header: 'Balance (₹)', key: 'balance', width: 18 }, { header: 'Latest Payment Date', key: 'latestDate', width: 22 },
    { header: 'Installments', key: 'installments', width: 14 },
  ];
  setReportIntro(summary, `${project.location || 'Location not set'}${project.client ? ` · ${project.client}` : ''} · ${project.status || 'In progress'}`, 5);
  summary.getRow(5).values = ['Project', 'Category', 'Vendor', 'Phone', 'Agreed Amount (₹)', 'Total Paid (₹)', 'Balance (₹)', 'Latest Payment Date', 'Installments'];
  headerStyle(summary.getRow(5));
  for (const category of project.categories) {
    const payments = [...category.payments].sort((a, b) => new Date(a.date) - new Date(b.date));
    const paid = sumPaid(category);
    const row = summary.addRow({ project: project.name, category: category.name, vendor: category.vendor, phone: category.phone || '', agreed: category.agreedAmount, paid, balance: category.agreedAmount - paid, latestDate: payments.at(-1)?.date || null, installments: payments.length });
    if (row.getCell(8).value) row.getCell(8).numFmt = 'dd-mmm-yyyy';
  }
  summary.autoFilter = { from: 'A5', to: `I${Math.max(5, summary.rowCount)}` };
  for (const row of summary.getRows(6, summary.rowCount - 5) || []) for (const column of [5, 6, 7]) row.getCell(column).numFmt = '₹#,##0.00';

  const history = workbook.addWorksheet('Payment History');
  history.columns = [
    { header: 'Payment Date', key: 'date', width: 19 }, { header: 'Project', key: 'project', width: 25 },
    { header: 'Category', key: 'category', width: 20 }, { header: 'Vendor', key: 'vendor', width: 25 },
    { header: 'Phone', key: 'phone', width: 19 }, { header: 'Payment Amount (₹)', key: 'amount', width: 20 },
    { header: 'Method', key: 'method', width: 18 }, { header: 'Reference', key: 'reference', width: 22 },
    { header: 'Note', key: 'note', width: 28 }, { header: 'Total Paid To Date (₹)', key: 'paidToDate', width: 24 },
    { header: 'Balance After Payment (₹)', key: 'balance', width: 27 },
  ];
  history.mergeCells('A1:K1'); history.getCell('A1').value = `${project.name} — Payment History`; history.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF30462B' } };
  history.mergeCells('A2:K2'); history.getCell('A2').value = `Payment dates and running balances · Report generated: ${generatedAt.toLocaleString('en-IN')}`; history.getCell('A2').font = { color: { argb: 'FF687264' }, size: 9 };
  history.views = [{ state: 'frozen', ySplit: 4 }]; history.getRow(4).values = ['Payment Date', 'Project', 'Category', 'Vendor', 'Phone', 'Payment Amount (₹)', 'Method', 'Reference', 'Note', 'Total Paid To Date (₹)', 'Balance After Payment (₹)']; headerStyle(history.getRow(4));
  const paymentRows = project.categories.flatMap(category => category.payments.map(payment => ({ category, payment }))).sort((a, b) => new Date(a.payment.date) - new Date(b.payment.date));
  const paidByCategory = new Map();
  for (const { category, payment } of paymentRows) {
    const categoryId = String(category._id);
    const runningPaid = (paidByCategory.get(categoryId) || 0) + Number(payment.amount);
    paidByCategory.set(categoryId, runningPaid);
    history.addRow({ date: payment.date, project: project.name, category: category.name, vendor: category.vendor, phone: category.phone || '', amount: payment.amount, method: payment.method || '', reference: payment.reference || '', note: payment.note || '', paidToDate: runningPaid, balance: Number(category.agreedAmount) - runningPaid });
  }
  for (let i = 5; i <= history.rowCount; i++) {
    history.getCell(i, 1).numFmt = 'dd-mmm-yyyy';
    for (const column of [6, 10, 11]) history.getCell(i, column).numFmt = '₹#,##0.00';
  }
  history.autoFilter = { from: 'A4', to: `K${Math.max(4, history.rowCount)}` };

  const slug = project.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${slug}-payment-report.xlsx"`);
  const file = await workbook.xlsx.writeBuffer();
  res.send(Buffer.from(file));
}));
app.get('/api/reports/outstanding', wrap(async (_req, res) => {
  const projects = await Project.find();
  res.json(projects.flatMap(project => project.categories.map(c => ({ project: project.name, projectId: project.id, category: c.name, vendor: c.vendor, phone: c.phone, agreedAmount: c.agreedAmount, paid: sumPaid(c), balance: c.agreedAmount - sumPaid(c) })).filter(row => row.balance > 0)));
}));
app.use((err, _req, res, _next) => { console.error(err); res.status(err.name === 'ValidationError' ? 400 : 500).json({ message: err.message || 'Server error' }); });

const port = process.env.PORT || 5000;
if (process.env.MONGODB_URI) mongoose.connect(process.env.MONGODB_URI).then(() => app.listen(port, () => console.log(`BuildLedger API listening on ${port}`))).catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
else app.listen(port, () => console.log(`BuildLedger API listening on ${port}; set MONGODB_URI to enable persistence`));
