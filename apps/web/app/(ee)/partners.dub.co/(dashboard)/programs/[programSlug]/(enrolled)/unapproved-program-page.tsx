import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { useParams } from "next/navigation";

export function UnapprovedProgramPage() {
  const { programSlug } = useParams();
  const { programEnrollment, error, loading } = useProgramEnrollment();

  return "unapproved!";
}
