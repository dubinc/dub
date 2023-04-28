import { default as FeedbackEmailChild } from "../FeedbackEmail";
import { default as InvalidDomainEmail } from "../InvalidDomain";
import { default as DomainDeletedEmail } from "../DomainDeleted";
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

export function DomainDeleted() {
  return <DomainDeletedEmail domain="google.com" projectSlug="google" />;
}

export function UsageExceeded() {
  return (
    <UsageExceededEmail
      project={{
        id: "123",
        name: "Steven Tey",
        slug: "steven",
        plan: "free",
        usage: 2406,
        usageLimit: 1000,
      }}
      type="first"
    />
  );
}

export function FeedbackEmail() {
  return (
    <FeedbackEmailChild
      email="steven@dub.sh"
      feedback="This is a 
test feedback email"
    />
  );
}
