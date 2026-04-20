// Health Score Icon - Target/Gauge
const HealthScoreIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <line x1="12" y1="3" x2="12" y2="6" />
  </svg>
);

export default HealthScoreIcon;
