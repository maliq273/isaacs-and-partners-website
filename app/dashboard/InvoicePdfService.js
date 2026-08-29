import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
const money = value => new Intl.NumberFormat("en-ZA", { style:"currency", currency:"ZAR" }).format(Number(value || 0));

class InvoicePdfService {
    async request(path, options = {}) {
        const token = auth.getToken?.() || auth.getSession?.()?.access_token || auth.getSession?.()?.token;
        if (!token) throw new Error("Your session has expired. Please sign in again.");
        const response = await fetch(`${authConfig.supabase.url}/rest/v1/${path}`, {
            ...options,
            headers: { Accept:"application/json", apikey:authConfig.supabase.publishableKey, Authorization:`Bearer ${token}`, "Content-Type":"application/json", Prefer:"return=representation", ...(options.headers || {}) }
        });
        const raw = await response.text(); let body = null;
        try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
        if (!response.ok) throw new Error(body?.message || body?.hint || body?.details || String(body || `Invoice request failed (${response.status}).`));
        return body;
    }

    async load(id) {
        const invoices = await this.request(`invoices?id=eq.${encodeURIComponent(id)}&select=*`);
        const invoice = invoices?.[0];
        if (!invoice) throw new Error("Invoice could not be found.");
        const [items, profiles, businesses, matters] = await Promise.all([
            this.request(`invoice_items?invoice_id=eq.${encodeURIComponent(id)}&order=item_order&select=*`),
            invoice.individual_user_id ? this.request(`profiles?id=eq.${encodeURIComponent(invoice.individual_user_id)}&select=id,first_name,last_name,email,phone,avatar_url`) : Promise.resolve([]),
            invoice.business_id ? this.request(`businesses?id=eq.${encodeURIComponent(invoice.business_id)}&select=id,legal_name,trading_name,registration_number,tax_number,email,phone,logo_url`) : Promise.resolve([]),
            invoice.matter_id ? this.request(`matters?id=eq.${encodeURIComponent(invoice.matter_id)}&select=id,reference_number,title,status`) : Promise.resolve([])
        ]);
        const customer = invoice.individual_user_id ? profiles?.[0] : businesses?.[0];
        const logoUrl = invoice.document_logo_url || customer?.avatar_url || customer?.logo_url || "";
        if (logoUrl && invoice.document_logo_url !== logoUrl) {
            try { await this.request(`invoices?id=eq.${encodeURIComponent(id)}`, { method:"PATCH", body:JSON.stringify({ document_logo_url:logoUrl }) }); } catch (error) { console.warn("[InvoicePdfService] Could not snapshot logo", error); }
        }
        return { invoice, items:Array.isArray(items)?items:[], customer, matter:matters?.[0] || null, logoUrl };
    }

    async download(id) {
        const data = await this.load(id);
        const html = this.documentHtml(data);
        const popup = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");
        if (!popup) throw new Error("Please allow pop-ups to download the invoice PDF.");
        popup.document.open(); popup.document.write(html); popup.document.close();
        popup.focus();
        await new Promise(resolve => setTimeout(resolve, 450));
        const script = popup.document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        script.onload = () => {
            const target = popup.document.getElementById("invoice-pdf");
            const filename = `Invoice-${data.invoice.invoice_number || data.invoice.id}.pdf`;
            popup.html2pdf().set({
                margin: 0.35,
                filename,
                image: { type:"jpeg", quality:0.98 },
                html2canvas: { scale:2, useCORS:true, backgroundColor:"#ffffff" },
                jsPDF: { unit:"in", format:"a4", orientation:"portrait" },
                pagebreak: { mode:["css","legacy"] }
            }).from(target).save().then(() => setTimeout(() => popup.close(), 500));
        };
        script.onerror = () => { popup.print(); };
        popup.document.head.appendChild(script);
    }

    documentHtml({ invoice, items, customer, matter, logoUrl }) {
        const customerName = customer?.trading_name || customer?.legal_name || `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim() || customer?.email || "Customer";
        const issuer = { name:"Isaacs and Partners Pty(Ltd)", registration:"2025/474736/07", tax:"9293784261", email:"info@isaacsandpartners.online", phone:"+27 71 883 1097", web:"www.isaacsandpartners.online", address:"13 Middel Street, Kempenville, Cape Town, 7530" };
        const rows = items.map(item => `<tr><td><strong>${esc(item.item_name)}</strong><div class="muted">${esc(item.description || "")}</div></td><td class="right">${esc(item.quantity)}</td><td class="right">${money(item.rate)}</td><td class="right">${money(item.amount)}</td></tr>`).join("");
        return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(invoice.invoice_number)}</title><style>*{box-sizing:border-box}body{margin:0;background:#f1f3f6;font-family:Arial,Helvetica,sans-serif;color:#172033}.sheet{width:210mm;min-height:297mm;margin:20px auto;background:#fff;padding:18mm;box-shadow:0 8px 30px rgba(0,0,0,.12)}.top{display:flex;justify-content:space-between;gap:30px;border-bottom:3px solid #172033;padding-bottom:20px}.brand{display:flex;gap:18px;align-items:flex-start}.logo{width:82px;height:82px;object-fit:contain;border:1px solid #e2e5ea;border-radius:10px;padding:6px}.issuer h2{margin:0 0 6px;font-size:22px}.issuer p,.meta p{margin:3px 0;font-size:11px;color:#586174}.meta{text-align:right}.meta h1{font-size:30px;margin:0 0 8px;letter-spacing:1px}.meta strong{font-size:12px}.cards{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:22px}.card{border:1px solid #dfe3e9;border-radius:8px;padding:13px}.label{text-transform:uppercase;font-size:10px;font-weight:700;color:#697386;letter-spacing:.7px;margin-bottom:8px}.card strong{font-size:14px}.card div{font-size:11px;margin-top:4px}.items{width:100%;border-collapse:collapse;margin-top:24px}.items th{background:#172033;color:#fff;text-transform:uppercase;font-size:10px;padding:10px;text-align:left}.items td{padding:10px;border-bottom:1px solid #e4e7ec;font-size:11px}.right{text-align:right}.muted{color:#687386;margin-top:3px}.totals{width:320px;margin:20px 0 0 auto}.total{display:flex;justify-content:space-between;padding:7px 0;font-size:12px}.grand{border-top:2px solid #172033;font-size:17px;font-weight:700;padding-top:11px}.notes{margin-top:25px;padding:13px;background:#f7f8fa;border-radius:7px;font-size:10px;line-height:1.5}.footer{margin-top:30px;padding-top:12px;border-top:1px solid #dfe3e9;font-size:9px;color:#697386;text-align:center}.screen-only{margin:20px auto;text-align:center}.screen-only button{padding:10px 18px;border:0;border-radius:8px;background:#172033;color:#fff}@media print{body{background:#fff}.sheet{margin:0;box-shadow:none}.screen-only{display:none}}@page{size:A4;margin:0}</style></head><body><div class="sheet" id="invoice-pdf"><div class="top"><div class="brand">${logoUrl?`<img class="logo" src="${esc(logoUrl)}" crossorigin="anonymous" alt="Client logo">`:""}<div class="issuer"><h2>${issuer.name}</h2><p>Registration No: ${issuer.registration}</p><p>SARS Income Tax No: ${issuer.tax}</p><p>${issuer.address}</p><p>${issuer.email} · ${issuer.phone}</p><p>${issuer.web}</p></div></div><div class="meta"><h1>INVOICE</h1><p><strong>Invoice No:</strong> ${esc(invoice.invoice_number)}</p><p>Issue Date: ${esc(invoice.invoice_date || "—")}</p><p>Due Date: ${esc(invoice.due_date || "—")}</p><p>Terms: ${esc(invoice.terms || "DUE_ON_RECEIPT")}</p></div></div><div class="cards"><div class="card"><div class="label">Bill To</div><strong>${esc(customerName)}</strong><div>${esc(customer?.email || "")}</div><div>${esc(customer?.phone || "")}</div>${customer?.registration_number?`<div>Registration: ${esc(customer.registration_number)}</div>`:""}</div><div class="card"><div class="label">Matter</div><strong>${esc(matter?.reference_number || "No matter assigned")}</strong><div>${esc(matter?.title || "")}</div><div>${esc(invoice.subject || "")}</div></div></div><table class="items"><thead><tr><th>Description</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Amount</th></tr></thead><tbody>${rows || `<tr><td colspan="4">No line items</td></tr>`}</tbody></table><div class="totals"><div class="total"><span>Subtotal</span><strong>${money(invoice.subtotal)}</strong></div><div class="total"><span>Discount</span><strong>${money(invoice.discount_amount)}</strong></div><div class="total"><span>Tax</span><strong>${money(invoice.tax_amount)}</strong></div><div class="total"><span>Shipping</span><strong>${money(invoice.shipping_charge)}</strong></div><div class="total"><span>Adjustment</span><strong>${money(invoice.adjustment)}</strong></div><div class="total grand"><span>Total</span><strong>${money(invoice.total)}</strong></div><div class="total"><span>Amount Paid</span><strong>${money(invoice.amount_paid)}</strong></div><div class="total"><span>Balance Due</span><strong>${money(invoice.balance_due)}</strong></div></div>${invoice.customer_notes?`<div class="notes"><strong>Customer Notes</strong><br>${esc(invoice.customer_notes)}</div>`:""}${invoice.terms_and_conditions?`<div class="notes"><strong>Terms & Conditions</strong><br>${esc(invoice.terms_and_conditions)}</div>`:""}<div class="footer">Isaacs and Partners Pty(Ltd) · Registration No. ${issuer.registration} · SARS Income Tax No. ${issuer.tax}<br>${issuer.email} · ${issuer.phone}</div></div><div class="screen-only"><button onclick="window.print()">Print / Save as PDF</button></div></body></html>`;
    }
}

export const invoicePdfService = new InvoicePdfService();
export default invoicePdfService;
