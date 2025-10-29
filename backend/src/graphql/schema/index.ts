import { buildSchema } from "graphql";
import userSchema from "../user/userschema";
import workspaceSchema from "../workspace/workspaceschema";

// Merge type definitions manually
const schema = buildSchema(`
  ${userSchema}
  ${workspaceSchema}
`);

export default schema;
