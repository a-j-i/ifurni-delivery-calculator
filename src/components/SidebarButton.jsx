const SidebarButton = ({ children, active, onClick }) => {
  return (
    <button
      className={`w-full text-sm text-left px-4 py-1 rounded-md transition-colors ${
        active 
          ? 'bg-gray-300 text-blue-600 ' 
          : 'hover:bg-gray-300'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default SidebarButton;