import userResolvers from "../user/userresolvers";
import workspaceresolvers from "../workspace/workspaceresolvers";
const resolvers = {
  ...userResolvers,
  ...workspaceresolvers,
};

export default resolvers;
