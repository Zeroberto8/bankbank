import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const notificationEmail =
      Deno.env.get("NOTIFICATION_EMAIL") || "ralf.kroell@gmx.de";

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY nicht konfiguriert" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Supabase-Client mit Service-Role-Key (darf alles lesen)
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Zeitfenster: genau 24 Stunden, verankert am Cron-Zeitpunkt (18:00 UTC täglich).
    // Vorheriger Ansatz war ein rollendes "Date.now() - 24h" - das fiel bei kleinsten
    // Cron-Verzögerungen aus dem Fenster und führte beim Test-Button dazu, dass
    // Bänke, die länger als 24h her sind, grundsätzlich fehlten => immer 0.
    const CRON_HOUR_UTC = 18;
    const now = new Date();
    const lastCron = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      CRON_HOUR_UTC, 0, 0, 0,
    ));
    // Wenn heutiger Cron-Zeitpunkt noch nicht erreicht ist, nimm den von gestern
    if (lastCron > now) {
      lastCron.setUTCDate(lastCron.getUTCDate() - 1);
    }
    // Fensterstart = 24h vor dem letzten Cron-Lauf
    const since = new Date(lastCron.getTime() - 24 * 60 * 60 * 1000).toISOString();

    console.log(`[daily-bench-report] now=${now.toISOString()} since=${since} lastCron=${lastCron.toISOString()}`);

    const { data: newBenches, error } = await supabase
      .from("benches")
      .select("*, comments(*)")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (!error) {
      console.log(`[daily-bench-report] benches found: ${newBenches?.length ?? 0}`);
    }

    if (error) {
      console.error("[daily-bench-report] DB error:", error);
      return new Response(
        JSON.stringify({ error: "DB-Fehler", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gesamtzahl aller Bänke
    const { count: totalCount } = await supabase
      .from("benches")
      .select("*", { count: "exact", head: true });

    const count = newBenches?.length || 0;
    const today = new Date().toLocaleDateString("de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Europe/Berlin",
    });

    // E-Mail-HTML erstellen
    let benchListHtml = "";
    if (count === 0) {
      benchListHtml = `
        <div style="text-align:center;padding:32px 16px;color:#8C7E6A;">
          <div style="font-size:48px;margin-bottom:12px;">🪑</div>
          <p style="font-size:15px;margin:0;">Heute wurden keine neuen Bänke eingetragen.</p>
        </div>`;
    } else {
      for (const b of newBenches!) {
        const ratings = (b.comments || []).map((c: any) => c.rating);
        const avg =
          ratings.length > 0
            ? (ratings.reduce((a: number, r: number) => a + r, 0) / ratings.length).toFixed(1)
            : "–";
        const stars = ratings.length > 0
          ? "★".repeat(Math.round(Number(avg))) + "☆".repeat(5 - Math.round(Number(avg)))
          : "Noch keine Bewertung";
        const time = new Date(b.created_at).toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Berlin",
        });

        benchListHtml += `
          <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:12px;border:1px solid #E8E0D4;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <h3 style="margin:0 0 4px;font-size:16px;color:#2C2416;">🪑 ${b.title}</h3>
              <span style="font-size:12px;color:#8C7E6A;white-space:nowrap;">${time} Uhr</span>
            </div>
            <div style="font-size:13px;color:#E8A838;margin-bottom:4px;">${stars} <span style="color:#8C7E6A;font-size:11px;">${avg}</span></div>
            ${b.description ? `<p style="margin:4px 0 0;font-size:13px;color:#8C7E6A;line-height:1.4;">${b.description}</p>` : ""}
            <p style="margin:6px 0 0;font-size:11px;color:#8C7E6A;">📍 ${Number(b.lat).toFixed(4)}, ${Number(b.lng).toFixed(4)} · von ${b.user_name || "Anonym"}</p>
          </div>`;
      }
    }

    const emailHtml = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#F7F3ED;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:16px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#2D5016,#4A7C28);border-radius:16px 16px 0 0;padding:24px;text-align:center;color:#fff;">
      <div style="font-size:36px;margin-bottom:8px;">🪑</div>
      <h1 style="margin:0;font-size:22px;font-weight:700;">BankBank Tagesbericht</h1>
      <p style="margin:6px 0 0;font-size:13px;opacity:.8;">${today}</p>
    </div>

    <!-- Zusammenfassung -->
    <div style="background:#fff;padding:20px 24px;border-left:1px solid #E8E0D4;border-right:1px solid #E8E0D4;">
      <div style="display:flex;text-align:center;">
        <div style="flex:1;">
          <div style="font-size:28px;font-weight:700;color:#4A7C28;">${count}</div>
          <div style="font-size:11px;color:#8C7E6A;margin-top:2px;">Neue Bänke heute</div>
        </div>
        <div style="width:1px;background:#E8E0D4;margin:0 16px;"></div>
        <div style="flex:1;">
          <div style="font-size:28px;font-weight:700;color:#E8A838;">${totalCount || "?"}</div>
          <div style="font-size:11px;color:#8C7E6A;margin-top:2px;">Bänke gesamt</div>
        </div>
      </div>
    </div>

    <!-- Liste -->
    <div style="background:#F7F3ED;padding:16px;border-left:1px solid #E8E0D4;border-right:1px solid #E8E0D4;">
      <h2 style="margin:0 0 12px;font-size:15px;color:#2C2416;">
        ${count > 0 ? `Neue Bänke (letzte 24h)` : "Aktivität"}
      </h2>
      ${benchListHtml}
    </div>

    <!-- Footer -->
    <div style="background:#2D5016;border-radius:0 0 16px 16px;padding:16px 24px;text-align:center;">
      <p style="margin:0;font-size:11px;color:rgba(255,255,255,.6);">
        Automatischer Tagesbericht von BankBank
      </p>
    </div>
  </div>
</body>
</html>`;

    // E-Mail via Resend senden
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BankBank <onboarding@resend.dev>",
        to: [notificationEmail],
        subject: `🪑 BankBank: ${count} neue ${count === 1 ? "Bank" : "Bänke"} am ${today}`,
        html: emailHtml,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      return new Response(
        JSON.stringify({ error: "E-Mail-Fehler", details: resendData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        benchesCount: count,
        totalBenches: totalCount,
        emailId: resendData.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Unerwarteter Fehler", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
