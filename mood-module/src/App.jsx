// App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CheckInPage1 from './pages/CheckInPage1';
import CheckInPage2 from './pages/CheckInPage2';
import CheckinSummary from './pages/CheckinSummary';
import MoodHistory from './pages/MoodHistory';
import InsightsPage from './pages/InsightsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/check-in" element={<CheckInPage1 />} />
        <Route path="/check-in/details" element={<CheckInPage2 />} />
        <Route path="/check-in/summary" element={<CheckinSummary />} />
        <Route path="/history" element={<MoodHistory />} />
        <Route path="/insights" element={<InsightsPage />} />
      </Routes>
    </Router>
  );
}

export default App;