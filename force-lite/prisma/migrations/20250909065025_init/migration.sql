-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'COLLECTOR',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Artwork" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "slug" TEXT,
    "title" TEXT,
    "description" TEXT,
    "price" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "isPriceNegotiable" BOOLEAN DEFAULT false,
    "minPrice" DECIMAL,
    "maxPrice" DECIMAL,
    "dimensions" JSONB DEFAULT {},
    "location" TEXT,
    "medium" TEXT,
    "dateInfo" JSONB,
    "signatureInfo" JSONB,
    "framingInfo" JSONB,
    "provenance" TEXT DEFAULT 'From the artist',
    "currency" TEXT DEFAULT 'ZAR',
    "editionInfo" JSONB,
    "genre" TEXT,
    "dominantColors" JSONB,
    "keywords" JSONB,
    "framedDimensions" JSONB,
    "colorGroups" JSONB,
    "inventoryNumber" TEXT,
    "privateNote" TEXT,
    "provenanceNotes" TEXT,
    "exhibitions" JSONB,
    "literature" JSONB,
    "subject" TEXT,
    "orientation" TEXT,
    "hasCertificateOfAuthenticity" BOOLEAN DEFAULT false,
    "certificateOfAuthenticityDetails" TEXT,
    "condition" TEXT,
    "conditionNotes" TEXT,
    "rarity" TEXT DEFAULT 'unique',
    "framingStatus" TEXT DEFAULT 'unframed',
    "embedding" JSONB,
    "primaryImageUrl" TEXT,
    "currentLocationId" TEXT,
    CONSTRAINT "Artwork_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArtworkImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artworkId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "watermarkedImageUrl" TEXT,
    "visualizationImageUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ArtworkImage_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArtistFollow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "followerId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArtistFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ArtistFollow_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "eventName" TEXT NOT NULL,
    "eventDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "relatedId" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "tags" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "contentHtml" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    CONSTRAINT "Campaign_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignRecipient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" DATETIME,
    "openedAt" DATETIME,
    "clickedAt" DATETIME,
    CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignRecipient_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Artwork_slug_key" ON "Artwork"("slug");

-- CreateIndex
CREATE INDEX "idx_artwork_images_artwork_id" ON "ArtworkImage"("artworkId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtworkImage_artworkId_position_key" ON "ArtworkImage"("artworkId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ArtistFollow_followerId_artistId_key" ON "ArtistFollow"("followerId", "artistId");
