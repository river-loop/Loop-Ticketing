// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import {createClient} from 'npm:@supabase/supabase-js@2.45.4';
import { verify } from "https://deno.land/x/djwt@v2.4/mod.ts";
//const Allow_origin_url_prd="https://kickoff.in.th";
const Allow_origin_url_prd="*"
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
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
    ["sign", "verify"]
  );
}

async function getDashboardSale(eventId: string) {
  const { data, error } = await supabase.rpc("get_dashboard_sale", { input_event_id: eventId });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

Deno.serve(async (req) => {

  ///*
  if (!JWT_SECRET) {
    return new Response(JSON.stringify({
      message: `JWT error: ${JWT_SECRET}`,
    }), { status: 401 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response("Unauthorized: No token provided", { status: 401 });
  }

  // Extract the token from the Authorization header
  const token = authHeader.split(" ")[1];
  const JWT_SECRET_KEY = await getCryptoKey(JWT_SECRET);
  // Verify the JWT
  const payload = await verify(token,JWT_SECRET_KEY);
//*/
  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");
  
  if (eventId == "") {
    return new Response("Invalid event ID", { status: 400 });
  }

  try {

    const { count: totalTicketsScanned, error: scannedTicketsError } = await supabase
    .from("ticket")
    .select("*", { count: "exact" })
    .eq("status", "SCANNED")
    .eq("event_id", eventId);

    if (scannedTicketsError) throw scannedTicketsError;

    // Query for totalSales
    const { data: totalSalesData, error: totalSalesError } = await supabase
      .from("order")
      .select("final_amount")
      .eq("status", "COMPLETED")
      .eq("event_id", eventId);

    if (totalSalesError) throw totalSalesError;

    const totalSales = totalSalesData.reduce(
      (sum: number, order: { final_amount: number }) => sum + order.final_amount,
      0
    );

    // Query for totalQuantity
    const { data: totalQuantityData, error: totalQuantityError } = await supabase
      .from("order")
      .select("count")
      .eq("status", "COMPLETED")
      .eq("event_id", eventId);

    if (totalQuantityError) throw totalQuantityError;

    const totalQuantity = totalQuantityData.reduce(
      (sum: number, order: { count: number }) => sum + order.count,
      0
    );

    // Query for remainingTickets
    const { data: remainingTicketsData, error: remainingTicketsError } = await supabase
      .from("ticket_quota")
      .select("max_limit")
      .eq("event_id", eventId);

    if (remainingTicketsError) throw remainingTicketsError;

    const maxLimitTotal = remainingTicketsData.reduce(
      (sum: number, ticket: { max_limit: number }) => sum + ticket.max_limit,
      0
    );

    const remainingTickets = maxLimitTotal - totalQuantity;

    const zoneSaleDetails = await getDashboardSale(eventId??"");
    
    if (!zoneSaleDetails) {
      return new Response("Event not found", { status: 404 });
    }

     // Construct the final response
     const response = {
       totalSales,
       totalQuantity,
       remainingTickets,
       totalTicketsScanned,
       salesPerZone: zoneSaleDetails,
     };

    return new Response(JSON.stringify(response), {
      headers: {
        "Access-Control-Allow-Origin": Allow_origin_url_prd, // Allow only your specific domain
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS", // Allowed methods
        "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
 
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/getdashboardbyevent' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/