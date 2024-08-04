-- CreateEnum
CREATE TYPE "Role" AS ENUM ('owner', 'member');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "avatar" TEXT,
    "externalId" TEXT,
    "projectId" TEXT NOT NULL,
    "projectConnectId" TEXT,
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "placeholder" TEXT NOT NULL DEFAULT 'https://dub.co/help/article/what-is-dub',
    "expiredUrl" TEXT,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefaultDomains" (
    "id" TEXT NOT NULL,
    "dublink" BOOLEAN NOT NULL DEFAULT false,
    "dubsh" BOOLEAN NOT NULL DEFAULT true,
    "chatgpt" BOOLEAN NOT NULL DEFAULT true,
    "sptifi" BOOLEAN NOT NULL DEFAULT true,
    "gitnew" BOOLEAN NOT NULL DEFAULT true,
    "amznid" BOOLEAN NOT NULL DEFAULT true,
    "ggllink" BOOLEAN NOT NULL DEFAULT true,
    "figpage" BOOLEAN NOT NULL DEFAULT true,
    "loooooooong" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "DefaultDomains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jackson_index" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(250) NOT NULL,
    "storeKey" VARCHAR(250) NOT NULL,

    CONSTRAINT "jackson_index_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jackson_store" (
    "key" VARCHAR(250) NOT NULL,
    "value" TEXT NOT NULL,
    "iv" VARCHAR(64),
    "tag" VARCHAR(64),
    "namespace" VARCHAR(64),
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifiedAt" TIMESTAMP(0),

    CONSTRAINT "jackson_store_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "jackson_ttl" (
    "key" VARCHAR(250) NOT NULL,
    "expiresAt" BIGINT NOT NULL,

    CONSTRAINT "jackson_ttl_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Link" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "expiredUrl" TEXT,
    "password" TEXT,
    "externalId" TEXT,
    "trackConversion" BOOLEAN NOT NULL DEFAULT false,
    "proxy" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "description" VARCHAR(280),
    "image" TEXT,
    "video" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_term" TEXT,
    "utm_content" TEXT,
    "rewrite" BOOLEAN NOT NULL DEFAULT false,
    "doIndex" BOOLEAN NOT NULL DEFAULT false,
    "ios" TEXT,
    "android" TEXT,
    "geo" JSON,
    "userId" TEXT,
    "projectId" TEXT,
    "publicStats" BOOLEAN NOT NULL DEFAULT false,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "lastClicked" TIMESTAMP(3),
    "leads" INTEGER NOT NULL DEFAULT 0,
    "sales" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "comments" TEXT,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthApp" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "readme" TEXT,
    "developer" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "hashedClientSecret" TEXT NOT NULL,
    "partialClientSecret" TEXT NOT NULL,
    "redirectUris" JSONB NOT NULL,
    "logo" TEXT,
    "screenshots" JSONB,
    "pkce" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "OAuthApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthCode" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "scopes" TEXT,
    "redirectUri" TEXT NOT NULL,
    "codeChallenge" TEXT,
    "codeChallengeMethod" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthRefreshToken" (
    "id" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "accessTokenId" TEXT NOT NULL,
    "hashedRefreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAuthorizedApp" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAuthorizedApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "isMachine" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT,
    "invalidLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscribed" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "defaultWorkspace" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "refresh_token_expires_in" INTEGER,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkTag" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "linkId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "LinkTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hashedKey" TEXT NOT NULL,
    "partialKey" TEXT NOT NULL,
    "expires" TIMESTAMP(3),
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestrictedToken" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hashedKey" TEXT NOT NULL,
    "partialKey" TEXT NOT NULL,
    "scopes" TEXT,
    "expires" TIMESTAMP(3),
    "lastUsed" TIMESTAMP(3),
    "rateLimit" INTEGER NOT NULL DEFAULT 600,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "installationId" TEXT,

    CONSTRAINT "RestrictedToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "stripeId" TEXT,
    "billingCycleStart" INTEGER NOT NULL,
    "stripeConnectId" TEXT,
    "inviteCode" TEXT,
    "usage" INTEGER NOT NULL DEFAULT 0,
    "usageLimit" INTEGER NOT NULL DEFAULT 1000,
    "aiUsage" INTEGER NOT NULL DEFAULT 0,
    "aiLimit" INTEGER NOT NULL DEFAULT 10,
    "linksUsage" INTEGER NOT NULL DEFAULT 0,
    "linksLimit" INTEGER NOT NULL DEFAULT 25,
    "domainsLimit" INTEGER NOT NULL DEFAULT 3,
    "tagsLimit" INTEGER NOT NULL DEFAULT 5,
    "usersLimit" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "usageLastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectInvite" (
    "email" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProjectUsers" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ProjectUsers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentEmail" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT,

    CONSTRAINT "SentEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "projectUserId" TEXT NOT NULL,
    "linkUsageSummary" BOOLEAN NOT NULL DEFAULT true,
    "domainConfigurationUpdates" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_stripeCustomerId_key" ON "Customer"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Customer_projectId_idx" ON "Customer"("projectId");

-- CreateIndex
CREATE INDEX "Customer_projectConnectId_idx" ON "Customer"("projectConnectId");

-- CreateIndex
CREATE INDEX "Customer_externalId_idx" ON "Customer"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_projectId_externalId_key" ON "Customer"("projectId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_projectConnectId_externalId_key" ON "Customer"("projectConnectId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_slug_key" ON "Domain"("slug");

-- CreateIndex
CREATE INDEX "Domain_projectId_idx" ON "Domain"("projectId");

-- CreateIndex
CREATE INDEX "Domain_lastChecked_idx" ON "Domain"("lastChecked" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DefaultDomains_projectId_key" ON "DefaultDomains"("projectId");

-- CreateIndex
CREATE INDEX "_jackson_index_key" ON "jackson_index"("key");

-- CreateIndex
CREATE INDEX "_jackson_index_key_store" ON "jackson_index"("key", "storeKey");

-- CreateIndex
CREATE INDEX "_jackson_store_namespace" ON "jackson_store"("namespace");

-- CreateIndex
CREATE INDEX "_jackson_ttl_expires_at" ON "jackson_ttl"("expiresAt");

-- CreateIndex
CREATE INDEX "Link_projectId_idx" ON "Link"("projectId");

-- CreateIndex
CREATE INDEX "Link_domain_idx" ON "Link"("domain");

-- CreateIndex
CREATE INDEX "Link_trackConversion_idx" ON "Link"("trackConversion");

-- CreateIndex
CREATE INDEX "Link_proxy_idx" ON "Link"("proxy");

-- CreateIndex
CREATE INDEX "Link_password_idx" ON "Link"("password");

-- CreateIndex
CREATE INDEX "Link_archived_idx" ON "Link"("archived");

-- CreateIndex
CREATE INDEX "Link_createdAt_idx" ON "Link"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Link_clicks_idx" ON "Link"("clicks" DESC);

-- CreateIndex
CREATE INDEX "Link_lastClicked_idx" ON "Link"("lastClicked");

-- CreateIndex
CREATE INDEX "Link_userId_idx" ON "Link"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Link_domain_key_key" ON "Link"("domain", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Link_projectId_externalId_key" ON "Link"("projectId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthApp_clientId_key" ON "OAuthApp"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthApp_slug_key" ON "OAuthApp"("slug");

-- CreateIndex
CREATE INDEX "OAuthApp_projectId_idx" ON "OAuthApp"("projectId");

-- CreateIndex
CREATE INDEX "OAuthApp_userId_idx" ON "OAuthApp"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthCode_code_key" ON "OAuthCode"("code");

-- CreateIndex
CREATE INDEX "OAuthCode_clientId_idx" ON "OAuthCode"("clientId");

-- CreateIndex
CREATE INDEX "OAuthCode_userId_idx" ON "OAuthCode"("userId");

-- CreateIndex
CREATE INDEX "OAuthCode_projectId_idx" ON "OAuthCode"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthRefreshToken_hashedRefreshToken_key" ON "OAuthRefreshToken"("hashedRefreshToken");

-- CreateIndex
CREATE INDEX "OAuthRefreshToken_installationId_idx" ON "OAuthRefreshToken"("installationId");

-- CreateIndex
CREATE INDEX "OAuthRefreshToken_accessTokenId_idx" ON "OAuthRefreshToken"("accessTokenId");

-- CreateIndex
CREATE INDEX "OAuthAuthorizedApp_clientId_idx" ON "OAuthAuthorizedApp"("clientId");

-- CreateIndex
CREATE INDEX "OAuthAuthorizedApp_projectId_idx" ON "OAuthAuthorizedApp"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAuthorizedApp_userId_projectId_clientId_key" ON "OAuthAuthorizedApp"("userId", "projectId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_source_idx" ON "User"("source");

-- CreateIndex
CREATE INDEX "User_defaultWorkspace_idx" ON "User"("defaultWorkspace");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Tag_projectId_idx" ON "Tag"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_projectId_key" ON "Tag"("name", "projectId");

-- CreateIndex
CREATE INDEX "LinkTag_linkId_idx" ON "LinkTag"("linkId");

-- CreateIndex
CREATE INDEX "LinkTag_tagId_idx" ON "LinkTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "LinkTag_linkId_tagId_key" ON "LinkTag"("linkId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Token_hashedKey_key" ON "Token"("hashedKey");

-- CreateIndex
CREATE INDEX "Token_userId_idx" ON "Token"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RestrictedToken_hashedKey_key" ON "RestrictedToken"("hashedKey");

-- CreateIndex
CREATE INDEX "RestrictedToken_userId_idx" ON "RestrictedToken"("userId");

-- CreateIndex
CREATE INDEX "RestrictedToken_projectId_idx" ON "RestrictedToken"("projectId");

-- CreateIndex
CREATE INDEX "RestrictedToken_installationId_idx" ON "RestrictedToken"("installationId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Project_stripeId_key" ON "Project"("stripeId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_stripeConnectId_key" ON "Project"("stripeConnectId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_inviteCode_key" ON "Project"("inviteCode");

-- CreateIndex
CREATE INDEX "Project_usageLastChecked_idx" ON "Project"("usageLastChecked" ASC);

-- CreateIndex
CREATE INDEX "ProjectInvite_projectId_idx" ON "ProjectInvite"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectInvite_email_projectId_key" ON "ProjectInvite"("email", "projectId");

-- CreateIndex
CREATE INDEX "ProjectUsers_projectId_idx" ON "ProjectUsers"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectUsers_userId_projectId_key" ON "ProjectUsers"("userId", "projectId");

-- CreateIndex
CREATE INDEX "SentEmail_projectId_idx" ON "SentEmail"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_projectUserId_key" ON "NotificationPreference"("projectUserId");
