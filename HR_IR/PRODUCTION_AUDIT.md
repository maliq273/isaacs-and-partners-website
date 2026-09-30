# HR Customer-Facing Production Audit

## Current audit conclusion

The eight public HR/IR services are registered in the application catalogue and public service directory. The production pass must additionally verify that each service has a live Supabase service code, service-specific qualification questions, evidence expectations, commercial approval routing and a staff-delivery path.

## Required trace

| Stage | Required production record |
|---|---|
| Customer message | AI conversation / enquiry |
| Classification | HR_IR + service ID |
| Qualification | service qualification answers |
| Evidence | client documents / requested evidence |
| Pricing | client estimate or staff quote request |
| Payment | quote acceptance + verified invoice/payment state |
| Matter | service request/matter reference |
| Staff workflow | assignment/task + HR permission scope |
| Completion | outcome, client update and closure |

## Human-control requirements

- No autonomous HR/IR representation.
- No binding client price from the model.
- No paid-work release before the verified commercial gate.
- Super Admin can approve/modify/reject pricing.
- Staff must be authorised for HR/IR work.
- Customer-visible status must be derived from live records.
- Hindsight is learning context only and cannot override current operational truth.

## Source-backed intake considerations

CCMA material identifies the importance of hearing participants, disciplinary evidence, referral timing and proof of service; the service matrix therefore treats these as intake/evidence signals rather than autonomous legal conclusions. Current official sources must be rechecked by the human professional when the matter depends on a statutory deadline or current rule.
