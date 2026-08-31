import organisationProfile from "./OrganisationProfileService.js?v=20260830-4";
import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";
import adminBrandAssetService from "./AdminBrandAssetService.js";

const REST = `${authConfig.supabase.url}/rest/v1`;

async function saveProfile() {
    const form = document.querySelector("#organisation-profile-form");
    if (!form) return;

    const fd = new FormData(form);
    const payload = {};

    for (const [key, value] of fd.entries()) {
        if (form.elements[key]?.type === "checkbox" || key === "logo_file") continue;
        payload[key] = String(value).trim() === "" ? null : value;
    }

    ["vat_registered", "paye_registered", "uif_registered", "sdl_registered"].forEach(
        key => { payload[key] = Boolean(form.elements[key]?.checked); }
    );

    payload.is_active = true;
    payload.default_vat_rate = Number(form.elements.default_vat_rate?.value || 15);
    payload.quote_validity_days = Number(form.elements.quote_validity_days?.value || 7);

    try {
        await auth.refreshSession();
        if (!auth.isAuthenticated()) throw new Error("Your Super Admin session is no longer active. Please sign in again.");

        organisationProfile.setBusy(true, "Saving organisation master record securely…");

        const response = await fetch(`${REST}/rpc/save_organisation_master`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                apikey: authConfig.supabase.publishableKey,
                Authorization: `Bearer ${auth.getToken()}`,
                "Content-Type": "application/json",
                Prefer: "return=representation"
            },
            body: JSON.stringify({ p_payload: payload })
        });

        const raw = await response.text();
        let body = null;
        try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }

        if (!response.ok) {
            throw new Error(body?.message || body?.hint || body?.details || body?.error || String(body || `Organisation save failed (${response.status}).`));
        }

        const saved = Array.isArray(body) ? body[0] : body;
        if (!saved?.id) throw new Error("Supabase did not return the saved organisation master record.");

        organisationProfile.profile = saved;

        const logoFile = form.elements.logo_file?.files?.[0];
        if (logoFile) {
            const result = await adminBrandAssetService.upload({
                role: "ORGANISATION",
                userId: saved.id,
                file: logoFile
            });
            if (result?.asset_url) {
                const logoResponse = await fetch(`${REST}/organisation_profiles?id=eq.${encodeURIComponent(saved.id)}`, {
                    method: "PATCH",
                    headers: {
                        Accept: "application/json",
                        apikey: authConfig.supabase.publishableKey,
                        Authorization: `Bearer ${auth.getToken()}`,
                        "Content-Type": "application/json",
                        Prefer: "return=representation"
                    },
                    body: JSON.stringify({ logo_url: result.asset_url, updated_at: new Date().toISOString() })
                });
                if (!logoResponse.ok) {
                    const logoError = await logoResponse.text();
                    throw new Error(logoError || `Logo URL update failed (${logoResponse.status}).`);
                }
            }
        }

        await organisationProfile.load();
        organisationProfile.message("Organisation master record saved successfully. This is now the active Isaacs & Partners source of truth for new quotes and invoices.");
    } catch (error) {
        organisationProfile.message(error.message || "Unable to save the organisation master record.", true);
    } finally {
        organisationProfile.setBusy(false);
    }
}

organisationProfile.saveProfile = saveProfile;

export default organisationProfile;
