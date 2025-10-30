

const TaskCard = ({ task }) => {
  const priorityColors = {
    High: "text-red-400 border-red-400",
    Medium: "text-yellow-400 border-yellow-400",
    Low: "text-green-400 border-green-400",
  };

  return (
    <div className="bg-[#111827] p-4 rounded-xl border border-gray-700 hover:border-gray-500 transition">
      <div className="flex justify-between mb-2">
        <span
          className={`text-xs border px-2 py-0.5 rounded-full ${
            priorityColors[task.priority]
          }`}
        >
          {task.priority}
        </span>
        <span className="text-xs text-gray-400">{task.date}</span>
      </div>
      <h3 className="font-semibold mb-1">{task.title}</h3>
      <p className="text-sm text-gray-400 mb-3">{task.desc}</p>
      <div className="flex -space-x-2">
        {task.members.map((m, i) => (
          <div
            key={i}
            className="w-7 h-7 flex items-center justify-center bg-indigo-600 rounded-full text-xs border border-gray-900"
          >
            {m}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskCard;
