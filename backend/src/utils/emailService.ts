import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Notify user about new task assignment
export const sendTaskAssignedEmail = async (email: string, taskTitle: string, projectName: string) => {
  await transporter.sendMail({
    from: `"Trello Clone" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `New Task Assigned: ${taskTitle}`,
    text: `You have been assigned a new task "${taskTitle}" in project "${projectName}". Check the app to see details.`,
  });
};

// Notify user about task update/status change
export const sendTaskUpdatedEmail = async (email: string, taskTitle: string, projectName: string, status?: string) => {
  const statusText = status ? ` The new status is "${status}".` : "";
  await transporter.sendMail({
    from: `"Trello Clone" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Task Updated: ${taskTitle}`,
    text: `Task "${taskTitle}" in project "${projectName}" has been updated.${statusText} Check the app for details.`,
  });
};
