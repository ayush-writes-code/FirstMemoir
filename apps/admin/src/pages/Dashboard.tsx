export function Dashboard() {
  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center max-w-2xl mx-auto mt-12">
        <h2 className="text-xl font-medium text-gray-900 mb-2">Welcome to PrintCraft Admin</h2>
        <p className="text-gray-500 mb-6">
          The foundation is set. Use the sidebar to navigate to the various management modules once they are implemented.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div className="p-4 border border-gray-100 rounded-md bg-gray-50">
            <span className="block text-sm font-medium text-gray-500">API Client</span>
            <span className="block text-lg font-semibold text-gray-900">Connected ✓</span>
          </div>
          <div className="p-4 border border-gray-100 rounded-md bg-gray-50">
            <span className="block text-sm font-medium text-gray-500">Session</span>
            <span className="block text-lg font-semibold text-gray-900">Active ✓</span>
          </div>
        </div>
      </div>
    </div>
  );
}
