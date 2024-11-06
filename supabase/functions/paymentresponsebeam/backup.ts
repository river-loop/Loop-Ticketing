// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
//const Allow_origin_url_prd="https://kickoff.in.th"
const Allow_origin_url_prd = "https://loop-ticketing-test-3hanuu.flutterflow.app/";
//import { qrcode } from "https://deno.land/x/qrcode@v2.0.0/mod.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
);


async function purchaseResponse(req: Request): Promise<Response> {

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": Allow_origin_url_prd,
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400" // Cache the preflight response for 24 hours
      },
    });
  }
  
  try {
    const { purchaseId } = await req.json();

    // Validate input
    if (!purchaseId) {
      return new Response(
        JSON.stringify({ message: "Missing required parameters." }),
        { status: 400,headers: {
          "Access-Control-Allow-Origin": Allow_origin_url_prd,
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400" // Cache the preflight response for 24 hours
        } }
      );
    }

    const { data: paymentData, error: paymentRetrieveError } = await supabase
      .from("payment")
      .select("order_id")
      .eq("trans_ref", purchaseId)
      .single();

      if (paymentRetrieveError || !paymentData) {
        return new Response(
          JSON.stringify({
            message: "Order ID not found for the provided transref.",
            isSuccess: false,
          }),
          { status: 404 }
        );
      }

    const orderId = paymentData.order_id;
    // Update tickets
    const { error: ticketError } = await supabase
      .from("ticket")
      .update({ status: "READY_TO_SCAN" })
      .eq("order_id", orderId);

    if (ticketError) {
      throw new Error(`Ticket update failed: ${ticketError.message}`);
    }

    // Update payments
    const { error: paymentError } = await supabase
      .from("payment")
      .update({ status: "COMPLETED" })
      .eq("order_id", orderId);

    if (paymentError) {
      throw new Error(`Payment update failed: ${paymentError.message}`);
    }

    // Update orders
    const { error: orderError } = await supabase
      .from("order")
      .update({ status: "COMPLETED" })
      .eq("id", orderId);

    if (orderError) {
      throw new Error(`Order update failed: ${orderError.message}`);
    }

    // Response if all updates are successful
    return new Response(
      JSON.stringify({
        message: "Status updated successfully.",
        isSuccess: true,
      }),
      { status: 200,headers: {
        "Access-Control-Allow-Origin": Allow_origin_url_prd,
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400" // Cache the preflight response for 24 hours
      } }
    );
  } catch (error) {
    // Handle errors and send response
    return new Response(
      JSON.stringify({
        message: error.message,
        isSuccess: false,
      }),
      { status: 500,headers: {
        "Access-Control-Allow-Origin": Allow_origin_url_prd,
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400" // Cache the preflight response for 24 hours
      } }
    );
  }
  
}


Deno.serve(async (req) => {
  return await purchaseResponse(req);
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/paymentresponsebeam' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
