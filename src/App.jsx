import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import AssignJobs from './pages/AssignJobs';
import Drivers from './pages/Drivers';
import DispatchReady from './pages/DispatchReady';
import CompletedJobs from './pages/CompletedJobs';
import FailedJobs from './pages/FailedJobs';
import AssignedJobs from './pages/AssignedJobs';
import Orders from './pages/Orders';

function App() {
  const [activeButton, setActiveButton] = useState('Home');

  return (
    <Router>
      <div className="flex h-screen bg-white">
        <Sidebar activeButton={activeButton} setActiveButton={setActiveButton} />
        
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/assign-jobs" element={<AssignJobs />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/dispatch-ready" element={<DispatchReady />} />
            <Route path="/completed-jobs" element={<CompletedJobs />} />
            <Route path="/failed-jobs" element={<FailedJobs />} />
            <Route path="/assigned-jobs" element={<AssignedJobs />} />
            <Route path="/orders" element={<Orders />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;