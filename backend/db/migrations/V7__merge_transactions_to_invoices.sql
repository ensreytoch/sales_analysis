-- Remove the standalone Transactions menu entry; items are now
-- accessible via the expand button on the Invoices page.
DELETE FROM menus WHERE path = '/transactions';