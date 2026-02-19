import { HttpClient } from "../../utils/http";

// special function to delete a bounty and all associated submissions (only for e2e tests)
export const deleteBountyAndSubmissions = async ({
  http,
  bountyId,
}: {
  http: HttpClient;
  bountyId: string;
}) => {
  await http.delete({
    path: `/e2e/bounties/${bountyId}`,
  });
};
