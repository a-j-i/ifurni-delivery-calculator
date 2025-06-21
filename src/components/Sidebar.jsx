import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SidebarButton from './SidebarButton';

const Sidebar = ({ activeButton, setActiveButton }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = () => {
    // Your sign out logic
    navigate('/login');
  };

  return (
    <div className="w-55 bg-gray-200 text-gray-800 p-5 flex flex-col space-y-6">
      {/* Admin Button with Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex justify-between items-center p-3 text-black rounded-lg transition-colors"
        >
          <span>Admin</span>
          <span className={`transform transition-transform ${showDropdown ? 'rotate-180' : ''}`}>▼</span>
        </button>
        
        {showDropdown && (
          <div className="absolute left-0 right-0 mt-1 bg-white rounded-md shadow-lg z-10">
            <button 
              onClick={handleSignOut}
              className="w-full text-xs text-left px-4 py-2 text-black hover:text-blue-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Home Button */}
      <Link to="/">
        <SidebarButton
          active={activeButton === 'Home'}
          onClick={() => setActiveButton('Home')}
        >
          Home
        </SidebarButton>
      </Link>

      {/* Tools Section */}
      <div className="space-y-2">
        <h3 className="text-xs tracking-wider text-black px-3 font-medium">Tools</h3>
        <Link to="/orders">
          <SidebarButton
            active={activeButton === 'Orders'}
            onClick={() => setActiveButton('Orders')}
          >
            Orders
          </SidebarButton>
        </Link>
        <Link to="/assign-jobs">
          <SidebarButton
            active={activeButton === 'AssignJobs'}
            onClick={() => setActiveButton('AssignJobs')}
          >
            Assign Jobs
          </SidebarButton>
        </Link>
        <Link to="/drivers">
          <SidebarButton 
            active={activeButton === 'Drivers'}
            onClick={() => setActiveButton('Drivers')}
          >
            Driver Manager
          </SidebarButton>
        </Link>
        <Link to="/dispatch-ready">
          <SidebarButton
            active={activeButton === 'DispatchReady'}
            onClick={() => setActiveButton('DispatchReady')}
          >
            Dispatch Ready
          </SidebarButton>
        </Link>
      </div>

      {/* Jobs Section */}
      <div className="space-y-2">
        <h3 className="text-xs tracking-wider text-black px-3 font-medium">Jobs</h3>
        <Link to="/completed-jobs">
          <SidebarButton
            active={activeButton === 'CompletedJobs'}
            onClick={() => setActiveButton('CompletedJobs')}
          >
            Completed Jobs
          </SidebarButton>
        </Link>
        <Link to="/failed-jobs">
          <SidebarButton
            active={activeButton === 'FailedJobs'}
            onClick={() => setActiveButton('FailedJobs')}
          >
            Failed Jobs
          </SidebarButton>
        </Link>
        <Link to="/assigned-jobs">
          <SidebarButton
            active={activeButton === 'AssignedJobs'}
            onClick={() => setActiveButton('AssignedJobs')}
          >
            Assigned Jobs
          </SidebarButton>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;