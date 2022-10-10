import nodemailer from "nodemailer";
import { buildSendMail } from "mailing-core";

const transportConfig = {
  port: 587,
  auth: {
    user: process.env.POSTMARK_API_KEY,
    pass: process.env.POSTMARK_API_KEY,
  },
};

const sendMail = buildSendMail({
  transport: nodemailer.createTransport({
    host: "smtp.postmarkapp.com",
    ...transportConfig,
  }),
  defaultFrom: "Dub <system@dub.sh>",
  configPath: "./mailing.config.json",
});

export default sendMail;

export const sendMarketingMail = buildSendMail({
  transport: nodemailer.createTransport({
    host: "smtp-broadcasts.postmarkapp.com",
    ...transportConfig,
  }),
  defaultFrom: "Steven from Dub <steven@dub.sh>",
  configPath: "./mailing.config.json",
});
