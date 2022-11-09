import { default as LoginLinkEmail } from "../LoginLink";
import { default as ProjectInviteEmail } from "../ProjectInvite";
import { default as WelcomeEmailChild } from "../WelcomeEmail";

export function LoginLink() {
  return (
    <LoginLinkEmail url="http://app.localhost:3000/api/auth/callback/email?callbackUrl=http%3A%2F%2Fapp.localhost%3A3000%2Flogin&token=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx&email=youremail@gmail.com" />
  );
}

export function ProjectInvite() {
  return (
    <ProjectInviteEmail
      url="http://app.localhost:3000/api/auth/callback/email?callbackUrl=http%3A%2F%2Fapp.localhost%3A3000%2Flogin&token=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx&email=youremail@gmail.com"
      projectName="Vercel"
    />
  );
}

export function WelcomeEmail() {
  return <WelcomeEmailChild name="Steven Tey" />;
}
