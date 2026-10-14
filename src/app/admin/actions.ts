"use server";

import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { requireAppUser } from "@/lib/auth/authorization";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function integerOrNull(value: FormDataEntryValue | null) {
  const text = clean(value);
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function numericOrNull(value: FormDataEntryValue | null) {
  const text = clean(value);
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function leadNumber() {
  return `UA-LD-${new Date().getFullYear()}-${randomUUID()
    .slice(0, 6)
    .toUpperCase()}`;
}

function customerCode() {
  return `UA-CUS-${new Date().getFullYear()}-${randomUUID()
    .slice(0, 6)
    .toUpperCase()}`;
}

async function logLeadActivity(
  actorUserId: string,
  leadId: string,
  action: string,
  description: string,
  metadata: Record<string, unknown> = {}
) {
  await sql`
    INSERT INTO activity_logs (
      actor_user_id,
      action,
      entity_type,
      entity_id,
      description,
      metadata
    ) VALUES (
      ${actorUserId},
      ${action},
      'lead',
      ${leadId}::uuid,
      ${description},
      ${JSON.stringify(metadata)}
    )
  `;
}

export async function createLead(formData: FormData) {
  const currentUser = await requireAppUser();

  const contactPerson = clean(formData.get("contact_person"));
  const phone = clean(formData.get("phone"));

  if (!contactPerson || !phone) {
    throw new Error("Contact person and phone are required.");
  }

  const leadNo = leadNumber();

  const rows = await sql`
    INSERT INTO leads (
      lead_no,
      company_name,
      contact_person,
      phone,
      whatsapp,
      email,
      location,
      requirement,
      advertising_type,
      number_of_locations,
      estimated_wall_area_sqft,
      campaign_duration_days,
      source,
      status,
      assigned_to,
      next_follow_up_at,
      remarks,
      created_by
    ) VALUES (
      ${leadNo},
      ${clean(formData.get("company_name"))},
      ${contactPerson},
      ${phone},
      ${clean(formData.get("whatsapp"))},
      ${clean(formData.get("email"))},
      ${clean(formData.get("location"))},
      ${clean(formData.get("requirement"))},
      ${clean(formData.get("advertising_type"))},
      ${integerOrNull(formData.get("number_of_locations"))},
      ${numericOrNull(formData.get("estimated_wall_area_sqft"))},
      ${integerOrNull(formData.get("campaign_duration_days"))},
      ${clean(formData.get("source")) ?? "direct"},
      'new',
      ${clean(formData.get("assigned_to"))},
      ${clean(formData.get("next_follow_up_at"))},
      ${clean(formData.get("remarks"))},
      ${currentUser.id}
    )
    RETURNING id
  `;

  const leadId = String(rows[0].id);

  await logLeadActivity(
    currentUser.id,
    leadId,
    "lead_created",
    `Lead ${leadNo} created.`,
    { lead_no: leadNo }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  redirect(`/admin/leads/${leadId}`);
}

export async function updateLead(formData: FormData) {
  const currentUser = await requireAppUser();

  const leadId = clean(formData.get("lead_id"));
  const contactPerson = clean(formData.get("contact_person"));
  const phone = clean(formData.get("phone"));

  if (!leadId || !contactPerson || !phone) {
    throw new Error("Lead ID, contact person and phone are required.");
  }

  await sql`
    UPDATE leads
    SET
      company_name = ${clean(formData.get("company_name"))},
      contact_person = ${contactPerson},
      phone = ${phone},
      whatsapp = ${clean(formData.get("whatsapp"))},
      email = ${clean(formData.get("email"))},
      location = ${clean(formData.get("location"))},
      requirement = ${clean(formData.get("requirement"))},
      advertising_type = ${clean(formData.get("advertising_type"))},
      number_of_locations = ${integerOrNull(formData.get("number_of_locations"))},
      estimated_wall_area_sqft = ${numericOrNull(formData.get("estimated_wall_area_sqft"))},
      campaign_duration_days = ${integerOrNull(formData.get("campaign_duration_days"))},
      source = ${clean(formData.get("source")) ?? "direct"},
      assigned_to = ${clean(formData.get("assigned_to"))},
      next_follow_up_at = ${clean(formData.get("next_follow_up_at"))},
      remarks = ${clean(formData.get("remarks"))},
      updated_at = now()
    WHERE id = ${leadId}::uuid
  `;

  await logLeadActivity(
    currentUser.id,
    leadId,
    "lead_updated",
    "Lead details updated."
  );

  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function updateLeadStatus(formData: FormData) {
  const currentUser = await requireAppUser();

  const leadId = clean(formData.get("lead_id"));
  const status = clean(formData.get("status"));
  const lostReason = clean(formData.get("lost_reason"));

  const allowed = [
    "new",
    "contacted",
    "requirement_received",
    "quotation_sent",
    "negotiation",
    "won",
    "lost",
  ];

  if (!leadId || !status || !allowed.includes(status)) {
    throw new Error("Invalid lead status.");
  }

  if (status === "lost" && !lostReason) {
    throw new Error("Lost reason is required when a lead is marked Lost.");
  }

  await sql`
    UPDATE leads
    SET
      status = ${status},
      lost_reason = CASE
        WHEN ${status} = 'lost' THEN ${lostReason}
        ELSE NULL
      END,
      updated_at = now()
    WHERE id = ${leadId}::uuid
  `;

  await logLeadActivity(
    currentUser.id,
    leadId,
    "lead_status_changed",
    `Lead status changed to ${status.replaceAll("_", " ")}.`,
    { status, lost_reason: status === "lost" ? lostReason : null }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function addLeadFollowup(formData: FormData) {
  const currentUser = await requireAppUser();

  const leadId = clean(formData.get("lead_id"));
  const channel = clean(formData.get("channel"));
  const notes = clean(formData.get("notes"));
  const outcome = clean(formData.get("outcome"));
  const nextFollowUpAt = clean(formData.get("next_follow_up_at"));

  const allowedChannels = [
    "call",
    "whatsapp",
    "email",
    "meeting",
    "site_visit",
    "other",
  ];

  if (!leadId || !channel || !allowedChannels.includes(channel) || !notes) {
    throw new Error("Channel and follow-up notes are required.");
  }

  await sql`
    INSERT INTO lead_followups (
      lead_id,
      follow_up_at,
      next_follow_up_at,
      channel,
      outcome,
      notes,
      created_by
    ) VALUES (
      ${leadId}::uuid,
      now(),
      ${nextFollowUpAt},
      ${channel},
      ${outcome},
      ${notes},
      ${currentUser.id}
    )
  `;

  await sql`
    UPDATE leads
    SET
      next_follow_up_at = ${nextFollowUpAt},
      updated_at = now()
    WHERE id = ${leadId}::uuid
  `;

  await logLeadActivity(
    currentUser.id,
    leadId,
    "followup_added",
    `Follow-up recorded via ${channel.replaceAll("_", " ")}.`,
    { channel, outcome, next_follow_up_at: nextFollowUpAt }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function convertLeadToCustomer(formData: FormData) {
  const currentUser = await requireAppUser();
  const leadId = clean(formData.get("lead_id"));

  if (!leadId) {
    throw new Error("Lead ID is required.");
  }

  const leads = await sql`
    SELECT *
    FROM leads
    WHERE id = ${leadId}::uuid
    LIMIT 1
  `;

  const lead = leads[0] as any;

  if (!lead) {
    throw new Error("Lead not found.");
  }

  if (lead.customer_id) {
    await sql`
      UPDATE leads
      SET status = 'won', updated_at = now()
      WHERE id = ${leadId}::uuid
    `;
    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${leadId}`);
    return;
  }

  const code = customerCode();
  const companyName =
    String(lead.company_name || "").trim() ||
    String(lead.contact_person || "").trim();

  const customers = await sql`
    INSERT INTO customers (
      customer_code,
      company_name,
      contact_person,
      phone,
      whatsapp,
      email,
      notes,
      created_by
    ) VALUES (
      ${code},
      ${companyName},
      ${lead.contact_person},
      ${lead.phone},
      ${lead.whatsapp},
      ${lead.email},
      ${lead.remarks},
      ${currentUser.id}
    )
    RETURNING id
  `;

  const customerId = String(customers[0].id);

  await sql`
    UPDATE leads
    SET
      customer_id = ${customerId}::uuid,
      status = 'won',
      lost_reason = NULL,
      updated_at = now()
    WHERE id = ${leadId}::uuid
  `;

  await logLeadActivity(
    currentUser.id,
    leadId,
    "lead_converted_to_customer",
    `Lead converted to customer ${code}.`,
    { customer_id: customerId, customer_code: code }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/leads/${leadId}`);
}
