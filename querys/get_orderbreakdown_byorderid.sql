create
or replace function get_orderbreakdown_byorderid (input_order_id uuid) returns table (
stadium_zone_name text,
unit_price float,
ticket_count int,
subtotal float,
fee float
) as $$
BEGIN
RETURN QUERY
SELECT
sz.name AS stadium_zone_name,
t.unitprice AS unit_price,
COUNT(t.id)::INTEGER AS ticket_count,  -- Cast to INTEGER
CASE
WHEN p.commission_rate != 0 THEN
CASE
WHEN p.commission_type = 'PASSON' THEN
(p.commission_rate * 0.01 * t.unitprice * COUNT(t.id) + (t.unitprice * COUNT(t.id)))
-- WHEN p.commission_type = 'ABSORB' THEN
--((t.unitprice * COUNT(t.id)) - p.commission_rate * 0.01 * t.unitprice * COUNT(t.id))
ELSE
(t.unitprice * COUNT(t.id)) -- Default case
END
ELSE
(t.unitprice * COUNT(t.id)) -- When commission_rate = 0
END AS subtotal,
CASE
WHEN p.commission_rate != 0 THEN
CASE
WHEN p.commission_type = 'PASSON' THEN
(p.commission_rate * 0.01 * t.unitprice * COUNT(t.id))
ELSE
0 -- Default case
END
ELSE
0 -- When commission_rate = 0
END AS fee
FROM
ticket t
JOIN
partner p ON t.partner_id = p.id
JOIN
stadium_zone sz ON t.stadium_zone_id = sz.id
WHERE
t.order_id = input_order_id
GROUP BY
sz.name, t.unitprice, p.commission_rate, p.commission_type;
END;
$$ language plpgsql;