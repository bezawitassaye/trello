import userResolvers from "../user/userresolvers";
import workspaceresolvers from "../workspace/workspaceresolvers";
import projectResolvers from "../project/projectresolvers";
const resolvers = {
  ...userResolvers,
  ...workspaceresolvers,
  ...projectResolvers,
};

export default resolvers;
