import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CONSUMER_KEY = "zeqxw6PgZkHjVi8DtGL7sAGGtNbPjHNW5hrOAYhNlBcjfkbB";
const CONSUMER_SECRET = "48csvSzmoGGK1LRZWfoYpxHY1Yb4CdqZeXSO96IwVZm3By3kvrS71poTH994PRIM";
const SHORTCODE = "174379";       // Replace with 625625 when live
const PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"; // Replace with live passkey
const BASE_URL = "https://sandbox.safaricom.co.ke"; // Change to https://api.safaricom.co.ke when live
const CALLBACK_URL = "https://ttnztozwxhoxqlalhyts.supabase.co/functions/v1/mpesa-callback";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { phone, amount, paybill, account, contributionId } = await req.json();

    const shortcode = paybill ?? SHORTCODE;

    const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);
    const tokenRes = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const { access_token } = await tokenRes.json();

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const password = btoa(`${shortcode}${PASSKEY}${timestamp}`);

    const body: Record<string, unknown> = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: paybill ? "CustomerPayBillOnline" : "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: CALLBACK_URL,
      AccountReference: account ?? "Membership",
      TransactionDesc: "Community Welfare Group",
    };

    // Pass contributionId in AccountReference so callback can link it
    if (contributionId) {
      body.AccountReference = `${account ?? "CWG"}_${contributionId}`;
    }

    const stkRes = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await stkRes.json();
    return new Response(JSON.stringify(data), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
