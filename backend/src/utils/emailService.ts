import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Workspace invitation email
export const sendInvitationEmail = async (email: string, workspaceName: string) => {
  await transporter.sendMail({
    from: `"Trello Clone" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Invitation to join ${workspaceName}`,
    text: `You've been invited to join the workspace "${workspaceName}". Sign up to accept the invitation.`,
  });
};

// ✅ Member added email
export const sendAddedMemberEmail = async (email: string, workspaceName: string) => {
  await transporter.sendMail({
    from: `"Trello Clone" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `You’ve been added to ${workspaceName}`,
    text: `You’ve been added to the workspace "${workspaceName}". Log in to see your new workspace.`,
  });
};

// ✅ Task assignment email
export const sendTaskAssignedEmail = async (email: string, taskTitle: string, projectName: string) => {
  await transporter.sendMail({
    from: `"Trello Clone" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `New Task Assigned: ${taskTitle}`,
    text: `You have been assigned a new task "${taskTitle}" in project "${projectName}". Check the app to see details.`,
  });
};

// ✅ Task updated email
export const sendTaskUpdatedEmail = async (email: string, taskTitle: string, projectName: string, status?: string) => {
  const statusText = status ? ` The new status is "${status}".` : "";
  await transporter.sendMail({
    from: `"Trello Clone" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Task Updated: ${taskTitle}`,
    text: `Task "${taskTitle}" in project "${projectName}" has been updated.${statusText} Check the app for details.`,
  });
};
