-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkID" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "report" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("report")
);

-- CreateTable
CREATE TABLE "Ticker" (
    "ticker" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "industry" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "logoURL" TEXT NOT NULL,
    "rawScore" DOUBLE PRECISION NOT NULL,
    "cik" TEXT NOT NULL,
    "lastSync" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticker_pkey" PRIMARY KEY ("ticker")
);

-- CreateTable
CREATE TABLE "ReportedTicker" (
    "tickerSymbol" TEXT NOT NULL,
    "reportID" TEXT NOT NULL,

    CONSTRAINT "ReportedTicker_pkey" PRIMARY KEY ("reportID","tickerSymbol")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkID_key" ON "User"("clerkID");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Ticker_company_key" ON "Ticker"("company");

-- CreateIndex
CREATE UNIQUE INDEX "Ticker_cik_key" ON "Ticker"("cik");

-- CreateIndex
CREATE INDEX "report_ticker_idx" ON "ReportedTicker"("reportID", "tickerSymbol");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportedTicker" ADD CONSTRAINT "ReportedTicker_tickerSymbol_fkey" FOREIGN KEY ("tickerSymbol") REFERENCES "Ticker"("ticker") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportedTicker" ADD CONSTRAINT "ReportedTicker_reportID_fkey" FOREIGN KEY ("reportID") REFERENCES "Report"("report") ON DELETE RESTRICT ON UPDATE CASCADE;
