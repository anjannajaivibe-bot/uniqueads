"use server";

// Legacy endpoints are retained only so historical imports keep compiling.
// Unique Ads no longer uses lead capture or lead lifecycle management.
function retired(): never {
  throw new Error("Leads are disabled. Create a work order against a customer instead.");
}
export async function createLead(_formData: FormData) { retired(); }
export async function updateLead(_formData: FormData) { retired(); }
export async function updateLeadStatus(_formData: FormData) { retired(); }
export async function addLeadFollowup(_formData: FormData) { retired(); }
export async function convertLeadToCustomer(_formData: FormData) { retired(); }
