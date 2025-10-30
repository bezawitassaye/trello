
import { FolderIcon, PlusCircleIcon } from "@heroicons/react/24/outline";

const Sidebar = () => {
  const projects = [
    "Monicca - SaaS Product",
    "BCA - CRM Web App",
    "Mandiri - Landing Page",
    "People Hours - Company Profile",
  ];

  return (
    <aside className="w-64 bg-[#0f172a] border-r border-gray-800 flex flex-col">
      <div className="p-4 font-semibold text-lg">Projects</div>
      <div className="flex-1 overflow-y-auto px-3">
        {projects.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 rounded-lg cursor-pointer"
          >
            <FolderIcon className="w-5 h-5 text-gray-400" />
            <span className="truncate">{p}</span>
          </div>
        ))}
      </div>
      <button className="m-4 bg-indigo-600 py-2 rounded-lg text-sm hover:bg-indigo-500">
        + New Project
      </button>
    </aside>
  );
};

export default Sidebar;
