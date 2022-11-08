import { buildSendMail } from "mailing-core";
import nodemailer from "nodemailer";

const sendMail = buildSendMail({
  transport: nodemailer.createTransport({
    host: process.env.SMTP_SERVER,
    port: 587,
    auth: {
      user: process.env.STMP_USER,
      pass: process.env.STMP_PASSWORD,
    },
  }),
  defaultFrom: process.env.STMP_EMAIL_FROM,
  configPath: "./mailing.config.json",
});

export default sendMail;

export const sendMarketingMail = buildSendMail({
  transport: nodemailer.createTransport({
    host: process.env.SMTP_BRODCAST_SERVER,
    port: 587,
    auth: {
      user: process.env.SMTP_MARKETING_BROADCAST_USER,
      pass: process.env.SMTP_MARKETING_BROADCAST_PASSWORD,
    },
  }),
  defaultFrom: process.env.STMP_MARKETING_BROADCAST_EMAIL_FROM,
  configPath: "./mailing.config.json",
});
