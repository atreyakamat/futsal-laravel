-- CreateTable
CREATE TABLE "document_sequences" (
    "id" SERIAL NOT NULL,
    "doc_type" TEXT NOT NULL,
    "fiscal_year" TEXT NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_invoices" (
    "id" SERIAL NOT NULL,
    "booking_ref" TEXT NOT NULL,
    "invoice_no" TEXT NOT NULL,
    "issue_datetime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gross_amount" DECIMAL(10,2) NOT NULL,
    "taxable_value" DECIMAL(10,2) NOT NULL,
    "cgst" DECIMAL(10,2) NOT NULL,
    "sgst" DECIMAL(10,2) NOT NULL,
    "igst" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "rate" DECIMAL(5,2) NOT NULL,
    "hsn_sac" TEXT NOT NULL,
    "place_of_supply" TEXT NOT NULL,
    "gstin" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "registered_address" TEXT,
    "customer_name" TEXT NOT NULL,
    "customer_mobile" TEXT NOT NULL,
    "customer_email" TEXT,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" SERIAL NOT NULL,
    "booking_ref" TEXT NOT NULL,
    "linked_invoice_id" INTEGER NOT NULL,
    "note_no" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(10,2) NOT NULL,
    "taxable_value_reversed" DECIMAL(10,2) NOT NULL,
    "cgst_reversed" DECIMAL(10,2) NOT NULL,
    "sgst_reversed" DECIMAL(10,2) NOT NULL,
    "igst_reversed" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_sequences_doc_type_fiscal_year_key" ON "document_sequences"("doc_type", "fiscal_year");

-- CreateIndex
CREATE UNIQUE INDEX "tax_invoices_invoice_no_key" ON "tax_invoices"("invoice_no");

-- CreateIndex
CREATE INDEX "tax_invoices_booking_ref_idx" ON "tax_invoices"("booking_ref");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_note_no_key" ON "credit_notes"("note_no");

-- CreateIndex
CREATE INDEX "credit_notes_booking_ref_idx" ON "credit_notes"("booking_ref");

-- CreateIndex
CREATE INDEX "credit_notes_linked_invoice_id_idx" ON "credit_notes"("linked_invoice_id");
