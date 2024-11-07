// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
//const event_manager_url = 'https://ticketing-back-office-reztop.flutterflow.app';
const event_manager_url = 'https://kick-off-event-manager-3mgfi7.flutterflow.app';
const Allow_origin_url_prd="*"
const from_email ="no-reply@loop.co.th";
const RESEND_API_KEY = "re_BxN48Fyr_DyPCXN8pUHHgRf548rTWR3Ck";

Deno.serve(async (req) => {

  const corsHeaders = {
    "Access-Control-Allow-Origin": Allow_origin_url_prd,  // Allow only your domain
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",  // Allowed methods
    "Access-Control-Allow-Headers": "Content-Type, Authorization",  // Allowed headers
  };

   if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,  // No content needed for preflight
      headers: corsHeaders,
    });
  }

  if(req.method === "POST" ){
    try {
      // Read email data from the request body
      const { to, partner_name, invitation_id } = await req.json();

      const subject = `Accept Invitation for Staff account - ${partner_name}`;
      const text = "Please click the link below and create your account within 24 hour!";
  
      //const url = `https://ticketing-back-office-reztop.flutterflow.app/acceptInvitationPage/${invitation_id}`;
      const url = `${event_manager_url}/acceptInvitationPage/${invitation_id}`;
      const html = `<p>${text}</p><br><strong><a href='${url}'>${url}</a></strong>`;
      // API key for Resend
     
  
      // API call to Resend
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({  
          from: from_email, // Your Resend email
          to,
          subject,
          text,
          html,
        }),
      });
  
      // Check if the request was successful
      if (!response.ok) {
        return new Response("Failed to send email", { status: 500,headers: corsHeaders, });
      }
  
      const data = await response.json();
      return new Response(JSON.stringify({ message: "Email sent", data }), {
        status: 200,
        headers: corsHeaders
      });
    } catch (error) {
      console.error("Error sending email:", error);
      return new Response("Internal Server Error", { status: 500, headers: corsHeaders });
    }
  }else {
    return new Response("Invalid request method", { status: 405, headers: corsHeaders });
  }
  

})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/sendinvitationlink' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
