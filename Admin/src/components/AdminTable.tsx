
import TaskCard from "./TaskCard";

const BoardColumn = ({ title, tasks }) => {
  return (
    <div className="min-w-[300px] bg-[#1f2937] p-4 rounded-2xl flex flex-col">
      <h2 className="text-lg font-medium mb-4">{title}</h2>
      <div className="flex-1 space-y-4">
        {tasks.map((task, i) => (
          <TaskCard key={i} task={task} />
        ))}
        <button className="mt-4 w-full bg-gray-800 py-2 rounded-lg text-sm hover:bg-gray-700">
          + Add New Task
        </button>
      </div>
    </div>
  );
};

export default BoardColumn;
