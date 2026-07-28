-- CreateTable
CREATE TABLE "DevLog" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "logDate" DATE NOT NULL,
    "learnedNote" TEXT NOT NULL,
    "troubleshootingNote" TEXT,
    "tomorrowTask" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevLogTag" (
    "devLogId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "DevLogTag_pkey" PRIMARY KEY ("devLogId","tagId")
);

-- CreateIndex
CREATE INDEX "DevLog_ownerId_idx" ON "DevLog"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_normalized_key" ON "Tag"("normalized");

-- AddForeignKey
ALTER TABLE "DevLogTag" ADD CONSTRAINT "DevLogTag_devLogId_fkey" FOREIGN KEY ("devLogId") REFERENCES "DevLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevLogTag" ADD CONSTRAINT "DevLogTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
