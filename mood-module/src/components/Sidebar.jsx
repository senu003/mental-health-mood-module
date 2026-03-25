// components/Sidebar.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  HomeIcon,
  CalendarIcon,
  ChartBarIcon,
  UserIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

const Sidebar = ({ activePage, collapsed, setCollapsed }) => {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Split links into main and bottom sections
  const mainLinks = [
    { name: "Dashboard", icon: HomeIcon, path: "/dashboard" },
    { name: "Book Appointment", icon: CalendarIcon },
    { name: "Appointment History", icon: BookOpenIcon, path: "/history" },
    { name: "Report Analysis", icon: ChartBarIcon },
    { name: "Mood Track", icon: UserIcon },
    { name: "Mood Fix", icon: UserIcon },
    { name: "Journal Reading", icon: BookOpenIcon },
  ];

  const bottomLinks = [
    { name: "Settings", icon: Cog6ToothIcon },
    { name: "Logout", icon: ArrowRightOnRectangleIcon },
  ];

  return (
    <div
      className={`fixed left-0 top-0 bg-[#0D47A1] text-white h-screen flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? "w-20" : "w-64"
      } ${scrolled ? 'shadow-lg' : ''}`}
      style={{ zIndex: 50 }}
    >
      {/* Logo + Collapse Button */}
      <div className={`flex items-center justify-between p-4 border-b border-white/10 ${scrolled ? 'bg-[#0D47A1]/95 backdrop-blur-sm' : ''}`}>
        <div className={`flex items-center gap-2 transition-all duration-300 overflow-hidden ${
          collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
        }`}>
          <span className="font-bold text-xl whitespace-nowrap">
            <span className="text-white">Medi</span>
            <span className="text-black">Link</span>
          </span>
        </div>
        <button
          className="text-white p-2 rounded-lg hover:bg-[#0967FF] transition-all duration-200 hover:scale-110 min-w-[40px]"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {/* Main Navigation Links - Scrollable Area */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 
        [&::-webkit-scrollbar]:w-1
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:bg-white/20
        [&::-webkit-scrollbar-thumb]:rounded-full
        hover:[&::-webkit-scrollbar-thumb]:bg-white/40">
        <div className="flex flex-col gap-2">
          {mainLinks.map((link) => (
            <div
              key={link.name}
              onClick={() => {
                if (link.path) navigate(link.path);
              }}
              className={`relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group ${
                activePage === link.name || location.pathname === link.path
                  ? "bg-[#0967FF] shadow-lg" 
                  : "hover:bg-[#0967FF]/80"
              }`}
            >
              <link.icon className="w-6 h-6 min-w-[24px]" />
              {!collapsed && (
                <span className="whitespace-nowrap font-medium">{link.name}</span>
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 bg-gray-900 text-white px-2 py-1 rounded text-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                  {link.name}
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom Links - Settings and Logout - Always at bottom */}
      <div className="border-t border-white/10 p-4">
        <div className="flex flex-col gap-2">
          {bottomLinks.map((link) => (
            <div
              key={link.name}
              className={`relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group ${
                activePage === link.name 
                  ? "bg-[#0967FF] shadow-lg" 
                  : "hover:bg-[#0967FF]/80"
              }`}
            >
              <link.icon className="w-6 h-6 min-w-[24px]" />
              {!collapsed && (
                <span className="whitespace-nowrap font-medium">{link.name}</span>
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 bg-gray-900 text-white px-2 py-1 rounded text-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                  {link.name}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;