-- Confirmed local calendar dates are independent of optional playing hours.
ALTER TABLE members ADD COLUMN days_off TEXT NOT NULL DEFAULT '[]';
