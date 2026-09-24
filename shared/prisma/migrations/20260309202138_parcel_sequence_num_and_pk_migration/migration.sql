-- 1: new columns
ALTER TABLE "Parcel"
ADD COLUMN "newId" TEXT,
ADD COLUMN "sequenceNum" INTEGER;

-- 2: extract sequenceNum
UPDATE "Parcel"
SET "sequenceNum" = CAST(regexp_replace(id, '\D', '', 'g') AS INTEGER);

-- 3: generate UUID v4 (it does not matter that much if its v4 or v7 in this scenario)
UPDATE "Parcel"
SET "newId" = gen_random_uuid();

-- 4: add new FK column to Document
ALTER TABLE "Document"
ADD COLUMN "newParcelId" TEXT;

-- 5: remap document FK
UPDATE "Document" d 
SET "newParcelId" = p."newId"
FROM "Parcel" p
WHERE d."parcelId" = p."id";

-- 6: drop old document FK
ALTER TABLE "Document"
DROP CONSTRAINT "Document_parcelId_fkey";

-- 7: change parcel PK
ALTER TABLE "Parcel"
DROP CONSTRAINT "Parcel_pkey";

ALTER TABLE "Parcel"
DROP COLUMN "id";

ALTER TABLE "Parcel" 
RENAME COLUMN "newId" TO "id";

ALTER TABLE "Parcel"
ADD PRIMARY KEY ("id");

-- 8: update Document FK
ALTER TABLE "Document"
DROP COLUMN "parcelId";

ALTER TABLE "Document"
RENAME COLUMN "newParcelId" TO "parcelId";

ALTER TABLE "Document"
ADD CONSTRAINT "Document_parcelId_fkey"
FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id")
ON DELETE CASCADE;

-- 9: add constraints
ALTER TABLE "Parcel"
ALTER COLUMN "sequenceNum" SET NOT NULL;
