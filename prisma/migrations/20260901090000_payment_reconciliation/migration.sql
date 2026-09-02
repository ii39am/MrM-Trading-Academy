CREATE TYPE "PaymentUpdateSource" AS ENUM ('WEBHOOK', 'RECONCILIATION');

ALTER TABLE "Purchase"
ADD COLUMN "lastReconciledAt" TIMESTAMP(3),
ADD COLUMN "nextReconcileAt" TIMESTAMP(3),
ADD COLUMN "reconcileAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "reconciliationErrorCode" TEXT;

ALTER TABLE "PaymentTransaction"
ADD COLUMN "source" "PaymentUpdateSource" NOT NULL DEFAULT 'WEBHOOK';

CREATE INDEX "Purchase_status_nextReconcileAt_createdAt_idx"
ON "Purchase"("status", "nextReconcileAt", "createdAt");
