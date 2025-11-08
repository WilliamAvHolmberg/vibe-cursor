-- CreateEnum
CREATE TYPE "OrchestrationStatus" AS ENUM ('PLANNING', 'AWAITING_FOLLOWUP', 'AWAITING_APPROVAL', 'EXECUTING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('PENDING', 'CREATING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "cursorApiKey" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orchestration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "ref" TEXT NOT NULL DEFAULT 'main',
    "initialPrompt" TEXT NOT NULL,
    "status" "OrchestrationStatus" NOT NULL,
    "planningAgentId" TEXT,
    "planningOutput" JSONB,
    "approvedPlan" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Orchestration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpMessage" (
    "id" TEXT NOT NULL,
    "orchestrationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "orchestrationId" TEXT NOT NULL,
    "parentAgentId" TEXT,
    "cursorAgentId" TEXT,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL,
    "branchName" TEXT,
    "pullRequestUrl" TEXT,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentStatusUpdate" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentStatusUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrchestrationEvent" (
    "id" TEXT NOT NULL,
    "orchestrationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrchestrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orchestration" ADD CONSTRAINT "Orchestration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpMessage" ADD CONSTRAINT "FollowUpMessage_orchestrationId_fkey" FOREIGN KEY ("orchestrationId") REFERENCES "Orchestration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_orchestrationId_fkey" FOREIGN KEY ("orchestrationId") REFERENCES "Orchestration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_parentAgentId_fkey" FOREIGN KEY ("parentAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentStatusUpdate" ADD CONSTRAINT "AgentStatusUpdate_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrchestrationEvent" ADD CONSTRAINT "OrchestrationEvent_orchestrationId_fkey" FOREIGN KEY ("orchestrationId") REFERENCES "Orchestration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
