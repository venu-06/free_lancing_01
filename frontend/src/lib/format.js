export const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0);
export const idOf = item => item?._id || item?.id;
export const paidOf = category => (category.payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
export const today = new Date().toISOString().slice(0, 10);
export const shortDate = date => new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
export const isToday = value => Boolean(value && !Number.isNaN(new Date(value).getTime()) && new Date(value).toDateString() === new Date().toDateString());
export const shortDateTime = value => new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
