import { verifyToken } from "../../auth/jwt";
import pool from "../../db";
import { PubSub } from "graphql-subscriptions";
import { summarizeText } from "../../utils/aiService";

import {
  sendTaskAssignedEmail,
  sendTaskUpdatedEmail,
} from "../../utils/emailService";
import { logSecurity } from "../../utils/logger"; // ✅ import logger

const pubsub = new PubSub<TaskEvents>();

type MyJwtPayload = {
  userId: number;
  email?: string;
  role?: string;
};

interface CreateTaskArgs {
  projectId: number;
  title: string;
  description?: string;
  assignedToIds: number[];
  token: string;
}

interface UpdateTaskArgs {
  taskId: number;
  title?: string;
  description?: string;
  status?: string;
  assignedToIds?: number[];
  token: string;
}

interface MarkNotificationArgs {
  notificationId: number;
  token: string;
}

type TaskEvents = {
  TASK_STATUS_UPDATED: { taskStatusUpdated: any };
};

export const taskResolvers = {
  createTask: async ({
    projectId,
    title,
    description,
    assignedToIds,
    token,
  }: CreateTaskArgs) => {
    const decoded = verifyToken(token) as MyJwtPayload;

    // verify membership
    const { rows: member } = await pool.query(
      "SELECT * FROM project_members WHERE project_id=$1 AND user_id=$2",
      [projectId, decoded.userId]
    );
    if (!member.length) {
      await logSecurity(decoded.userId, null, "CREATE_TASK_FAILED", { projectId, reason: "Not a project member" });
      throw new Error("Not a project member");
    }

    // fetch project name for email
    const { rows: project } = await pool.query(
      "SELECT name FROM projects WHERE id=$1",
      [projectId]
    );
    const projectName = project[0]?.name || "Unknown Project";

    // create the task
    const { rows: task } = await pool.query(
      `INSERT INTO tasks (project_id, title, description, status)
       VALUES ($1, $2, $3, 'PENDING') RETURNING *`,
      [projectId, title, description || null]
    );

    // assign users
    for (const userId of assignedToIds) {
      await pool.query(
        `INSERT INTO task_assignments (task_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [task[0].id, userId]
      );

      await pool.query(
        `INSERT INTO notifications (title, body, recipient_id, status, related_entity_id, created_at)
         VALUES ($1, $2, $3, 'UNSEEN', $4, NOW())`,
        [
          "New Task Assigned",
          `You’ve been assigned to task: ${title}`,
          userId,
          task[0].id,
        ]
      );

      const { rows: user } = await pool.query(
        "SELECT email FROM users WHERE id=$1",
        [userId]
      );
      if (user.length && user[0].email) {
        await sendTaskAssignedEmail(user[0].email, title, projectName);
      }
    }

    // log task creation
    await logSecurity(decoded.userId, null, "TASK_CREATED", {
      taskId: task[0].id,
      projectId,
      assignedToIds,
    });

    pubsub.publish("TASK_STATUS_UPDATED", {
      taskStatusUpdated: { ...task[0], assignedToIds },
    });

    return { ...task[0], assignedToIds };
  },

  updateTask: async ({
    taskId,
    title,
    description,
    status,
    assignedToIds,
    token,
  }: UpdateTaskArgs) => {
    const decoded = verifyToken(token) as MyJwtPayload;

    const { rows: member } = await pool.query(
      `SELECT tm.* FROM task_assignments ta
       JOIN project_members tm ON tm.user_id = ta.user_id
       WHERE ta.task_id=$1 AND tm.user_id=$2`,
      [taskId, decoded.userId]
    );
    if (!member.length) {
      await logSecurity(decoded.userId, null, "UPDATE_TASK_FAILED", { taskId, reason: "Unauthorized" });
      throw new Error("Unauthorized: not assigned to this task");
    }

    const { rows: updatedTask } = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status)
       WHERE id=$4
       RETURNING *`,
      [title, description, status, taskId]
    );

    const { rows: project } = await pool.query(
      `SELECT p.name FROM projects p
       JOIN tasks t ON t.project_id = p.id
       WHERE t.id=$1`,
      [taskId]
    );
    const projectName = project[0]?.name || "Unknown Project";

    if (assignedToIds && assignedToIds.length) {
      await pool.query("DELETE FROM task_assignments WHERE task_id=$1", [taskId]);
      for (const userId of assignedToIds) {
        await pool.query(
          `INSERT INTO task_assignments (task_id, user_id) VALUES ($1, $2)`,
          [taskId, userId]
        );

        await pool.query(
          `INSERT INTO notifications (title, body, recipient_id, status, related_entity_id, created_at)
           VALUES ($1, $2, $3, 'UNSEEN', $4, NOW())`,
          [
            "Task Updated",
            `Task '${updatedTask[0].title}' has been updated.`,
            userId,
            taskId,
          ]
        );

        const { rows: user } = await pool.query(
          "SELECT email FROM users WHERE id=$1",
          [userId]
        );
        if (user.length && user[0].email) {
          await sendTaskUpdatedEmail(
            user[0].email,
            updatedTask[0].title,
            projectName,
            status
          );
        }
      }
    }

    // log task update
    await logSecurity(decoded.userId, null, "TASK_UPDATED", { taskId, updatedFields: { title, description, status }, assignedToIds });

    pubsub.publish("TASK_STATUS_UPDATED", {
      taskStatusUpdated: { ...updatedTask[0], assignedToIds },
    });

    return { ...updatedTask[0], assignedToIds };
  },

  markNotificationAsSeen: async ({ notificationId, token }: MarkNotificationArgs) => {
    const decoded = verifyToken(token) as MyJwtPayload;

    const { rows: notification } = await pool.query(
      `UPDATE notifications
       SET status='SEEN'
       WHERE id=$1 AND recipient_id=$2
       RETURNING *`,
      [notificationId, decoded.userId]
    );

    if (!notification.length) {
      await logSecurity(decoded.userId, null, "MARK_NOTIFICATION_FAILED", { notificationId, reason: "Not found or unauthorized" });
      throw new Error("Notification not found or unauthorized");
    }

    await logSecurity(decoded.userId, null, "NOTIFICATION_MARKED_SEEN", { notificationId });

    return notification[0];
  },
   summarizeTask: async ({ taskId }: { taskId: number }) => {
    const { rows } = await pool.query("SELECT description FROM tasks WHERE id=$1", [taskId]);
    if (!rows.length) throw new Error("Task not found");

    const description = rows[0].description;
    if (!description) return "No description available";

    const summary = await summarizeText(description);
    return summary;
  },
};

export const taskSubscriptions = {
  taskStatusUpdated: {
    subscribe: () => (pubsub as any).asyncIterator(["TASK_STATUS_UPDATED"]),
  },
};

export default { ...taskResolvers, ...taskSubscriptions };
