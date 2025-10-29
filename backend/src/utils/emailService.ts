import nodemailer from "nodemailer";


export const sendAddedMemberEmail = async (email: string, workspaceName: string) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Trello Clone" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `You’ve been added to ${workspaceName}`,
    text: `You’ve been added to the workspace "${workspaceName}". Log in to see your new workspace.`,
  });
};
