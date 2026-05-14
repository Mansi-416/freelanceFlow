-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "billed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "invoiceId" INTEGER;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
