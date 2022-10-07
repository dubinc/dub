import nodemailer from "nodemailer";
import { buildSendMail } from "mailing-core";

const transport = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendMail = buildSendMail({
  transport,
  defaultFrom: "steven@dub.sh",
  configPath: "./mailing.config.json",
});

export default sendMail;
