import userResolvers from "../user/userresolvers";
import workspaceresolvers from "../workspace/workspaceresolvers";
import projectResolvers from "../project/projectresolvers";
import taskResolvers from "../task/taskResolvers";
const resolvers = {
  ...userResolvers,
  ...workspaceresolvers,
  ...projectResolvers,
  ...taskResolvers
};

export default resolvers;
