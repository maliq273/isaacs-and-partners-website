import ImmigrationInterviewEngine from "../immigration/ImmigrationInterviewEngine.js";

function clean(value, max = 4096) {
  return String(value ?? "").trim().slice(0, max);
}

function firstMatch(text, pattern) {
  const match = String(text || "").match(pattern);
  return match?.[1] ? clean(match[1], 500) : null;
}

function normalisePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits || null;
}

function parseTestMatter(message) {
  const text = String(message || "");
  const name = firstMatch(text, /(?:Name)\s*:\s*([^\n\r]+)/i);
  const dob = firstMatch(text, /(?:Date of birth)\s*:\s*([^\n\r]+)/i);
  const nationality = firstMatch(text, /(?:Nationality)\s*:\s*([^\n\r]+)/i);
  const passport = firstMatch(text, /(?:Passport number)\s*:\s*([^\n\r]+)/i);
  const email = firstMatch(text, /(?:Email)\s*:\s*<?(?:\[)?([^\]<>\s]+)(?:\])?(?:\([^)]*\))?/i);
  const whatsapp = firstMatch(text, /(?:WhatsApp)\s*:\s*([^\n\r]+)/i);
  const reference = firstMatch(text, /(?:Matter reference)\s*:\s*([^\n\r]+)/i);
  const title = firstMatch(text, /(?:Matter title)\s*:\s*([^\n\r]+)/i);
  const service = firstMatch(text, /(?:Service)\s*:\s*([^\n\r]+)/i);
  const applicationType = firstMatch(text, /(?:Application type)\s*:\s*([^\n\r]+)/i);
  const employer = firstMatch(text, /(?:Employer)\s*:\s*([^\n\r]+)/i);
  const position = firstMatch(text, /(?:Position)\s*:\s*([^\n\r]+)/i);
  const occupation = firstMatch(text, /(?:Occupation)\s*:\s*([^\n\r]+)/i);
  const salary = firstMatch(text, /(?:Annual salary)\s*:\s*([^\n\r]+)/i);
  const workLocation = firstMatch(text, /(?:Work location)\s*:\s*([^\n\r]+)/i);
  const employmentStatus = firstMatch(text, /(?:Employment status)\s*:\s*([^\n\r]+)/i);

  const names = String(name || "").split(/\s+/).filter(Boolean);
  const firstNames = names.length > 1 ? names.slice(0, -1).join(" ") : names[0] || null;
  const surname = names.length > 1 ? names.at(-1) : null;
  const routeText = String(service || "") + " " + String(applicationType || "");
  const caseType = /critical\s+skills/i.test(routeText)
    ? "critical_skills"
    : /general\s+work/i.test(routeText)
      ? "general_work"
      : "temporary_residence";

  const answers = {};
  const put = (key, value, source = "SUPER_ADMIN_TEST_INSTRUCTION") => {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      const parts = key.split(".");
      let target = answers;
      for (let i = 0; i < parts.length - 1; i += 1) target = target[parts[i]] ??= {};
      target[parts.at(-1)] = { value: clean(value, 1000), source, status: "UNCONFIRMED" };
    }
  };

  put("identity.first_names", firstNames);
  put("identity.surname", surname);
  put("identity.date_of_birth", dob);
  put("identity.nationality", nationality);
  put("passport.number", passport);
  put("contact.email", email?.toLowerCase());
  put("contact.phone", normalisePhone(whatsapp));
  put("employment.employer", employer);
  put("employment.job_title", position);
  put("employment.occupation", occupation);
  put("employment.salary", salary);
  put("employment.work_location", workLocation);
  put("employment.status", employmentStatus);

  return {
    name, firstNames, surname, dob, nationality, passport,
    email: email?.toLowerCase() || null, phone: normalisePhone(whatsapp),
    reference, title, service, applicationType, employer, position,
    occupation, salary, workLocation, employmentStatus, caseType, answers
  };
}

export default class ImmigrationMatterAuthorityService {
  constructor({ db } = {}) {
    if (!db) throw new Error("ImmigrationMatterAuthorityService requires a Supabase admin client.");
    this.db = db;
  }

  async createOrLoad({ identity, message, conversationId = null } = {}) {
    const parsed = parseTestMatter(message);
    const authorityRole = String(identity?.authorityRole || "").toUpperCase();

    if (!["SUPER_ADMIN", "DIRECTOR", "PARTNER", "SHAREHOLDER", "STAKEHOLDER", "STAFF"].includes(authorityRole)) {
      return { handled: true, executed: false, action: "CREATE_IMMIGRATION_MATTER", reply: "I cannot create an immigration matter from this WhatsApp authority." };
    }

    if (!parsed.reference || !parsed.title) {
      return { handled: true, executed: false, action: "CREATE_IMMIGRATION_MATTER", reply: "I can create the immigration matter, but I need the matter reference and matter title." };
    }

    const existingMatter = await this.db.from("matters").select("*").eq("reference_number", parsed.reference).maybeSingle();
    if (existingMatter.error) throw existingMatter.error;

    if (existingMatter.data) {
      const workflow = await this.db.from("anthony_workflow_state").select("*").eq("matter_id", existingMatter.data.id).maybeSingle();
      if (workflow.error) throw workflow.error;
      return {
        handled: true, executed: true, action: "CREATE_IMMIGRATION_MATTER",
        created: false, loaded: true, matter: existingMatter.data, workflow: workflow.data || null,
        reply: "I found the existing test matter " + parsed.reference + ". I will not create a duplicate."
      };
    }

    if (!parsed.email || !parsed.name) {
      return { handled: true, executed: false, action: "CREATE_IMMIGRATION_MATTER", reply: "I can create the matter, but I need the test client's full name and email address." };
    }

    let profile = await this.db.from("profiles").select("*").eq("email", parsed.email).maybeSingle();
    if (profile.error) throw profile.error;

    let clientUserId = profile.data?.id || null;
    let createdAuthUser = false;

    if (!clientUserId) {
      const password = crypto.randomUUID() + "Aa1!";
      const created = await this.db.auth.admin.createUser({
        email: parsed.email,
        password,
        email_confirm: true,
        user_metadata: {
          account_type: "individual",
          first_name: parsed.firstNames,
          last_name: parsed.surname,
          phone: parsed.phone,
          source: "anthony-controlled-immigration-test"
        }
      });

      if (created.error || !created.data?.user?.id) {
        throw new Error("Test client authentication record could not be created: " + (created.error?.message || "unknown error"));
      }

      clientUserId = created.data.user.id;
      createdAuthUser = true;

      const savedProfile = await this.db.from("profiles").upsert({
        id: clientUserId,
        email: parsed.email,
        first_name: parsed.firstNames,
        last_name: parsed.surname,
        phone: parsed.phone,
        role: "INDIVIDUAL",
        is_active: true
      }, { onConflict: "id" }).select("*").single();

      if (savedProfile.error) {
        await this.db.auth.admin.deleteUser(clientUserId);
        throw savedProfile.error;
      }

      profile = savedProfile;
    }

    const matter = await this.db.from("matters").insert({
      reference_number: parsed.reference,
      individual_user_id: clientUserId,
      title: parsed.title,
      description: "Controlled Anthony immigration workflow test. Service: " +
        (parsed.service || "South African Critical Skills Work Visa") +
        ". Application type: " +
        (parsed.applicationType || "Temporary Residence / Critical Skills Work Visa") + ".",
      status: "NEW",
      priority: "NORMAL",
      created_by: identity?.authority?.user_id || null,
      service_type: parsed.caseType === "critical_skills" ? "IMM-CRITICAL-SKILLS" : "IMM-GENERAL"
    }).select("*").single();

    if (matter.error || !matter.data) {
      if (createdAuthUser && clientUserId) {
        await this.db.from("profiles").delete().eq("id", clientUserId);
        await this.db.auth.admin.deleteUser(clientUserId);
      }
      throw matter.error || new Error("Matter could not be created.");
    }

    const interview = new ImmigrationInterviewEngine({ caseType: parsed.caseType, answers: parsed.answers });
    const completeness = interview.completeness();
    const requiredQuestionKeys = interview.questions().filter(q => q.required).map(q => q.key);

    const workflow = await this.db.from("anthony_workflow_state").insert({
      client_user_id: clientUserId,
      matter_id: matter.data.id,
      conversation_id: conversationId,
      state: "QUALIFICATION",
      release_status: "HELD_PENDING_FINAL_PAYMENT",
      required_question_keys: requiredQuestionKeys,
      known_facts: parsed.answers
    }).select("*").single();

    if (workflow.error) {
      await this.db.from("matters").delete().eq("id", matter.data.id);
      if (createdAuthUser && clientUserId) {
        await this.db.from("profiles").delete().eq("id", clientUserId);
        await this.db.auth.admin.deleteUser(clientUserId);
      }
      throw workflow.error;
    }

    const missing = completeness.missing.map(item => ({ key: item.key, question: item.q }));
    const nextQuestions = interview.getNextQuestions(5).map(item => ({ key: item.key, question: item.q }));

    return {
      handled: true,
      executed: true,
      action: "CREATE_IMMIGRATION_MATTER",
      created: true,
      loaded: false,
      client: { userId: clientUserId, email: parsed.email, name: parsed.name, created: createdAuthUser },
      matter: matter.data,
      workflow: workflow.data,
      completeness: {
        ready: completeness.ready,
        required: completeness.required,
        answered: completeness.answered,
        missingCount: missing.length,
        missing
      },
      nextQuestions,
      documents: {
        generated: [],
        generationBlocked: true,
        reason: "Official DHA document generation remains blocked until required application evidence is complete and an authorised template gate is satisfied."
      },
      reply: "I created the test client and immigration matter " + parsed.reference +
        ". The matter is now in qualification. I have not generated or submitted any DHA/VFS document because the required application evidence is incomplete.\\n\\nInternal file check — please confirm what is already held:\\n☐ Passport biodata page\\n☐ Offer of employment / employment contract\\n☐ Highest relevant qualification\\n☐ Professional registration, if applicable\\n☐ Current visa / permit or immigration status document\\n☐ Proof of residence\\n☐ Previous visa/refusal records, if any\\n\\nYou are not being asked to complete the client interview. Anthony will compile the file, then obtain the outstanding information/documents from the client and check payment before proceeding."
    };
  }
}

export { parseTestMatter };
