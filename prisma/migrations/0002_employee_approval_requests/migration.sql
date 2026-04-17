-- CreateTable
CREATE TABLE "EmployeeApprovalRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestedByUserId" TEXT,
    "requestedByEmail" TEXT NOT NULL,
    "requestedByName" TEXT NOT NULL,
    "approverRole" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'SUBMITTED',
    "payload" JSONB NOT NULL,
    "approvedEmployeeId" TEXT,
    "decisionComments" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeApprovalRequest_tenantId_status_createdAt_idx" ON "EmployeeApprovalRequest"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "EmployeeApprovalRequest_requestedByUserId_createdAt_idx" ON "EmployeeApprovalRequest"("requestedByUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "EmployeeApprovalRequest" ADD CONSTRAINT "EmployeeApprovalRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeApprovalRequest" ADD CONSTRAINT "EmployeeApprovalRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
