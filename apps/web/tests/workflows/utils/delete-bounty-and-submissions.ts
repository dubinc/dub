import { HttpClient } from "../../utils/http";

// special function to delete a bounty and all associated submissions (only for e2e tests)
export const deleteBountyAndSubmissions = async ({
  http,
  bountyId,
  query = {},
}: {
  http: HttpClient;
  bountyId: string;
  query?: Record<string, string>;
}) => {
  await http.delete({
    path: `/e2e/bounties/${bountyId}`,
    query,
  });
};
