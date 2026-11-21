-- Cumulative square-foot execution evidence for subcontractor field updates.
ALTER TABLE public.order_locations
  ADD COLUMN IF NOT EXISTS completed_area_sqft numeric(14,2) DEFAULT 0
    CHECK (completed_area_sqft IS NULL OR completed_area_sqft >= 0);
ALTER TABLE public.work_updates
  ADD COLUMN IF NOT EXISTS completed_area_sqft numeric(14,2)
    CHECK (completed_area_sqft IS NULL OR completed_area_sqft >= 0);
ALTER TABLE public.work_photos
  ADD COLUMN IF NOT EXISTS completed_area_sqft numeric(14,2)
    CHECK (completed_area_sqft IS NULL OR completed_area_sqft >= 0);
-- Historical progress percentages and images stay unchanged.
