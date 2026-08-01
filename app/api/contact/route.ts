import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = clean(body.name, 120);
    const email = clean(body.email, 180);
    const phone = clean(body.phone, 80);
    const interest = clean(body.interest, 160);
    const message = clean(body.message, 4000);
    const website = clean(body.website, 200);

    if (website) return NextResponse.json({ ok: true });
    if (!name || !emailPattern.test(email) || !phone || !interest) {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return NextResponse.json({ error: "Email service unavailable" }, { status: 503 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const safeMessage = escapeHtml(message).replaceAll("\n", "<br />");
    const { error } = await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL || "Rema Consultant <onboarding@resend.dev>",
      to: process.env.CONTACT_TO_EMAIL || "ola@remaconsultant.com",
      replyTo: email,
      subject: `New Rema Consultant enquiry — ${interest}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#20231f"><div style="background:#414a39;color:#fff;padding:24px 28px"><h1 style="font-size:22px;margin:0">New website enquiry</h1></div><div style="padding:28px;border:1px solid #d4d3cc;border-top:0"><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Phone:</strong> ${escapeHtml(phone)}</p><p><strong>Interest:</strong> ${escapeHtml(interest)}</p><p><strong>Message:</strong><br />${safeMessage || "—"}</p></div></div>`,
    });

    if (error) {
      console.error("Resend contact error", error);
      return NextResponse.json({ error: "Email could not be sent" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact route error", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
