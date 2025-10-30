
import Sidebar from "./components/Sidebar";
import BoardColumn from "./components/BoardColumn";

const App = () => {
  const columns = [
    {
      title: "To Do",
      tasks: [
        {
          title: "New Task",
          desc: "Involves creating and assigning a new task within the system.",
          priority: "Medium",
          date: "Sep 09, 2024",
          members: ["A", "B", "C"],
        },
      ],
    },
    {
      title: "In Progress",
      tasks: [
        {
          title: "Planning meeting for second option of dashboard",
          desc: "Focus on strategizing and outlining dashboard options.",
          priority: "Medium",
          date: "Sep 09, 2024",
          members: ["A", "B"],
        },
        {
          title: "Finish the ideation",
          desc: "Finalize and refine concepts that have been discussed.",
          priority: "High",
          date: "Sep 12, 2024",
          members: ["A", "C"],
        },
      ],
    },
    {
      title: "In Review",
      tasks: [
        {
          title: "Business model canvas of product",
          desc: "Develop a comprehensive Business Model Canvas for the product.",
          priority: "Low",
          date: "Sep 01, 2024",
          members: ["A", "B", "C"],
        },
      ],
    },
  ];

  return (
    <div className="flex h-screen bg-[#111827] text-gray-200">
      <Sidebar />
      <main className="flex-1 p-6 overflow-x-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Monicca - SaaS Product</h1>
          <button className="bg-gray-800 px-4 py-2 rounded-lg text-sm">
            + Invite Member
          </button>
        </div>

        <div className="flex gap-6 overflow-x-auto">
          {columns.map((col, i) => (
            <BoardColumn key={i} title={col.title} tasks={col.tasks} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default App;
