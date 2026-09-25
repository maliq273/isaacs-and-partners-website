#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re, subprocess, xml.etree.ElementTree as ET
from pathlib import Path

ROOT=Path("immigrations_docs")
OUT=Path("app/knowledgebase/immigration_docs/coordinate-maps")
OUT.mkdir(parents=True,exist_ok=True)

FORMS={
 "DHA-84":{
  "file":"dha84-form11.pdf","purpose":"Port of Entry Visa or Transit Visa (Form 11). Used to collect the traveller's identity, travel document, residence/contact information, South Africa visit details, host/contact details, admissibility/security declarations and transit information where applicable.",
  "source_notes":"Official government/consular copies identify DHA-84 as Form 11 and require a separate form for each accompanying family member. The current repository copy is the source template used for rendering.",
  "fields":[
   ("surname","Surname","identity.surname"),("first_names","First names (in full)","identity.firstNames"),
   ("maiden_name","Maiden name","identity.maidenName"),("previous_surnames","Previous surname(s)","identity.previousSurnames"),
   ("date_of_birth","Date of birth","identity.dateOfBirth"),("country_of_birth","Country of birth","identity.countryOfBirth"),
   ("gender","Gender","identity.gender"),("nationality","Nationality","identity.nationality"),
   ("original_nationality","original nationality","identity.originalNationality"),("nationality_acquired","Where and when was present nationality obtained","identity.nationalityAcquired"),
   ("passport_number","Passport/Travel Document Number","identity.passportNumber"),("issuing_authority","Issuing authority","identity.passportIssuingAuthority"),
   ("passport_expiry","Date of expiry","identity.passportExpiry"),("document_type","Type of document","identity.documentType"),
   ("permanent_address","Permanent residential address","residence.homeAddress"),("address_period","Period resident at this address","residence.addressPeriod"),
   ("permanent_residence_country","Country of permanent residence","residence.permanentCountry"),("telephone","Telephone number","contact.telephone"),
   ("home_phone","Home telephone No","contact.homePhone"),("cell_phone","Cellphone No","contact.mobile"),("email","E-mail address","contact.email"),
   ("country_residence_period","Period resident in that country","residence.countryPeriod"),("occupation","Occupation or profession","employment.occupation"),
   ("employer","Name of Employer, University Organisation","employment.employer"),("employer_address","Address","employment.address"),
   ("employer_phone","Telephone No","employment.telephone"),("employer_fax","Fax No","employment.fax"),
   ("self_employed_business","Name of business","employment.selfEmployedBusiness"),("self_employed_address","Address","employment.selfEmployedAddress"),
   ("self_employed_phone","Telephone No","employment.selfEmployedPhone"),("self_employed_fax","Fax No","employment.selfEmployedFax"),
   ("marital_status","Marital status","family.maritalStatus"),("spouse_first_names","First name(s) of spouse","spouse.firstNames"),
   ("spouse_maiden_name","Maiden name","spouse.maidenName"),("marriage_date_place","Date and place of marriage","spouse.marriageDatePlace"),
   ("spouse_dob","Date of birth of spouse","spouse.dateOfBirth"),("spouse_nationality","Nationality","spouse.nationality"),
   ("arrival_date","Expected date of arrival in the Republic","visit.arrivalDate"),("arrival_place","Place of arrival","visit.arrivalPlace"),
   ("purpose","Purpose of visit","visit.purpose"),("duration","Duration of stay","visit.duration"),("entries","Number of entries required","visit.entries"),
   ("sa_address","Residential (physical) Address in the Republic","visit.saAddress"),("host","Name of Host or Hotel","visit.hostName"),
   ("host_phone","Telephone of Host or Hotel","visit.hostPhone"),("contacts","Names of Organisations or persons you will be contacting","visit.contacts"),
   ("sa_host_id","Identity document number or permanent residence permit number of South African host","visit.saHostId"),
   ("affirmative_details","Give particulars if reply to any of the questions above is in the affirmative","admissibility.affirmativeDetails"),
   ("transit_destination","Destination after leaving the Republic","transit.destination"),("transit_mode","Mode of travel to destination","transit.mode"),
   ("transit_departure","Intended date and port of departure from the Republic to that destination","transit.departure"),
   ("transit_visa","Visa or permit for destination country","transit.destinationVisa"),
   ("applicant_signature","Signature of applicant","declaration.signature"),("declaration_date","Date","declaration.date")
  ]},
 "BI-947":{
  "file":"BI-947.pdf","purpose":"Application for a Permanent Residence Permit (Form 18). Used for permanent residence applications under the categories/grounds set out in the form and accompanying requirements.",
  "source_notes":"The DHA form states that pages 13-18 contain category-specific document requirements, that applicants are interviewed, and that the completed form must be accompanied by the applicable documents.",
  "fields":[
   ("title","1.1 Title","applicant.title"),("surname","1.2 Surname","applicant.surname"),("first_names","1.3 First name(s)","applicant.firstNames"),
   ("maiden_name","1.4 Maiden name","applicant.maidenName"),("former_surnames","1.5 Other former surnames","applicant.formerSurnames"),
   ("dob","1.6 Date of birth","applicant.dateOfBirth"),("birth_country","1.7 Country of birth","applicant.countryOfBirth"),
   ("nationality_birth","1.8 Nationality at birth","applicant.nationalityAtBirth"),("nationality_current","1.9 Present nationality","applicant.presentNationality"),
   ("passport","1.10 Passport No.","applicant.passportNumber"),("passport_expiry","Expiry date","applicant.passportExpiry"),("passport_issued_by","1.11 Issued by (country)","applicant.passportIssuedBy"),
   ("marital_status","1.11 Marital status","applicant.maritalStatus"),("relationship_type","1.12 Type of marriage/relationship","applicant.relationshipType"),
   ("marriage_date","1.13 Date of marriage/notarial contract concluded","applicant.marriageDate"),
   ("previous_relationships","1.14 Details of previous marriage(s) or permanent spousal relationship(s)","applicant.previousRelationships"),
   ("marriage_place","Date and place of marriage/commencement of spousal relationship","applicant.relationshipCommencement"),
   ("divorce_place","Date and place of divorce/separation","applicant.divorceSeparation"),
   ("custody_maintenance","Details about custody/maintenance of children","applicant.custodyMaintenance"),
   ("residential_address","1.15 Present residential address","applicant.residentialAddress"),("suburb_city","Suburb/City/Town","applicant.suburbCity"),
   ("residence_since","Since","applicant.residenceSince"),("postal_address","1.16 Postal address","applicant.postalAddress"),
   ("postal_suburb","Suburb","applicant.postalSuburb"),("postal_city","City","applicant.postalCity"),("postal_code","Code","applicant.postalCode"),
   ("home_phone","1.17 Tel. No. Home","applicant.homePhone"),("work_phone","Work","applicant.workPhone"),("email","E-mail address","applicant.email"),
   ("occupation","1.18 Occupation","applicant.occupation"),("temp_permit","1.19 Type of temporary residence permit held","applicant.tempPermit"),
   ("permit_valid_until","1.20 Valid until","applicant.permitValidUntil"),("permit_office","Issuing office","applicant.permitIssuingOffice"),
   ("father","2.1 Father","parents.father"),("mother","2.2 Mother","parents.mother"),
   ("spouse","3. Details of applicant's spouse","spouse.details"),("spouse_parents","4. Details of spouse's parents","spouseParents.details"),
   ("children","5. Details of biological or legally adopted children","children.details"),("children_not_applying","6. Children not applying and reasons","children.notApplying"),
   ("adult_dependants","7. Children over 21 dependent and reasons","children.adultDependants"),("sa_relatives","8. Relatives/friends resident in South Africa","relativesInSA"),
   ("employment_record","9. Employment record","employment.fullRecord"),("current_duties","Present/last duties","employment.currentDuties"),
   ("spouse_duties","Spouse's present/last duties","spouse.currentDuties"),("intended_occupation","Occupation intended following in South Africa","employment.intendedOccupation"),
   ("funds_transfer","Amount of money to transfer to South Africa","financial.transferAmount"),("pension_income","Pension/private income","financial.pensionIncome"),
   ("assets","Other assets","financial.assets"),("mother_tongue","10. Mother tongue","language.motherTongue"),
   ("language_proficiency","Proficiency in other languages","language.proficiency"),("family_origin","11. Family members remaining in country of origin","familyOrigin"),
   ("residence_history","12. Previous/current residence history","residenceHistory"),
   ("criminal","13(a)(i) Criminal conviction","declarations.criminalConviction"),("insolvent","13(a)(ii) Insolvency","declarations.insolvent"),
   ("civil_action","13(a)(iii) Civil action","declarations.civilAction"),("outstanding_debts","13(b) Outstanding debts","declarations.debts"),
   ("pending_enquiry","13(c) Pending civil/criminal enquiry","declarations.pendingEnquiry"),("previous_pr","13(d) Previous permanent residence application","declarations.previousPR"),
   ("refused_removed","13(e) Refused entry/PR/removed/deported","declarations.refusedRemoved"),("previous_sa","13(f) Previously in South Africa","declarations.previousSouthAfrica"),
   ("health","13(g) Infectious/physical/mental condition","declarations.health"),("other_relationship","13(h) Other spousal relationship","declarations.otherRelationship"),
   ("asylum_elsewhere","13(i) Asylum applications elsewhere","declarations.asylumElsewhere"),("contact_sa","14. Contact address/telephone in South Africa","contact.saContact"),
   ("spouse_employment","Employment details of spouse if SA citizen/PR","spouse.employment"),("signature_applicant","Signature of applicant","declaration.applicantSignature"),
   ("signature_spouse","Signature of legal spouse","declaration.spouseSignature"),("signature_date","Date","declaration.date")
  ]},
 "BI-1712A":{
  "file":"Spousal-RelationshipBI-1712A-Form-12-1.pdf","purpose":"Affidavit in respect of parties to a permanent spousal relationship (Form 12). Part A is for the initial application; Part B is for demonstrating the relationship continues two years after issuance of the visa/permit.",
  "source_notes":"Official Gazette/consular copies identify Part A as the initial application and Part B as the two-year continuation affidavit. The form covers the citizen/permanent resident/foreigner and foreigner particulars, relationship history, children, signatures and Commissioner of Oaths.",
  "fields":[
   ("a_surname","Part A citizen/PR/foreigner surname","partA.sponsor.surname"),("a_gender","Part A gender","partA.sponsor.gender"),("a_first_names","Part A first names","partA.sponsor.firstNames"),
   ("a_address","Part A residential address","partA.sponsor.address"),("a_id","Part A Identity No.","partA.sponsor.identityNumber"),("a_passport","Part A Passport No.","partA.sponsor.passportNumber"),
   ("a_nationality","Part A nationality","partA.sponsor.nationality"),("a_dob","Part A date of birth","partA.sponsor.dateOfBirth"),("a_first_entry","Part A date of first entry","partA.sponsor.firstEntry"),
   ("a_permit","Part A type of permit","partA.sponsor.permitType"),("a_expiry","Part A permit expiry","partA.sponsor.permitExpiry"),
   ("a_foreigner_surname","Part A foreigner surname","partA.foreigner.surname"),("a_foreigner_gender","Part A foreigner gender","partA.foreigner.gender"),
   ("a_foreigner_first_names","Part A foreigner first names","partA.foreigner.firstNames"),("a_foreigner_address","Part A foreigner residential address","partA.foreigner.address"),
   ("a_foreigner_passport","Part A foreigner passport","partA.foreigner.passportNumber"),("a_foreigner_dob","Part A foreigner date of birth","partA.foreigner.dateOfBirth"),
   ("a_foreigner_birthplace","Part A foreigner place of birth","partA.foreigner.placeOfBirth"),("a_foreigner_nationality","Part A foreigner nationality","partA.foreigner.nationality"),
   ("a_foreigner_first_entry","Part A foreigner first entry","partA.foreigner.firstEntry"),("a_foreigner_visa","Part A foreigner visa/permit","partA.foreigner.visaPermit"),
   ("a_foreigner_expiry","Part A foreigner expiry","partA.foreigner.expiry"),
   ("a_relationship_duration","Part A relationship duration","relationship.duration"),("a_relationship_status","Part A relationship status/intent","relationship.status"),
   ("a_cohabitation","Part A cohabitation and reciprocal support","relationship.cohabitationSupport"),("a_exclusivity","Part A exclusivity/no other relationship","relationship.exclusivity"),
   ("a_evidence","Part A evidence of cohabitation/shared finances","relationship.evidence"),("a_children","Part A children","relationship.children"),
   ("a_signature_1","Part A sponsor signature","partA.signatureSponsor"),("a_signature_2","Part A foreign spouse signature","partA.signatureForeign"),
   ("a_oath_date","Part A oath date","commissioner.oathDate"),("a_commissioner_first","Commissioner first names","commissioner.firstNames"),
   ("a_commissioner_surname","Commissioner surname","commissioner.surname"),("a_commissioner_capacity","Commissioner capacity","commissioner.capacity"),("a_commissioner_place","Commissioner place","commissioner.place"),
   ("b_surname","Part B citizen/PR/foreigner surname","partB.sponsor.surname"),("b_gender","Part B gender","partB.sponsor.gender"),("b_first_names","Part B first names","partB.sponsor.firstNames"),
   ("b_address","Part B residential address","partB.sponsor.address"),("b_id","Part B Identity No.","partB.sponsor.identityNumber"),("b_passport","Part B Passport No.","partB.sponsor.passportNumber"),
   ("b_nationality","Part B nationality","partB.sponsor.nationality"),("b_dob","Part B date of birth","partB.sponsor.dateOfBirth"),("b_first_entry","Part B first entry","partB.sponsor.firstEntry"),
   ("b_permit","Part B permit","partB.sponsor.permitType"),("b_expiry","Part B expiry","partB.sponsor.permitExpiry"),
   ("b_foreigner_surname","Part B foreigner surname","partB.foreigner.surname"),("b_foreigner_gender","Part B foreigner gender","partB.foreigner.gender"),
   ("b_foreigner_first_names","Part B foreigner first names","partB.foreigner.firstNames"),("b_foreigner_address","Part B foreigner address","partB.foreigner.address"),
   ("b_foreigner_passport","Part B foreigner passport","partB.foreigner.passportNumber"),("b_foreigner_dob","Part B foreigner date of birth","partB.foreigner.dateOfBirth"),
   ("b_foreigner_birthplace","Part B foreigner place of birth","partB.foreigner.placeOfBirth"),("b_foreigner_nationality","Part B foreigner nationality","partB.foreigner.nationality"),
   ("b_foreigner_first_entry","Part B foreigner first entry","partB.foreigner.firstEntry"),("b_foreigner_visa","Part B foreigner visa/permit","partB.foreigner.visaPermit"),
   ("b_foreigner_expiry","Part B foreigner expiry","partB.foreigner.expiry"),
   ("b_prior_affidavit_date","Part B date prior affidavit deposed","relationship.priorAffidavitDate"),("b_relationship_continues","Part B relationship still subsists","relationship.continues"),
   ("b_children","Part B children","relationship.children"),("b_signature_1","Part B spouse signature","partB.signature1"),("b_signature_2","Part B spouse signature","partB.signature2"),
   ("b_oath_date","Part B oath date","commissioner.oathDate"),("b_commissioner","Part B Commissioner of Oaths","commissioner.details")
  ]}
}

def sha(path):
 h=hashlib.sha256()
 with path.open("rb") as f:
  for b in iter(lambda:f.read(1048576),b""): h.update(b)
 return h.hexdigest()

def bbox_lines(pdf):
 info=subprocess.check_output(["pdfinfo",str(pdf)],text=True)
 pages_n=int(re.search(r"^Pages:\s+(\d+)",info,re.M).group(1))
 page_size=re.search(r"^Page size:\s+([0-9.]+) x ([0-9.]+) points",info,re.M)
 pw,ph=float(page_size.group(1)),float(page_size.group(2))
 work=Path("/tmp/ocr-pages"); work.mkdir(parents=True,exist_ok=True)
 pages=[]
 for pn in range(1,pages_n+1):
  stem=work/f"p{pn}"
  img=Path(str(stem)+".png")
  subprocess.run(["pdftoppm","-png","-r","150","-f",str(pn),"-singlefile",str(pdf),str(stem)],check=True,stdout=subprocess.DEVNULL)
  tsv=Path(str(stem)+".tsv")
  subprocess.run(["tesseract",str(img),str(stem),"--psm","6","tsv"],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  words=[]
  lines=tsv.read_text(encoding="utf-8",errors="ignore").splitlines()
  for row in lines[1:]:
   cols=row.split("\t")
   if len(cols)<12 or not cols[11].strip(): continue
   try:
    left,top,width,height=map(int,cols[6:10]); txt=cols[11].strip()
   except: continue
   # Convert image pixels (150 dpi, top-left) to PDF points (bottom-left).
   scale=72/150
   x1=left*scale; x2=(left+width)*scale
   y2=ph-top*scale; y1=ph-(top+height)*scale
   words.append({"text":txt,"x1":x1,"y1":y1,"x2":x2,"y2":y2,"conf":float(cols[10]) if cols[10] else -1})
  pages.append({"page":pn,"width":pw,"height":ph,"words":words})
 return pages

