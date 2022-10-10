import { default as InvalidDomainEmail } from "../InvalidDomain";
import { default as ProjectDeletedEmail } from "../ProjectDeleted";
import { default as UsageExceededEmail } from "../UsageExceeded";

export function InvalidDomain() {
  return (
    <InvalidDomainEmail
      domain="google.com"
      projectSlug="google"
      invalidDays={14}
    />
  );
}

export function ProjectDeleted() {
  return <ProjectDeletedEmail domain="google.com" projectSlug="google" />;
}

export function UsageExceeded() {
  return <UsageExceededEmail usage={2406} usageLimit={1000} type="first" />;
}
