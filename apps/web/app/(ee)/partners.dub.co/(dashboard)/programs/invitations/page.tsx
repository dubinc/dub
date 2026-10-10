import { redirect } from "next/navigation";

// invitations are now a tab on the Programs page
export default function ProgramInvitationsPage() {
  redirect("/programs?tab=invitations");
}
