import { useState } from "react";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("users");

  const users = [
    { id: 1, name: "Alice Johnson", email: "alice@mail.com", role: "ADMIN", status: "ACTIVE" },
    { id: 2, name: "John Doe", email: "john@mail.com", role: "USER", status: "BANNED" },
    { id: 3, name: "Mary Brown", email: "mary@mail.com", role: "USER", status: "ACTIVE" },
  ];

  const workspaces = [
    {
      id: 1,
      name: "Team Monicca",
      members: [
        { name: "Alice Johnson", role: "Owner" },
        { name: "John Doe", role: "Member" },
      ],
    },
    {
      id: 2,
      name: "BCA Workspace",
      members: [
        { name: "Mary Brown", role: "Owner" },
        { name: "Alice Johnson", role: "Viewer" },
      ],
    },
  ];

  const logs = [
    { id: 1, timestamp: "2024-09-09 10:30", action: "USER_BANNED", userId: 1, details: "Banned John Doe" },
    { id: 2, timestamp: "2024-09-10 14:00", action: "TASK_STATUS_UPDATE", userId: 3, details: "Task moved to DONE" },
  ];

  return (
    <div className="flex h-screen bg-[#111827] text-gray-200">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f172a] border-r border-gray-800 flex flex-col">
        <div className="p-4 font-semibold text-lg">Admin Panel</div>
        <div className="flex-1 overflow-y-auto px-3">
          {["users", "workspaces", "logs"].map((tab) => (
            <div
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 rounded-lg cursor-pointer mb-2 ${
                activeTab === tab ? "bg-gray-800 text-indigo-400" : "hover:bg-gray-800"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-2xl font-semibold mb-6">Admin Dashboard</h1>

        {activeTab === "users" && (
          <div className="bg-[#1f2937] p-6 rounded-2xl shadow-lg">
            <h2 className="text-lg font-medium mb-4">Manage Users</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-800 hover:bg-gray-800">
                    <td className="py-2">{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td
                      className={`font-semibold ${
                        u.status === "BANNED" ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {u.status}
                    </td>
                    <td className="space-x-2">
                      <button className="bg-indigo-600 px-3 py-1 rounded-md text-xs hover:bg-indigo-500">
                        Reset Password
                      </button>
                      <button
                        className={`px-3 py-1 rounded-md text-xs ${
                          u.status === "BANNED"
                            ? "bg-green-600 hover:bg-green-500"
                            : "bg-red-600 hover:bg-red-500"
                        }`}
                      >
                        {u.status === "BANNED" ? "Unban" : "Ban"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "workspaces" && (
          <div className="bg-[#1f2937] p-6 rounded-2xl shadow-lg">
            <h2 className="text-lg font-medium mb-4">All Workspaces</h2>
            <div className="space-y-4">
              {workspaces.map((w) => (
                <div key={w.id} className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">{w.name}</h3>
                  <ul className="text-sm text-gray-400">
                    {w.members.map((m, i) => (
                      <li key={i}>
                        {m.name} - <span className="text-indigo-400">{m.role}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "logs" && (
          <div className="bg-[#1f2937] p-6 rounded-2xl shadow-lg">
            <h2 className="text-lg font-medium mb-4">System Logs</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left">
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2">User ID</th>
                  <th className="pb-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-gray-800 hover:bg-gray-800">
                    <td className="py-2">{l.timestamp}</td>
                    <td className="text-indigo-400">{l.action}</td>
                    <td>{l.userId}</td>
                    <td>{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
