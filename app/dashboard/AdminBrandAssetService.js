import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

const FUNCTION_NAME = "admin-upload-brand-asset";

class AdminBrandAssetService {
    async upload({ role, userId, file }) {
        if (!file) return null;
        if (!/^image\/(jpeg|png|webp)$/i.test(file.type || "")) {
            throw new Error("Only JPEG, PNG or WebP images are supported.");
        }
        if (file.size > 5 * 1024 * 1024) {
            throw new Error("The image must be 5 MB or smaller.");
        }

        await auth.initialise();
        const token = auth.getToken?.() || auth.getSession?.()?.access_token || auth.getSession?.()?.token;
        if (!token) throw new Error("AUTHENTICATION_REQUIRED: your administrator session is not available.");

        const dataUrl = await this.readAsDataUrl(file);
        const response = await fetch(`${authConfig.supabase.url}/functions/v1/${FUNCTION_NAME}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                apikey: authConfig.supabase.publishableKey,
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({ role, user_id: userId, data_url: dataUrl })
        });
        const raw = await response.text();
        let body = {};
        try { body = raw ? JSON.parse(raw) : {}; } catch { body = { error: raw }; }
        if (!response.ok) throw new Error(body?.error || body?.message || `Asset upload failed (${response.status}).`);
        return body;
    }

    readAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("The selected image could not be read."));
            reader.readAsDataURL(file);
        });
    }
}

export const adminBrandAssetService = new AdminBrandAssetService();
export default adminBrandAssetService;
