
SELECT cron.schedule(
    'weekly_payout_job', -- Job name
    --'0 12 * * 2',       -- CRON expression (Every Friday at 1:50 PM)
    '0 12 * * 2',
    $$INSERT INTO payout (partner_id, partner_name, total_sold, total_revenue, total_commission, final_payamount, startdate, enddate, status)
    SELECT
        p.id AS partner_id,
        p.name AS partner_name,
        SUM(o.count) AS total_sold,
        SUM(o.final_amount) AS total_revenue,
        SUM(o.charges_amount) AS total_commission,
        SUM(o.net_amount) AS final_payamount,
        date_trunc('second', NOW() - INTERVAL '7 days')::timestamp AS startdate,
        date_trunc('second', NOW())::timestamp AS enddate,
        'PENDING' AS status
    FROM "order" o
    JOIN partner p ON o.partner_id = p.id
    WHERE
        o.status = 'COMPLETED' AND
        o.purchase_at BETWEEN NOW() - INTERVAL '7 days' AND NOW()
    GROUP BY p.id, p.name
    ORDER BY p.id;$$
);