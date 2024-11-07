// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
/*import { decode, encode } from "https://deno.land/std@0.122.0/encoding/hex.ts";
import { crypto } from "https://deno.land/std@0.122.0/crypto/mod.ts";
import { HMAC } from "https://deno.land/x/hmac@v2.0.1/mod.ts";
import { SHA256 } from "https://deno.land/x/hmac@v2.0.1/deps.ts";
import { Buffer } from "https://deno.land/std@0.177.0/node/buffer.ts";*/

//const Allow_origin_url_prd="https://kickoff.in.th"
//const Allow_origin_url_prd ="https://loop-ticketing-test-3hanuu.flutterflow.app";
const Allow_origin_url_prd = "*";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

/*const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET")!;

// Function to verify the webhook signature
async function verifySignature(request: Request, signature: string): Promise<boolean> {
  const body = await request.text();
  
  const key = await crypto.subtle.importKey(
    "raw",
    decode(new TextEncoder().encode(WEBHOOK_SECRET)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expectedSignature = Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
    
  return expectedSignature === signature;
}*/

async function purchaseResponse(req: Request): Promise<Response> {
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
  try {
    const payload = await req.json();
    /*const beamSignature = req.headers.get("X-Hub-Signature") || "";

    // Step 2: Verify signature for security
    const isValid = await verifySignature(req, beamSignature);
    if (!isValid) {
      return new Response(JSON.stringify({ message: "Invalid signature" }), {
        status: 403,headers: {
          "Access-Control-Allow-Origin": Allow_origin_url_prd,
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400" // Cache the preflight response for 24 hours
        },
      });
    }*/
    console.log(payload);
    // Step 3: Extract purchaseId (use as transref) from the payload
    const { merchantId, purchaseId, state, customer, created, lastUpdated } =
      payload;
    /* return new Response(
      JSON.stringify({
        message: purchaseId+ " - " +state,
        isSuccess: true,
      }),
      { status: 200,headers: {
        "Access-Control-Allow-Origin": Allow_origin_url_prd,
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400" // Cache the preflight response for 24 hours
      }, }
    );*/

    if (!purchaseId) {
      return new Response(
        JSON.stringify({ message: "purchaseId missing in payload" }),
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": Allow_origin_url_prd,
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "86400", // Cache the preflight response for 24 hours
          },
        }
      );
    } else {
      const { data: paymentData, error: paymentRetrieveError } = await supabase
        .from("payment")
        .select("order_id, user_id")
        .eq("trans_ref", purchaseId)
        .single();

      if (paymentRetrieveError || !paymentData) {
        return new Response(
          JSON.stringify({
            message: "Order ID not found for the provided transref.",
            isSuccess: false,
          }),
          {
            status: 404,
            headers: {
              "Access-Control-Allow-Origin": Allow_origin_url_prd,
              "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
              "Access-Control-Max-Age": "86400", // Cache the preflight response for 24 hours
            },
          }
        );
      }
      const orderId = paymentData.order_id;
      const userId = paymentData.user_id;
      const lastUpdateDate = new Date(lastUpdated);

      const { data: orderData, error: orderRetrieveError } = await supabase
        .from("order")
        .select("total_amount")
        .eq("id", orderId)
        .single();

      if (orderRetrieveError || !orderData) {
        return new Response(
          JSON.stringify({
            message: "Order not found for the provided Id.",
            isSuccess: false,
          }),
          {
            status: 404,
            headers: {
              "Access-Control-Allow-Origin": Allow_origin_url_prd,
              "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
              "Access-Control-Max-Age": "86400", // Cache the preflight response for 24 hours
            },
          }
        );
      }
      //const orderId = "";
      if (state === "complete") {
        // Update tickets
        const updates = [
          supabase
            .from("ticket")
            .update({ status: "READY_TO_SCAN" })
            .eq("order_id", orderId)
            .eq("user_id", userId),
          supabase
            .from("payment")
            .update({
              status: "COMPLETED",
              trans_datetime: lastUpdateDate,
              final_amount: orderData?.total_amount,
            })
            .eq("order_id", orderId)
            .eq("user_id", userId),
          supabase
            .from("order")
            .update({
              status: "COMPLETED",
              final_amount: orderData?.total_amount,
              payment_type: "BEAM",
            })
            .eq("id", orderId)
            .eq("user_id", userId),
        ];

        const [ticketUpdate, paymentUpdate, orderUpdate] = await Promise.all(
          updates
        );

        // Check for errors in any of the updates
        if (ticketUpdate.error || paymentUpdate.error || orderUpdate.error) {
          return new Response(
            JSON.stringify({
              message: `Error updating tables: ${
                ticketUpdate.error?.message ||
                paymentUpdate.error?.message ||
                orderUpdate.error?.message
              }`,
            }),
            {
              status: 500,
              headers: {
                "Access-Control-Allow-Origin": Allow_origin_url_prd,
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Max-Age": "86400", // Cache the preflight response for 24 hours
              },
            }
          );
        }
      } else {
        // Update tickets
        const updates = [
          supabase
            .from("ticket")
            .update({ status: "CANCELLED" })
            .eq("order_id", orderId)
            .eq("user_id", userId),
          supabase
            .from("payment")
            .update({ status: "CANCELLED" })
            .eq("order_id", orderId)
            .eq("user_id", userId),
          supabase
            .from("order")
            .update({ status: "CANCELLED" })
            .eq("id", orderId)
            .eq("user_id", userId),
        ];

        const [ticketUpdate, paymentUpdate, orderUpdate] = await Promise.all(
          updates
        );

        // Check for errors in any of the updates
        if (ticketUpdate.error || paymentUpdate.error || orderUpdate.error) {
          return new Response(
            JSON.stringify({
              message: `Error updating tables: ${
                ticketUpdate.error?.message ||
                paymentUpdate.error?.message ||
                orderUpdate.error?.message
              }`,
            }),
            {
              status: 500,
              headers: {
                "Access-Control-Allow-Origin": Allow_origin_url_prd,
                "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Max-Age": "86400", // Cache the preflight response for 24 hours
              },
            }
          );
        }
      }

      return new Response(
        JSON.stringify({
          message: "Webhook processed successfully.",
          isSuccess: true,
        }),
        {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": Allow_origin_url_prd,
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "86400", // Cache the preflight response for 24 hours
          },
        }
      );
    }
  } catch (error) {
    // Handle errors and send response
    return new Response(
      JSON.stringify({
        message: error.message,
        isSuccess: false,
      }),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": Allow_origin_url_prd,
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400", // Cache the preflight response for 24 hours
        },
      }
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
