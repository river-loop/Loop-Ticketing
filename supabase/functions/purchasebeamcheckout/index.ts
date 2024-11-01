// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
const Allow_origin_url_prd = "https://kickoff.in.th";
//import { qrcode } from "https://deno.land/x/qrcode@v2.0.0/mod.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

interface PurchaseRequest {
  beamAPIKey: string;
  beamMerchantId: string;
  beamUrl: string;
  expiry: string;
  eventName: string;
  buyerName: string;
  amount: number;
  redirectUrl: string;
  eventId: string;
  orderId: string;
}

interface OrderItem {
  event_name: string;
  event_description: string;
  event_coverphoto_url: string;
  total_ticket_price: number;
  ticket_count: number;
}

// The main function that handles the request logic
async function purchaseBeamcheckout(req: Request): Promise<Response> {
  // Ensure it's a POST request

  // CORS preflight handling
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": Allow_origin_url_prd,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Parse the JSON body from the request
  let body: PurchaseRequest;
  try {
    body = await req.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": Allow_origin_url_prd,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const requiredFields = [
    "beamAPIKey",
    "beamMerchantId",
    "beamUrl",
    "expiry",
    "eventName",
    "buyerName",
    "amount",
    "redirectUrl",
    "eventId",
    "orderId"
  ];
  for (const field of requiredFields) {
    if (!body[field as keyof PurchaseRequest]) {
      return new Response(
        JSON.stringify({
          isSuccess: false,
          code: 400,
          message: `Missing required parameter: ${field}`,
        }),
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": Allow_origin_url_prd,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }
  }

  const orderItems = await getOrderItem(body.eventId??"",body.orderId??"");
  
  const formattedOrderItems = orderItems.map((item: OrderItem) => ({
    product: {
        description: item.event_description,
        imageUrl: item.event_coverphoto_url,
        name: item.event_name,
        price: item.total_ticket_price,
        sku: "-"
    },
    quantity: item.ticket_count
}));


  const purchaseUrl = `https://${body.beamUrl}/purchases/${body.beamMerchantId}`;

  const auth = btoa(`${body.beamMerchantId}:${body.beamAPIKey}`);

  const headers = new Headers({
    "Content-Type": "application/json",
    Authorization: `Basic ${auth}`,
  });

  const requestBody = {
    channel: "line",
    expiry: body.expiry,
    //expiry: "2025-07-10T15:00:00Z",
    order: {
      currencyCode: "THB",
      description: body.eventName,
      merchantReference: body.buyerName,
      merchantReferenceId: "LoopTicketing",
      netAmount: body.amount,
      orderItems: formattedOrderItems,
      totalAmount: body.amount,
    },
    redirectUrl: body.redirectUrl,
    supportedPaymentMethods: ["qrThb","internetBanking"],
  };

  // Call the external API
  try {
    // Make the POST request
    const response = await fetch(purchaseUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody),
    });
    


    // Handle the response

    if (response.ok) {
      const jsonResponse = await response.json();
      return new Response(
        JSON.stringify({
          isSuccess: true,
          code: 200,
          purchaseId: jsonResponse.purchaseId,
          paymentLink: jsonResponse.paymentLink,
        }),
        {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": Allow_origin_url_prd,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    } else {
      // Error response handling
      const errorResponse = await response.json();
      return new Response(
        JSON.stringify({
          isSuccess: false,
          code: response.status,
          message: errorResponse.message || "An error occurred.",
        }),
        {
          status: response.status,
          headers: {
            "Access-Control-Allow-Origin": Allow_origin_url_prd,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }
  } catch (error) {
    // Handle unexpected errors
    return new Response(
      JSON.stringify({
        code: 500,
        message: `Server error: ${error.message}`,
      }),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": Allow_origin_url_prd,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
}

async function getOrderItem(eventId: string,orderId: string) {
  const { data, error } = await supabase.rpc("get_order_item", 
    { input_event_id: eventId, input_order_id: orderId });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}


Deno.serve(async (req) => {
  return await purchaseBeamcheckout(req);
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/purchasebeamcheckout' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
