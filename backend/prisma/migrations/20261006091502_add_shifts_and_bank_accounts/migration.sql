-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('PENSION', 'PERSONAL');

-- CreateEnum
CREATE TYPE "SmsTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'OTP', 'MARKETING', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "BankTransactionStatus" AS ENUM ('DETECTED', 'UNMATCHED', 'MATCHED', 'REJECTED', 'DUPLICATE', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "SmsBridgeDeviceStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "bankAccountId" TEXT,
ADD COLUMN     "shiftId" TEXT;

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumberMasked" TEXT NOT NULL,
    "accountIdentifier" TEXT NOT NULL,
    "accountType" "BankAccountType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankSmsRule" (
    "id" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "smsSender" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "amountPattern" TEXT NOT NULL,
    "accountPattern" TEXT,
    "referencePattern" TEXT,
    "datePattern" TEXT,
    "transactionTypePattern" TEXT,
    "creditKeywords" TEXT NOT NULL,
    "debitKeywords" TEXT,
    "bankAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankSmsRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsBridgeDevice" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "SmsBridgeDeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastIp" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "lastSmsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsBridgeDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "transactionReference" TEXT,
    "sender" TEXT NOT NULL,
    "smsText" TEXT NOT NULL,
    "transactionType" "SmsTransactionType" NOT NULL,
    "transactionDate" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "confidence" INTEGER NOT NULL,
    "status" "BankTransactionStatus" NOT NULL DEFAULT 'DETECTED',
    "fingerprint" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "deviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransactionMatch" (
    "id" TEXT NOT NULL,
    "bankTransactionId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "shiftId" TEXT,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankTransactionMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openingCash" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "closingCash" DECIMAL(12,2),
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankAccount_accountType_idx" ON "BankAccount"("accountType");

-- CreateIndex
CREATE INDEX "BankAccount_active_idx" ON "BankAccount"("active");

-- CreateIndex
CREATE INDEX "BankSmsRule_bankAccountId_idx" ON "BankSmsRule"("bankAccountId");

-- CreateIndex
CREATE INDEX "BankSmsRule_enabled_idx" ON "BankSmsRule"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "SmsBridgeDevice_tokenHash_key" ON "SmsBridgeDevice"("tokenHash");

-- CreateIndex
CREATE INDEX "SmsBridgeDevice_status_idx" ON "SmsBridgeDevice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransaction_fingerprint_key" ON "BankTransaction"("fingerprint");

-- CreateIndex
CREATE INDEX "BankTransaction_bankAccountId_idx" ON "BankTransaction"("bankAccountId");

-- CreateIndex
CREATE INDEX "BankTransaction_deviceId_idx" ON "BankTransaction"("deviceId");

-- CreateIndex
CREATE INDEX "BankTransaction_status_idx" ON "BankTransaction"("status");

-- CreateIndex
CREATE INDEX "BankTransaction_transactionReference_idx" ON "BankTransaction"("transactionReference");

-- CreateIndex
CREATE INDEX "BankTransaction_receivedAt_idx" ON "BankTransaction"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransactionMatch_bankTransactionId_key" ON "BankTransactionMatch"("bankTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransactionMatch_paymentId_key" ON "BankTransactionMatch"("paymentId");

-- CreateIndex
CREATE INDEX "BankTransactionMatch_shiftId_idx" ON "BankTransactionMatch"("shiftId");

-- CreateIndex
CREATE INDEX "Shift_userId_idx" ON "Shift"("userId");

-- CreateIndex
CREATE INDEX "Shift_status_idx" ON "Shift"("status");

-- CreateIndex
CREATE INDEX "Shift_openedAt_idx" ON "Shift"("openedAt");

-- CreateIndex
CREATE INDEX "Payment_shiftId_idx" ON "Payment"("shiftId");

-- CreateIndex
CREATE INDEX "Payment_bankAccountId_idx" ON "Payment"("bankAccountId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankSmsRule" ADD CONSTRAINT "BankSmsRule_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "SmsBridgeDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransactionMatch" ADD CONSTRAINT "BankTransactionMatch_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransactionMatch" ADD CONSTRAINT "BankTransactionMatch_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransactionMatch" ADD CONSTRAINT "BankTransactionMatch_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
