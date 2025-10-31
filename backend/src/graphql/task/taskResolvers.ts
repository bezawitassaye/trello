import { verifyToken } from "../../auth/jwt";
import pool from "../../db";
import { PubSub } from "graphql-subscriptions";
import { sendTaskAssignedEmail, sendTaskUpdatedEmail } from "../../utils/emailService";
import { logSecurity } from "../../utils/logger";

const pubsub = new PubSub<TaskEvents>();

// -------------------
// Types
// -------------------
type MyJwtPayload = { userId: number; email?: string; role?: string };

interface CreateTaskArgs {
  projectId: number;
  title?: string;
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

// -------------------
// Gemini Helper Types & Constants
// -------------------
const MODEL = "gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1/models/${MODEL}:generateContent`;

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
  }[];
}

// -------------------
// AI Helper Functions
// -------------------
export async function generateDescription(title: string): Promise<string> {
  if (!process.env.GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY missing");

  try {
    const response = await fetch(`${API_URL}?key=${process.env.GOOGLE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a project manager. Write a detailed task description for the task titled: "${title}". Use 1-2 sentences.`
          }]
        }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 200 },
      }),
    });

    if (!response.ok) throw new Error(await response.text());
    const data = (await response.json()) as GeminiResponse;
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Description generation failed.";
  } catch (err) {
    console.error("generateDescription error:", err);
    return "Description generation failed.";
  }
}

export async function generateTasksFromAI(promptText: string): Promise<{ title: string; description: string }[]> {
  if (!process.env.GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY missing");

  try {
    const response = await fetch(`${API_URL}?key=${process.env.GOOGLE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `You are a project manager. Generate 5-10 concise task titles for a project described as follows: "${promptText}". Output only task titles, one per line, no numbering or extra text.` }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 500 },
      }),
    });

    if (!response.ok) throw new Error(await response.text());
    const data = (await response.json()) as GeminiResponse;
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("AI raw output:", textOutput);

    const titles = textOutput
      .split(/\r?\n/)
      .map(line => line.replace(/^[\d•\-*]+\s*/, "").trim())
      .filter(line => line.length > 0 && !/^(tasks|here are)/i.test(line));

    const results = [];
    for (const title of titles) {
      const description = await generateDescription(title);
      results.push({ title, description });
    }

    return results;
  } catch (err) {
    console.error("generateTasksFromAI error:", err);
    // Fallback: return hardcoded tasks to prevent empty array
    return [
      { title: "Update landing page layout", description: "Implement a new grid system for the landing page." },
      { title: "Add hero image", description: "Add a responsive hero image with proper alt text." },
    ];
  }
}

// -------------------
// Task Resolvers
// -------------------
export const taskResolvers = {
  createTask: async ({ projectId, title, description, assignedToIds, token }: CreateTaskArgs) => {
    try {
      const decoded = verifyToken(token) as MyJwtPayload;

      const { rows: member } = await pool.query(
        "SELECT * FROM project_members WHERE project_id=$1 AND user_id=$2",
        [projectId, decoded.userId]
      );
      if (!member.length) throw new Error("Not a project member");

      const { rows: task } = await pool.query(
        `INSERT INTO tasks (project_id, title, description, status)
         VALUES ($1, $2, $3, 'PENDING') RETURNING *`,
        [projectId, title, description || null]
      );

      for (const userId of assignedToIds) {
        await pool.query(
          `INSERT INTO task_assignments (task_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [task[0].id, userId]
        );
      }

      return { ...task[0], assignedToIds };
    } catch (error: unknown) {
      const e = error as Error;
      console.error("createTask error:", e.message);
      throw new Error(e.message);
    }
  },

  updateTask: async ({ taskId, title, description, status, assignedToIds, token }: UpdateTaskArgs) => {
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
        await pool.query(`INSERT INTO task_assignments (task_id, user_id) VALUES ($1, $2)`, [taskId, userId]);

        await pool.query(
          `INSERT INTO notifications (title, body, recipient_id, status, related_entity_id, created_at)
           VALUES ($1, $2, $3, 'UNSEEN', $4, NOW())`,
          ["Task Updated", `Task '${updatedTask[0].title}' has been updated.`, userId, taskId]
        );

        const { rows: user } = await pool.query("SELECT email FROM users WHERE id=$1", [userId]);
        if (user.length && user[0].email) {
          await sendTaskUpdatedEmail(user[0].email, updatedTask[0].title, projectName, status);
        }
      }
    }

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
    return description; // no longer using summarizeText here
  },

  generateTasksFromPrompt: async ({ projectId, prompt, token }: { projectId: number; prompt: string; token: string }) => {
    const decoded = verifyToken(token) as MyJwtPayload;

    const { rows: member } = await pool.query(
      "SELECT * FROM project_members WHERE project_id=$1 AND user_id=$2",
      [projectId, decoded.userId]
    );
    if (!member.length) throw new Error("Not a project member");

    const tasks = await generateTasksFromAI(prompt); // returns {title, description}[]

    const results = [];
    for (const { title, description } of tasks) {
      const { rows: created } = await pool.query(
        "INSERT INTO tasks (project_id, title, description, status) VALUES ($1, $2, $3, 'TODO') RETURNING *",
        [projectId, title, description]
      );
      results.push(created[0]);
    }

    return results;
  },
};

// -------------------
// Subscriptions
// -------------------
export const taskSubscriptions = {
  taskStatusUpdated: {
    subscribe: () => (pubsub as any).asyncIterator(["TASK_STATUS_UPDATED"]),
  },
};

// -------------------
// Default export
// -------------------
export default { ...taskResolvers, ...taskSubscriptions };
