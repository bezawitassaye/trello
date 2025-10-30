import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


export const sendAddedMemberEmail = async (email: string, workspaceName: string) => {
  await transporter.sendMail({
    from: `"Trello Clone" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `You’ve been added to ${workspaceName}`,
    text: `You’ve been added to the workspace "${workspaceName}". Log in to see your new workspace.`,
  });
};

export const sendInvitationEmail = async (email: string, workspaceName: string) => {
  await transporter.sendMail({
    from: `"Trello Clone" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Invitation to join ${workspaceName}`,
    text: `You’ve been invited to join the workspace "${workspaceName}". Sign up to accept the invitation.`,
  });
};
