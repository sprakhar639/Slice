CREATE TYPE "Role" AS ENUM ('VIEWER', 'MEMBER', 'LEAD', 'ADMIN');
CREATE TYPE "ItemType" AS ENUM ('INCIDENT', 'CUSTOMER_ISSUE', 'PAYMENT', 'COMPLIANCE', 'TASK');
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "Status" AS ENUM ('OPEN', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'RESOLVED', 'CLOSED');
CREATE TYPE "EventType" AS ENUM ('CREATED', 'STATUS_CHANGE', 'ASSIGNEE_CHANGE', 'PRIORITY_CHANGE', 'FIELDS_UPDATED', 'COMMENT');

CREATE TABLE "User" (
  "id" SERIAL NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Team" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Membership" (
  "userId" INTEGER NOT NULL,
  "teamId" INTEGER NOT NULL,
  "role" "Role" NOT NULL,
  CONSTRAINT "Membership_pkey" PRIMARY KEY ("userId", "teamId")
);
CREATE TABLE "WorkItem" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "type" "ItemType" NOT NULL,
  "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
  "status" "Status" NOT NULL DEFAULT 'OPEN',
  "teamId" INTEGER NOT NULL,
  "assigneeId" INTEGER,
  "createdById" INTEGER NOT NULL,
  "dueDate" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Activity" (
  "id" SERIAL NOT NULL,
  "workItemId" INTEGER NOT NULL,
  "actorId" INTEGER NOT NULL,
  "type" "EventType" NOT NULL,
  "data" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");
CREATE INDEX "WorkItem_teamId_status_idx" ON "WorkItem"("teamId", "status");
CREATE INDEX "WorkItem_assigneeId_status_idx" ON "WorkItem"("assigneeId", "status");
CREATE INDEX "WorkItem_priority_status_idx" ON "WorkItem"("priority", "status");
CREATE INDEX "Activity_workItemId_createdAt_idx" ON "Activity"("workItemId", "createdAt");

ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
