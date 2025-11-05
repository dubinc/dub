import { checkFeaturesAccessAuthLess } from "@/lib/actions/check-features-access-auth-less";
import { getQrs } from "@/lib/api/qrs/get-qrs";
import { getSession } from "@/lib/auth";
import { PageContent } from "@/ui/layout/page-content";
import { PageViewedTrackerComponent } from "core/integration/analytic/components/page-viewed-tracker";
import { getUserCookieService } from "core/services/cookie/user-session.service";
import { Viewport } from "next";
import WorkspaceQRsClient from "./custom-page-client";
import { LinksTitle } from "./links-title";
import { getQrDataFromRedis } from '@/lib/actions/pre-checkout-flow/get-qr-data-from-redis';
import { QRBuilderData } from '@/ui/qr-builder/types/types';
import { getWorkspace } from '@/lib/fetchers';
import { createQrWithLinkUniversal } from '@/lib/api/qrs/create-qr-with-link-universal';
import { R2_URL } from '@dub/utils';
import { WorkspaceProps } from '@/lib/types';
import { removeQrDataFromRedis } from '@/lib/actions/pre-checkout-flow/remove-qr-data-from-redis';

export const viewport: Viewport = {
  themeColor: "#f6f6f7",
};

const WorkspaceQRsPage = async () => {
  const { user: authUser } = await getSession();
  const { sessionId, user } = await getUserCookieService();

  console.log("authUser", authUser);

  const { qrData: qrDataFromLanding } = await getQrDataFromRedis(authUser.id, "qr-from-landing") as { qrData: QRBuilderData | null };
  console.log("qrDataFromLanding", qrDataFromLanding);
  const workspace = await getWorkspace({ slug: authUser.defaultWorkspace as string });

  console.log("workspace", workspace);

  const linkUrl = qrDataFromLanding?.fileId
    ? `${R2_URL}/qrs-content/${qrDataFromLanding.fileId}`
    : (qrDataFromLanding!.styles!.data! as string);

  const qrCreateResponse = await createQrWithLinkUniversal({
    qrData: {
      data: qrDataFromLanding?.styles?.data as string,
      qrType: qrDataFromLanding?.qrType as any,
      title: qrDataFromLanding?.title,
      description: undefined,
      styles: qrDataFromLanding?.styles,
      frameOptions: qrDataFromLanding?.frameOptions,
      fileId: qrDataFromLanding?.fileId,
      link: {
        url: linkUrl,
      },
    },
    linkData: {
      url: linkUrl,
    },
    workspace: workspace as Pick<
      WorkspaceProps,
      "id" | "plan" | "flags"
    >,
    userId: authUser.id,
  });

  console.log("qrCreateResponse", qrCreateResponse);

  removeQrDataFromRedis(authUser.id, "qr-from-landing");

  const qrs = await getQrs({
    userId: authUser.id,
    sort: "createdAt",
    sortBy: "createdAt",
    sortOrder: "desc",
    showArchived: true,
    withTags: false,
    page: 1,
    pageSize: 100,
  }, {
    includeFile: true,
  });

  const featuresAccess = await checkFeaturesAccessAuthLess(authUser.id);

  return (
    <>
      <PageContent title={<LinksTitle />}>
        <WorkspaceQRsClient
          initialQrs={qrs as any}
          featuresAccess={featuresAccess}
          user={authUser}
          cookieUser={user}
        />
      </PageContent>
      <PageViewedTrackerComponent
        sessionId={sessionId!}
        pageName="dashboard"
        params={{
          event_category: "Authorized",
          email: user?.email!,
          content_group: "my_qr_codes",
        }}
      />
    </>
  );
};

export default WorkspaceQRsPage;
