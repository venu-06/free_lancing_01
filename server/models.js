import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0.01 },
  date: { type: Date, required: true, default: Date.now },
  method: { type: String, enum: ['Bank transfer', 'UPI', 'Cheque', 'Cash'], default: 'Bank transfer' },
  reference: String,
  note: String
}, { timestamps: true });

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  vendor: { type: String, required: true, trim: true },
  phone: String,
  agreedAmount: { type: Number, required: true, min: 0 },
  dueDate: Date,
  payments: [paymentSchema]
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  location: String,
  client: String,
  status: { type: String, enum: ['Planning', 'In progress', 'On hold', 'Completed'], default: 'In progress' },
  startDate: Date,
  categories: [categorySchema]
}, { timestamps: true });

projectSchema.virtual('totalPaid').get(function () { return this.categories.reduce((sum, c) => sum + c.payments.reduce((s, p) => s + p.amount, 0), 0); });
projectSchema.set('toJSON', { virtuals: true });
export const Project = mongoose.model('Project', projectSchema);

const auditLogSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, index: true },
  projectName: String,
  entityType: { type: String, enum: ['category', 'payment', 'project'], required: true },
  entityId: String,
  entityLabel: String,
  action: { type: String, required: true },
  details: String,
  actor: { type: String, default: 'Workspace owner' },
}, { timestamps: true });
export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

const workspaceProfileSchema = new mongoose.Schema({
  _id: { type: String, default: 'workspace-profile' },
  ownerName: { type: String, trim: true, default: '' },
  organizationName: { type: String, trim: true, default: 'Construction workspace' },
  startedYear: { type: Number, min: 1800, max: 2200, default: null },
}, { timestamps: true });
export const WorkspaceProfile = mongoose.model('WorkspaceProfile', workspaceProfileSchema);
