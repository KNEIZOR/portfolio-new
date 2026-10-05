CREATE TYPE "Locale" AS ENUM ('en', 'ru', 'hy');
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Project" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "role" TEXT NOT NULL,
  "client" TEXT,
  "liveUrl" TEXT,
  "githubUrl" TEXT,
  "coverImage" TEXT,
  "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProjectTranslation" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "locale" "Locale" NOT NULL,
  "title" TEXT NOT NULL,
  "shortDescription" TEXT NOT NULL,
  "fullDescription" TEXT NOT NULL,
  "challenge" TEXT NOT NULL,
  "solution" TEXT NOT NULL,
  "technicalApproach" TEXT NOT NULL,
  "seoTitle" TEXT NOT NULL DEFAULT '',
  "seoDescription" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectTranslation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProjectImage" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ProjectImage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProjectImageTranslation" (
  "id" TEXT NOT NULL,
  "projectImageId" TEXT NOT NULL,
  "locale" "Locale" NOT NULL,
  "alt" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "ProjectImageTranslation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Technology" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "Technology_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProjectTechnology" (
  "projectId" TEXT NOT NULL,
  "technologyId" TEXT NOT NULL,
  CONSTRAINT "ProjectTechnology_pkey" PRIMARY KEY ("projectId", "technologyId")
);
CREATE TABLE "ProjectFeature" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ProjectFeature_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProjectFeatureTranslation" (
  "id" TEXT NOT NULL,
  "featureId" TEXT NOT NULL,
  "locale" "Locale" NOT NULL,
  "text" TEXT NOT NULL,
  CONSTRAINT "ProjectFeatureTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE INDEX "Project_status_updatedAt_idx" ON "Project"("status", "updatedAt");
CREATE UNIQUE INDEX "ProjectTranslation_projectId_locale_key" ON "ProjectTranslation"("projectId", "locale");
CREATE INDEX "ProjectTranslation_locale_idx" ON "ProjectTranslation"("locale");
CREATE INDEX "ProjectImage_projectId_order_idx" ON "ProjectImage"("projectId", "order");
CREATE UNIQUE INDEX "ProjectImageTranslation_projectImageId_locale_key" ON "ProjectImageTranslation"("projectImageId", "locale");
CREATE UNIQUE INDEX "Technology_name_key" ON "Technology"("name");
CREATE INDEX "ProjectFeature_projectId_order_idx" ON "ProjectFeature"("projectId", "order");
CREATE UNIQUE INDEX "ProjectFeatureTranslation_featureId_locale_key" ON "ProjectFeatureTranslation"("featureId", "locale");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTranslation" ADD CONSTRAINT "ProjectTranslation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectImage" ADD CONSTRAINT "ProjectImage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectImageTranslation" ADD CONSTRAINT "ProjectImageTranslation_projectImageId_fkey" FOREIGN KEY ("projectImageId") REFERENCES "ProjectImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTechnology" ADD CONSTRAINT "ProjectTechnology_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTechnology" ADD CONSTRAINT "ProjectTechnology_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectFeature" ADD CONSTRAINT "ProjectFeature_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectFeatureTranslation" ADD CONSTRAINT "ProjectFeatureTranslation_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "ProjectFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
