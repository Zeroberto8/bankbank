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

    // Body parsen: { test: true } -> Test-Modus (Vorschau, kein State-Update)
    let isTestMode = false;
    try {
      const body = await req.json();
      isTestMode = body?.test === true;
    } catch {
      // leerer / kein JSON-Body -> Cron-Modus
    }

    // Zeitfenster bestimmen.
    //  - Cron-Modus: ab dem letzten erfolgreich versendeten Cron-Mail. Damit
    //    werden auch Bänke gemeldet, die nach dem letzten Cron, aber vor dem
    //    aktuellen entstanden sind. Keine Lücken, keine fragile 30h-Heuristik.
    //    Fallback (Tabelle leer / Fehler): 48h zurück, damit der erste Lauf
    //    nicht völlig leer bleibt.
    //  - Test-Modus: rollendes 30h-Fenster ab jetzt, damit der Test-Button
    //    jederzeit eine sinnvolle Vorschau liefert, ohne den persistenten
    //    "letzten Lauf"-Zeitstempel zu verändern.
    const now = new Date();
    let since: string;
    if (isTestMode) {
      since = new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString();
    } else {
      const { data: lastRun, error: lastRunErr } = await supabase
        .from("email_runs")
        .select("sent_at")
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastRunErr) {
        console.error("[daily-bench-report] last-run query failed:", lastRunErr);
      }
      since = lastRun?.sent_at
        ? new Date(lastRun.sent_at).toISOString()
        : new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    }

    console.log(`[daily-bench-report] mode=${isTestMode ? "test" : "cron"} now=${now.toISOString()} since=${since}`);

    // 1) Neue Bänke im Zeitfenster (mit allen ihren Kommentaren)
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

    // 2) Neue Kommentare/Bewertungen im Zeitfenster
    //    -> nur die zu BESTEHENDEN Bänken zeigen, damit es keine Doppelung
    //       mit den unter (1) gelisteten neuen Bänken gibt.
    const newBenchIds = new Set((newBenches || []).map((b: any) => b.id));
    const { data: recentComments, error: cErr } = await supabase
      .from("comments")
      .select("id, bench_id, user_name, rating, text, created_at, benches(title)")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (cErr) {
      console.error("[daily-bench-report] comments DB error:", cErr);
    }

    const otherComments = (recentComments || []).filter(
      (c: any) => !newBenchIds.has(c.bench_id),
    );

    // Gruppieren nach Bank
    const grouped: Record<string, { title: string; items: any[] }> = {};
    for (const c of otherComments) {
      const key = String(c.bench_id);
      if (!grouped[key]) {
        grouped[key] = {
          title: c.benches?.title || `Bank #${c.bench_id}`,
          items: [],
        };
      }
      grouped[key].items.push(c);
    }
    const groupedList = Object.values(grouped);
    const newCommentsCount = otherComments.length;
    console.log(`[daily-bench-report] new comments/ratings on existing benches: ${newCommentsCount}`);

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
        <div style="text-align:center;padding:24px 16px;color:#8C7E6A;">
          <div style="font-size:40px;margin-bottom:8px;">🪑</div>
          <p style="font-size:14px;margin:0;">Keine neuen Bänke seit dem letzten Bericht.</p>
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

    // HTML-Block: neue Kommentare/Bewertungen zu bestehenden Bänken
    let commentsHtml = "";
    if (newCommentsCount === 0) {
      commentsHtml = `
        <div style="text-align:center;padding:18px 16px;color:#8C7E6A;">
          <p style="font-size:13px;margin:0;">Keine neuen Kommentare oder Bewertungen.</p>
        </div>`;
    } else {
      for (const g of groupedList) {
        let itemsHtml = "";
        for (const c of g.items) {
          const stars = "★".repeat(c.rating) + "☆".repeat(5 - c.rating);
          const time = new Date(c.created_at).toLocaleString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Berlin",
          });
          itemsHtml += `
            <div style="background:#F7F3ED;border-radius:8px;padding:10px;margin-top:8px;border:1px solid #E8E0D4;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <span style="font-weight:700;font-size:12px;color:#2C2416;">${c.user_name || "Anonym"}</span>
                <span style="font-size:12px;color:#E8A838;">${stars}</span>
              </div>
              ${c.text ? `<p style="margin:0;font-size:12px;color:#2C2416;line-height:1.4;">${c.text}</p>` : `<p style="margin:0;font-size:12px;color:#8C7E6A;font-style:italic;">Bewertung ohne Kommentar</p>`}
              <span style="font-size:10px;color:#8C7E6A;">${time}</span>
            </div>`;
        }
        commentsHtml += `
          <div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:12px;border:1px solid #E8E0D4;">
            <h3 style="margin:0 0 4px;font-size:14px;color:#2C2416;">💬 ${g.title}</h3>
            <p style="margin:0;font-size:11px;color:#8C7E6A;">${g.items.length} ${g.items.length === 1 ? "neuer Eintrag" : "neue Einträge"}</p>
            ${itemsHtml}
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
    <div style="background:linear-gradient(135deg,#2D5016,#4A7C28);border-radius:16px 16px 0 0;padding:24px;text-align:center;color:#000;">
      <div style="font-size:36px;margin-bottom:8px;">🪑</div>
      <h1 style="margin:0;font-size:22px;font-weight:700;">BankBank Tagesbericht</h1>
      <p style="margin:6px 0 0;font-size:13px;opacity:.8;">${today}</p>
    </div>

    <!-- Zusammenfassung -->
    <div style="background:#fff;padding:20px 24px;border-left:1px solid #E8E0D4;border-right:1px solid #E8E0D4;">
      <div style="display:flex;text-align:center;">
        <div style="flex:1;">
          <div style="font-size:24px;font-weight:700;color:#4A7C28;">${count}</div>
          <div style="font-size:11px;color:#8C7E6A;margin-top:2px;">Neue Bänke</div>
        </div>
        <div style="width:1px;background:#E8E0D4;margin:0 12px;"></div>
        <div style="flex:1;">
          <div style="font-size:24px;font-weight:700;color:#4A7C28;">${newCommentsCount}</div>
          <div style="font-size:11px;color:#8C7E6A;margin-top:2px;">Neue Kommentare/Bewertungen</div>
        </div>
        <div style="width:1px;background:#E8E0D4;margin:0 12px;"></div>
        <div style="flex:1;">
          <div style="font-size:24px;font-weight:700;color:#E8A838;">${totalCount || "?"}</div>
          <div style="font-size:11px;color:#8C7E6A;margin-top:2px;">Bänke gesamt</div>
        </div>
      </div>
    </div>

    <!-- Neue Bänke -->
    <div style="background:#F7F3ED;padding:16px;border-left:1px solid #E8E0D4;border-right:1px solid #E8E0D4;">
      <h2 style="margin:0 0 12px;font-size:15px;color:#2C2416;">🪑 Neue Bänke seit dem letzten Bericht</h2>
      ${benchListHtml}
    </div>

    <!-- Neue Kommentare/Bewertungen zu bestehenden Bänken -->
    <div style="background:#F7F3ED;padding:0 16px 16px;border-left:1px solid #E8E0D4;border-right:1px solid #E8E0D4;">
      <h2 style="margin:0 0 12px;font-size:15px;color:#2C2416;">💬 Neue Kommentare &amp; Bewertungen</h2>
      ${commentsHtml}
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
        subject: `${isTestMode ? "[TEST] " : ""}🪑 BankBank: ${count} neue ${count === 1 ? "Bank" : "Bänke"}, ${newCommentsCount} ${newCommentsCount === 1 ? "Kommentar/Bewertung" : "Kommentare/Bewertungen"} am ${today}`,
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

    // Nur im Cron-Modus: erfolgreichen Versand persistieren, damit der nächste
    // Lauf von hier aus weiterzählen kann. Im Test-Modus bewusst NICHT, sonst
    // würde ein Test-Klick den nächsten Cron-Bericht leeren.
    if (!isTestMode) {
      const { error: insertErr } = await supabase
        .from("email_runs")
        .insert({
          sent_at: now.toISOString(),
          benches_count: count,
          comments_count: newCommentsCount,
        });
      if (insertErr) {
        console.error("[daily-bench-report] email_runs insert failed:", insertErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: isTestMode ? "test" : "cron",
        benchesCount: count,
        newCommentsCount,
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
