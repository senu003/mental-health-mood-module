export const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const getTodayStr = () => new Date().toISOString().split("T")[0];
