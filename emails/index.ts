import { buildSendMail } from "mailing-core";
import nodemailer from "nodemailer";

const sendMail = buildSendMail({
  transport: nodemailer.createTransport({
    host: "smtp.postmarkapp.com",
    port: 587,
    auth: {
      user: process.env.POSTMARK_API_KEY,
      pass: process.env.POSTMARK_API_KEY,
    },
  }),
  defaultFrom: "Felix from duh.fan <support@duh.fan>",
  configPath: "./mailing.config.json",
});

export default sendMail;

export const sendMarketingMail = buildSendMail({
  transport: nodemailer.createTransport({
    host: "smtp-broadcasts.postmarkapp.com",
    port: 587,
    auth: {
      user: process.env.POSTMARK_MARKETING_API_KEY,
      pass: process.env.POSTMARK_MARKETING_API_KEY,
    },
  }),
  defaultFrom: "Felix from duh.fan <you@duh.fan>",
  configPath: "./mailing.config.json",
});
