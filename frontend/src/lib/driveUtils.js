export const getDriveStatusColor = (status) => {
  const map = {
    draft: "bg-gray-100 text-gray-600 dark:bg-gray-800",
    published: "bg-blue-100 text-blue-700 dark:bg-blue-900",
    open: "bg-green-100 text-green-700 dark:bg-green-900",
    closed: "bg-orange-100 text-orange-700 dark:bg-orange-900",
    completed: "bg-purple-100 text-purple-700 dark:bg-purple-900",
  };
  return map[status] || map.draft;
};

export const formatCTC = (ctc) => {
  if (!ctc && ctc !== 0) return "—";
  return `₹${ctc} LPA`;
};

export const getDriveCTCRange = (roles = []) => {
  if (!roles.length) return "—";
  const ctcs = roles.map((r) => r.ctc).filter(Boolean);
  if (!ctcs.length) return "—";
  const min = Math.min(...ctcs);
  const max = Math.max(...ctcs);
  return min === max ? formatCTC(min) : `₹${min}–${max} LPA`;
};

export const getDeadlineStatus = (deadline) => {
  if (!deadline) return null;
  const diff = new Date(deadline) - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "Expired", color: "text-red-500" };
  if (days === 0) return { label: "Today", color: "text-red-500" };
  if (days <= 3) return { label: `${days}d left`, color: "text-orange-500" };
  if (days <= 7) return { label: `${days}d left`, color: "text-yellow-600" };
  return { label: `${days}d left`, color: "text-muted-foreground" };
};
