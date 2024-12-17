// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { verify } from "https://deno.land/x/djwt@v2.4/mod.ts";
//const Allow_origin_url_prd="https://kickoff.in.th"
//const Allow_origin_url_prd = "https://loop-ticketing-test-3hanuu.flutterflow.app";
const Allow_origin_url_prd = "*";
//import { qrcode } from "https://deno.land/x/qrcode@v2.0.0/mod.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);

const JWT_SECRET = Deno.env.get("JWT_SECRET");

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret); // Encode the secret as Uint8Array
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign", "verify"],
  );
}

let isError = false;
const orderId = crypto.randomUUID(); // Using crypto.randomUUID() to generate a UUID

const STATUS_PENDING = "PENDING";

interface TicketBuyModel {
  zoneId: string;
  buyCount: number;
  ticketsAmount: number;
}

async function userBuyTicket(req: Request): Promise<Response> {
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const {
        pEventId,
        pPartnerId,
        pUserId,
        displayName,
        pTotalAmount,
        lstTicket,
        pNetAmount,
        pChargeAmount,
      } = body;

      let tickets: TicketBuyModel[] = [];

      try {
        // Parse the JSON string into an array of TicketBuyModel
        const parsedTickets = JSON.parse(lstTicket);

        // Map the parsed array to the TicketBuyModel[] type
        // deno-lint-ignore no-explicit-any
        tickets = parsedTickets.map((ticket: any) => ({
          zoneId: ticket.zoneId,
          buyCount: ticket.buyCount,
          ticketsAmount: ticket.ticketsAmount,
        }));
        // deno-lint-ignore no-unused-vars
      } catch (error) {
        throw new Error(lstTicket + " -- Invalid JSON format for lstTicket");
      }

      let totalticket = 0;

      for (const ticket of tickets) {
        const { zoneId, buyCount, ticketsAmount } = ticket;
        for (let i = 0; i < buyCount; i++) {
          totalticket++;
        }
      }

      // Step 1: Insert into "order" table
      const orderInsert = await supabase
        .from("order")
        .insert([{
          id: orderId,
          user_id: pUserId,
          partner_id: pPartnerId,
          event_id: pEventId,
          count: totalticket,
          total_amount: pTotalAmount,
          net_amount: pNetAmount,
          charges_amount: pChargeAmount,
          status: STATUS_PENDING,
        }]);

      if (orderInsert.error) {
        isError = true;
        throw new Error(
          `Error inserting into order table: ${orderInsert.error.message}`,
        );
      }

      // Step 2: Insert into "payment" table
      const paymentInsert = await supabase
        .from("payment")
        .insert([{
          order_id: orderId,
          partner_id: pPartnerId,
          user_id: pUserId,
          status: STATUS_PENDING,
        }]);

      if (paymentInsert.error) {
        isError = true;
        throw new Error(
          `Error inserting into payment table: ${paymentInsert.error.message}`,
        );
      }

      // Step 3: Insert into "ticket" table
      for (const ticket of tickets) {
        const { zoneId, buyCount, ticketsAmount } = ticket;
        for (let i = 0; i < buyCount; i++) {
          const ticket_id = crypto.randomUUID();
          // Generate a random ticket code
          const ticketCode = generateRandomString(6);
          // Generate a QR code link string (dummy URL here for simplicity)
          const ticketQR =
            `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ticket_id}`;
          //const ticketQR = await qrcode(ticketCode, { size: 200 });

          //Add 06/12/2024 Check tickets are available before paying again
          const { data: maxlimitData, error: maxlimitData_error } =
            await supabase
              .from("ticket_quota")
              .select("max_limit")
              .eq("event_id", pEventId)
              .eq("stadium_zone_id", zoneId)
              .single();

          const { data: ticketData, error: ticketData_error } = await supabase
            .from("ticket")
            .select("id", { count: "exact" }) // Use exact count.
            .eq("event_id", pEventId)
            .eq("stadium_zone_id", zoneId)
            .neq("status", "CANCELLED"); // Exclude 'CANCELLED' status.

          if (maxlimitData_error || ticketData_error) {
            return new Response(
              JSON.stringify({ statuscode: 500, message: "Error Occurred" }),
              {
                status: 500,
                headers: {
                  "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
                  "Access-Control-Allow-Methods": "POST, OPTIONS", // Allowed methods
                  "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allowed headers
                },
              },
            );
          }

          const maxLimit = maxlimitData?.max_limit || 0;
          const soldTickets = ticketData?.length || 0;

          const remainingTickets = maxLimit - soldTickets;

          if (remainingTickets < 1) {
            const { data: zoneData } = await supabase
              .from("stadium_zone")
              .select("name")
              .eq("id", zoneId)
              .single();

            deleteOrderRelatedData(orderId);

            return new Response(
              JSON.stringify({
                statuscode: 400,
                success: false,
                message: "No tickets available for " + zoneData?.name,
                category: "soldout",
              }),
              { status: 400 },
            );
          }
          //End Add

          const ticketInsert = await supabase
            .from("ticket")
            .insert([{
              id: ticket_id,
              partner_id: pPartnerId,
              user_id: pUserId,
              event_id: pEventId,
              order_id: orderId,
              unitprice: ticketsAmount,
              name_on_ticket: displayName,
              //ticket_qr: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/QR_Code_Example.svg/1200px-QR_Code_Example.svg.png",
              ticket_qr: ticketQR,
              status: STATUS_PENDING,
              ticket_code: ticketCode,
              stadium_zone_id: zoneId,
            }]);

          if (ticketInsert.error) {
            isError = true;
            throw new Error(
              `Error inserting into ticket table: ${ticketInsert.error.message}`,
            );
          }
        }
      }

      if (isError == false) {
        return new Response(
          JSON.stringify({
            orderId: orderId,
            userId: pUserId,
            statuscode: 200,
            message: "Order and tickets successfully created",
          }),
          {
            status: 200,
            headers: {
              "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
              "Access-Control-Allow-Methods": "POST, OPTIONS", // Allowed methods
              "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allowed headers
            },
          },
        );
      } else {
        deleteOrderRelatedData(orderId);

        return new Response(
          JSON.stringify({ statuscode: 500, message: "Error Occurred" }),
          {
            status: 500,
            headers: {
              "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
              "Access-Control-Allow-Methods": "POST, OPTIONS", // Allowed methods
              "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allowed headers
            },
          },
        );
      }
      // Success response
    } catch (error) {
      console.error(error);
      const isdeleted = deleteOrderRelatedData(orderId);
      return new Response(
        JSON.stringify({
          statuscode: 500,
          message: isdeleted + "\n" + error.message,
        }),
        {
          status: 500,
          headers: {
            "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
            "Access-Control-Allow-Methods": "POST, OPTIONS", // Allowed methods
            "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allowed headers
          },
        },
      );
    }
  } else {
    deleteOrderRelatedData(orderId);
    return new Response("Invalid request method", { status: 405 });
  }
}

async function deleteOrderRelatedData(orderId: string): Promise<boolean> {
  try {
    // Call the SQL function to delete related data
    const { error } = await supabase
      .rpc("delete_order_related_data", { p_order_id: orderId });

    if (error) {
      throw new Error(error.message);
    }

    return true;
  } catch {
    return false;
  }
}

// Helper function to generate a random 6-character alphanumeric code
function generateRandomString(length: number): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

Deno.serve(async (req) => {
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": Allow_origin_url_prd,
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400", // Cache the preflight response for 24 hours
      },
    });
  }

  if (!JWT_SECRET) {
    return new Response(
      JSON.stringify({
        message: `JWT error: ${JWT_SECRET}`,
      }),
      {
        status: 401,
        headers: {
          "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS", // Allowed methods
          "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allowed headers
        },
      },
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response("Unauthorized: No token provided", {
      status: 401,
      headers: {
        "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS", // Allowed methods
        "Access-Control-Allow-Headers": "Content-Type, Authorization", // Allowed headers
      },
    });
  }

  // Extract the token from the Authorization header
  const token = authHeader.split(" ")[1];
  const JWT_SECRET_KEY = await getCryptoKey(JWT_SECRET);
  // Verify the JWT
  const payload = await verify(token, JWT_SECRET_KEY);

  return await userBuyTicket(req);
});
/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/userbuyticket' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
