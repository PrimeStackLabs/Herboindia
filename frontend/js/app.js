/**
 * Herbo India - Main Interactive Application Logic
 * 100% Dynamic Multilingual Switching, WhatsApp Integration,
 * Course Estimator Quiz, Anonymous Messenger with Dual Persistence,
 * FAQ Accordion, and Live Social Proof Ticker.
 */

const HERBO_PHONE = "9920086376";
const HERBO_PHONE_INTL = "919920086376";
let currentLanguage = localStorage.getItem("herbo_lang") || "kn";
let selectedProblemKey = "prob1";

// Intelligent API base for separate client dev server (localhost:5173), direct monolith (localhost:3000), or file:// execution
const API_BASE = (typeof window !== 'undefined' && window.__API_BASE__)
  || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? (window.location.port === '3000' ? '' : 'http://localhost:3000')
      : (typeof window !== 'undefined' && window.location.protocol === 'file:')
        ? 'http://localhost:3000'
        : '');

const problemNames = {
  prob1: {
    en: "Premature Ejaculation (Early Discharge)",
    kn: "ಶೀಘ್ರ ಸ್ಖಲನ (Premature Ejaculation)",
    hi: "शीघ्रपतन (Premature Ejaculation)"
  },
  prob2: {
    en: "Erectile Dysfunction & Hardness Problem",
    kn: "ನಿಮಿರುವಿಕೆ ಸಮಸ್ಯೆ ಮತ್ತು ಗಡಸುತನದ ಕೊರತೆ",
    hi: "स्तंभन दोष और कड़ापन की कमी"
  },
  prob3: {
    en: "Penile Weakness Due to Masturbation",
    kn: "ಕರಹಸ್ತಮೈಥುನದಿಂದ ಉಂಟಾಗುವ ಶಿಶ್ನದ ದೌರ್ಬಲ್ಯ",
    hi: "हस्तमैथुन से आई नसों की कमजोरी"
  },
  prob4: {
    en: "Small Penis Size & Poor Girth",
    kn: "ಶಿಶ್ನದ ಗಾತ್ರ ಮತ್ತು ದಪ್ಪದ ಕೊರತೆ",
    hi: "लिंग का छोटापन व पतलापन"
  },
  prob5: {
    en: "Lack of Sexual Interest (Low Libido)",
    kn: "ಲೈಂಗಿಕ ನಿರಾಶಕ್ತಿ ಮತ್ತು ಕಾಮೋತ್ತೇಜನದ ಕೊರತೆ",
    hi: "कामेच्छा की कमी (लो लिबिडो)"
  },
  prob6: {
    en: "Low Sperm Count & Watery Semen",
    kn: "ವೀರ್ಯಾಣು ಕೊರತೆ ಮತ್ತು ತೆಳು ವೀರ್ಯ",
    hi: "शुक्राणु की कमी व पतला वीर्य"
  },
  prob7: {
    en: "Nervous Weakness & Chronic Fatigue",
    kn: "ನರದೌರ್ಬಲ್ಯ ಮತ್ತು ಆಯಾಸ",
    hi: "नसों की कमजोरी व शारीरिक थकान"
  },
  prob8: {
    en: "Newlywed Anxiety & Performance Panic",
    kn: "ಮದುವೆ ಪ್ರಮಾದ ಮತ್ತು ನವವಿವಾಹಿತರ ಆತಂಕ",
    hi: "नवविवाहितों की घबराहट व सेक्सुअल चिंता"
  }
};

document.addEventListener("DOMContentLoaded", () => {
  initLanguage(currentLanguage);
  setupProblemCards();
  setupQuizEstimator();
  setupAnonymousForm();
  setupOrderModal();
  setupFaqAccordion();
  startLiveOrderTicker();
  setupHeaderScrollAndScrollspy();
  setupMobileDrawer();
});

/* ==========================================================================
   100% COMPLETE MULTILINGUAL ENGINE
   ========================================================================== */
function initLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem("herbo_lang", lang);
  document.documentElement.lang = lang;

  // Set font class on body
  document.body.className = `lang-${lang}`;

  // Update active state on language buttons
  document.querySelectorAll(".lang-btn").forEach(btn => {
    if (btn.getAttribute("data-lang") === lang) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  const dict = translations[lang] || translations.en;

  // 1. Update Document Title
  if (lang === "kn") {
    document.title = "Herbo India - ಪುರುಷರ ಲೈಂಗಿಕ ಸಮಸ್ಯೆಗೆ ಶಾಶ್ವತ ಆಯುರ್ವೇದ ಪರಿಹಾರ | 30 ದಿನಗಳ ಗ್ಯಾರಂಟಿ ಕೋರ್ಸ್";
  } else if (lang === "hi") {
    document.title = "Herbo India - पुरुषों की गुप्त समस्याओं का स्थायी आयुर्वेदिक समाधान | 30 दिन का कोर्स";
  } else {
    document.title = "Herbo India - Permanent Solution for Men's Sexual Problems | 100% Pure Ayurveda";
  }

  // 2. Update text content for all elements with data-i18n
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      el.innerHTML = dict[key];
    }
  });

  // 3. Update all input/textarea placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (dict[key]) {
      el.setAttribute("placeholder", dict[key]);
    }
  });

  // 4. Update all select dropdown options dynamically
  updateAllSelectDropdowns(dict);

  // 5. Update dynamic links
  updateWhatsAppLinks();
  updateProblemActionBar();
}

function updateAllSelectDropdowns(dict) {
  // 1. Anonymous consultation issue dropdown
  const anonSelect = document.getElementById("anonIssue");
  if (anonSelect) {
    const curVal = anonSelect.value;
    anonSelect.innerHTML = `
      <option value="${dict.optPrematureEjaculation}">${dict.optPrematureEjaculation}</option>
      <option value="${dict.optErectileDysfunction}">${dict.optErectileDysfunction}</option>
      <option value="${dict.optMasturbationWeakness}">${dict.optMasturbationWeakness}</option>
      <option value="${dict.optSizeConcerns}">${dict.optSizeConcerns}</option>
      <option value="${dict.optLowLibido}">${dict.optLowLibido}</option>
      <option value="${dict.optLowSperm}">${dict.optLowSperm}</option>
      <option value="${dict.optFatigue}">${dict.optFatigue}</option>
      <option value="${dict.optNewlywed}">${dict.optNewlywed}</option>
    `;
    if (curVal) anonSelect.value = curVal;
  }

  // 2. Order modal problem dropdown
  const orderSelect = document.getElementById("orderProblem");
  if (orderSelect) {
    const curVal = orderSelect.value;
    orderSelect.innerHTML = `
      <option value="${dict.optPrematureEjaculation}">${dict.optPrematureEjaculation}</option>
      <option value="${dict.optErectileDysfunction}">${dict.optErectileDysfunction}</option>
      <option value="${dict.optMasturbationWeakness}">${dict.optMasturbationWeakness}</option>
      <option value="${dict.optSizeConcerns}">${dict.optSizeConcerns}</option>
      <option value="${dict.optAllInOne}">${dict.optAllInOne}</option>
    `;
    if (curVal) orderSelect.value = curVal;
  }

  // 2b. Order modal product dropdown
  const orderProductSelect = document.getElementById("orderProduct");
  if (orderProductSelect) {
    const curProdVal = orderProductSelect.value || "combo";
    orderProductSelect.innerHTML = `
      <option value="combo">${dict.modalOptCombo}</option>
      <option value="tablets">${dict.modalOptTablets}</option>
      <option value="oil">${dict.modalOptOil}</option>
      <option value="cream">${dict.modalOptCream}</option>
    `;
    orderProductSelect.value = curProdVal;
  }

  // 3. Symptom quiz age dropdown
  const quizAge = document.getElementById("quizAge");
  if (quizAge) {
    quizAge.innerHTML = `
      <option value="1">${dict.quizAge1}</option>
      <option value="2">${dict.quizAge2}</option>
      <option value="3">${dict.quizAge3}</option>
      <option value="4">${dict.quizAge4}</option>
    `;
  }

  // 4. Symptom quiz duration dropdown
  const quizDur = document.getElementById("quizDuration");
  if (quizDur) {
    quizDur.innerHTML = `
      <option value="1">${dict.quizDur1}</option>
      <option value="2">${dict.quizDur2}</option>
      <option value="3">${dict.quizDur3}</option>
    `;
  }

  // 5. Symptom quiz main concern dropdown
  const quizIssue = document.getElementById("quizMainIssue");
  if (quizIssue) {
    quizIssue.innerHTML = `
      <option value="${dict.optPrematureEjaculation}">${dict.optPrematureEjaculation}</option>
      <option value="${dict.optErectileDysfunction}">${dict.optErectileDysfunction}</option>
      <option value="${dict.optMasturbationWeakness}">${dict.optMasturbationWeakness}</option>
      <option value="${dict.optSizeConcerns}">${dict.optSizeConcerns}</option>
      <option value="${dict.optAllInOne}">${dict.optAllInOne}</option>
    `;
  }
}

window.setLanguage = function(lang) {
  initLanguage(lang);
};

/* ==========================================================================
   WHATSAPP & CALL INTEGRATION
   ========================================================================== */
function generateWhatsAppUrl(customText) {
  const encoded = encodeURIComponent(customText);
  return `https://wa.me/${HERBO_PHONE_INTL}?text=${encoded}`;
}

function updateWhatsAppLinks() {
  let defaultMsg = "";
  if (currentLanguage === "kn") {
    defaultMsg = "ನಮಸ್ಕಾರ ಹರ್ಬೋ ಇಂಡಿಯಾ, ನನಗೆ ಪುರುಷರ ಲೈಂಗಿಕ ಸಮಸ್ಯೆಗೆ 100% ಆಯುರ್ವೇದ ಚಿಕಿತ್ಸೆಯ (ಮಾತ್ರೆ + ಕ್ರೀಮ್ ಕಾಂಬೋ) ಬಗ್ಗೆ ವಿಚಾರಣೆ ಮಾಡಬೇಕಾಗಿದೆ. ದಯವಿಟ್ಟು ಸಂಪೂರ್ಣ ಗೌಪ್ಯವಾಗಿ ಮಾಹಿತಿ ನೀಡಿ.";
  } else if (currentLanguage === "hi") {
    defaultMsg = "नमस्ते हर्बो इंडिया, मुझे पुरुषों की समस्या हेतु आयुर्वेदिक दवा (गोली + विगर क्रीम कॉम्बो) के बारे में पूछताछ करनी है। कृपया पूरी गोपनीयता के साथ विवरण दें।";
  } else {
    defaultMsg = "Hello Herbo India, I would like to enquire about the Ayurvedic Vitality Combo (Pills + Vigor Cream). Please provide discreet consultation and pricing details.";
  }

  const url = generateWhatsAppUrl(defaultMsg);

  const waBtnHeader = document.getElementById("headerWaBtn");
  if (waBtnHeader) waBtnHeader.href = url;

  const heroWaBtn = document.getElementById("heroWaBtn");
  if (heroWaBtn) heroWaBtn.href = url;

  const floatWaBtn = document.getElementById("floatWaBtn");
  if (floatWaBtn) floatWaBtn.href = url;
}

/* ==========================================================================
   INTERACTIVE PROBLEM SELECTOR
   ========================================================================== */
function setupProblemCards() {
  const cards = document.querySelectorAll(".problem-card");
  cards.forEach(card => {
    card.addEventListener("click", () => {
      cards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      selectedProblemKey = card.getAttribute("data-problem-key") || "prob1";
      updateProblemActionBar();
    });
  });
}

function updateProblemActionBar() {
  const problemNameObj = problemNames[selectedProblemKey] || problemNames.prob1;
  const curName = problemNameObj[currentLanguage] || problemNameObj.en;
  
  const titleEl = document.getElementById("selectedProblemDisplay");
  if (titleEl) {
    if (currentLanguage === "kn") {
      titleEl.innerText = `ಆಯ್ಕೆ ಮಾಡಿದ ಸಮಸ್ಯೆ: ${curName}`;
    } else if (currentLanguage === "hi") {
      titleEl.innerText = `चुनी गई समस्या: ${curName}`;
    } else {
      titleEl.innerText = `Selected Condition: ${curName}`;
    }
  }

  let problemMsg = "";
  if (currentLanguage === "kn") {
    problemMsg = `ನಮಸ್ಕಾರ ಹರ್ಬೋ ಇಂಡಿಯಾ ವೈದ್ಯರೇ, ನನಗೆ "${curName}" ಸಮಸ್ಯೆ ಇದೆ. ಇದಕ್ಕೆ ಶಾಶ್ವತ ಆಯುರ್ವೇದ ಪರಿಹಾರ ಮತ್ತು ಔಷಧಿಯ (ಮಾತ್ರೆ + ಕ್ರೀಮ್) ವಿವರಗಳನ್ನು ಗೌಪ್ಯವಾಗಿ ತಿಳಿಸಿ.`;
  } else if (currentLanguage === "hi") {
    problemMsg = `नमस्ते हर्बो इंडिया डॉक्टर, मुझे "${curName}" की समस्या है। कृपया इसके स्थायी आयुर्वेदिक इलाज और कॉम्बो पैक की गोपनीय जानकारी दें।`;
  } else {
    problemMsg = `Hello Doctor, I am suffering from "${curName}". Please provide full confidential Ayurvedic solution and delivery details for Herbo India Combo.`;
  }

  const probWaBtn = document.getElementById("problemWaBtn");
  if (probWaBtn) {
    probWaBtn.href = generateWhatsAppUrl(problemMsg);
  }
}

/* ==========================================================================
   INTERACTIVE SYMPTOM QUIZ / COURSE ESTIMATOR
   ========================================================================== */
function setupQuizEstimator() {
  const form = document.getElementById("symptomQuizForm");
  const resultBox = document.getElementById("quizResultBox");
  if (!form || !resultBox) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const ageVal = parseInt(document.getElementById("quizAge").value || "1");
    const durVal = parseInt(document.getElementById("quizDuration").value || "1");
    const chosenIssue = document.getElementById("quizMainIssue").value;

    let planDays = 30;
    if (durVal === 3 || ageVal >= 3) {
      planDays = 60;
    } else {
      planDays = 30;
    }

    let planTitle = "";
    let planDesc = "";
    let ctaText = "";
    let planBadge = "";

    if (currentLanguage === "kn") {
      planBadge = `${planDays} ದಿನಗಳ ಶಿಫಾರಸು ಮಾಡಲಾದ ಆಯುರ್ವೇದ ಪ್ಲಾನ್`;
      planTitle = planDays === 60 
        ? "೬೦ ದಿನಗಳ ಪರಿಪೂರ್ಣ ನವಚೈತನ್ಯ ಕೋರ್ಸ್ (Deep Rejuvenation Pack)" 
        : "೩೦ ದಿನಗಳ ಶಾಶ್ವತ ಪರಿಹಾರ ಕೋರ್ಸ್ (Starter Vitality Pack)";
      planDesc = planDays === 60 
        ? `ನಿಮ್ಮ ಸಮಸ್ಯೆ (${chosenIssue}) ದೀರ್ಘಕಾಲದಿಂದ ಇರುವುದರಿಂದ ನರಗಳು ಮತ್ತು ರಕ್ತನಾಳಗಳ ಆಳವಾದ ದುರಸ್ತಿಗೆ 60 ದಿನಗಳ ಕೋರ್ಸ್ ಅತ್ಯುತ್ತಮವಾಗಿದೆ. ಮೊದಲ 15 ದಿನಗಳಲ್ಲಿ ಟೈಮಿಂಗ್ ನಿಯಂತ್ರಣ, 30 ದಿನಗಳಲ್ಲಿ ಗಡಸುತನ, ಮತ್ತು 60 ದಿನಗಳಲ್ಲಿ ಗಾತ್ರ ಹಾಗೂ ನರಗಳ ಸಂಪೂರ್ಣ ಪುನಶ್ಚೇತನ ದೊರೆಯುತ್ತದೆ.`
        : `ನಿಮಗೆ 30 ದಿನಗಳ ಹರ್ಬೋ ಇಂಡಿಯಾ ಮಾತ್ರೆಗಳು (60 Caps) + ವಿಗರ್ ಕ್ರೀಮ್ (50g) ಪ್ಯಾಕ್ ಸೂಕ್ತವಾಗಿದೆ. 7 ದಿನಗಳಲ್ಲಿ ಫಲಿತಾಂಶ ಪ್ರಾರಂಭವಾಗಿ 30 ದಿನಗಳಲ್ಲಿ ಸಮಸ್ಯೆ ಶಾಶ್ವತವಾಗಿ ನಿವಾರಣೆಯಾಗುತ್ತದೆ.`;
      ctaText = "ಈ ಕೋರ್ಸ್ ಅನ್ನು ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಆರ್ಡರ್ ಮಾಡಿ";
    } else if (currentLanguage === "hi") {
      planBadge = `${planDays} दिनों का अनुशंसित आयुर्वेदिक प्लान`;
      planTitle = planDays === 60 
        ? "६० दिनों का संपूर्ण कायाकल्प कोर्स (Deep Rejuvenation Pack)" 
        : "३० दिनों का स्थायी आयुर्वेदिक कोर्स (Starter Vitality Pack)";
      planDesc = planDays === 60
        ? `आपकी समस्या (${chosenIssue}) पुरानी होने के कारण नसों की गहरी मरम्मत हेतु 60 दिनों का कोर्स सबसे उपयुक्त है। पहले 15 दिनों में टाइमिंग सुधार, 30 दिनों में पूर्ण कड़ापन, और 60 दिनों में नसों का पुनर्जीवन।`
        : `आपके लिए 30 दिन का हर्बो इंडिया पॉवर कैप्सूल (60 कैप्सूल) + विगर क्रीम (50g) कॉम्बो सर्वोत्तम है। 7 दिनों में असर शुरू और 30 दिनों में स्थायी परिणाम।`;
      ctaText = "यह कोर्स व्हाट्सएप पर ऑर्डर करें";
    } else {
      planBadge = `${planDays}-DAY RECOMMENDED CLINICAL PLAN`;
      planTitle = planDays === 60 
        ? "60-Day Complete Rejuvenation Therapy (Deep Care)" 
        : "30-Day Guaranteed Vitality Course (Starter Care)";
      planDesc = planDays === 60
        ? `Based on chronic duration for (${chosenIssue}), a 60-day deep restorative therapy is recommended. Days 1-14 restore timing control, day 30 secures rock-hard stiffness, and day 60 solidifies full nerve & cellular girth rejuvenation.`
        : `The 30-Day Herbo India Power Pills (60 Caps) + Vigor Cream (50g) is ideal for (${chosenIssue}). Noticeable improvements occur in 5-7 days and complete permanent recovery in 30 days.`;
      ctaText = "Order This Course on WhatsApp";
    }

    const quizWaText = currentLanguage === "kn"
      ? `ನಮಸ್ಕಾರ ವೈದ್ಯರೇ, ನಾನು ವೆಬ್‌ಸೈಟ್‌ನಲ್ಲಿ ಕ್ವಿಜ್ ಪೂರ್ಣಗೊಳಿಸಿದ್ದೇನೆ. ನನಗೆ "${planTitle}" (${chosenIssue}) ಪಡೆಯಲು ಸಂಪೂರ್ಣ ಗೌಪ್ಯವಾಗಿ ಮಾಹಿತಿ ತಿಳಿಸಿ.`
      : currentLanguage === "hi"
      ? `नमस्ते डॉक्टर, मैंने वेबसाइट पर क्विज चेक किया है। मुझे "${planTitle}" (${chosenIssue}) की डिलीवरी चाहिए।`
      : `Hello Doctor, I completed your health assessment for "${planTitle}" (${chosenIssue}). Please provide confidential ordering details.`;

    resultBox.innerHTML = `
      <div style="background:var(--blue-tint, #f2f4ff); border:2px solid var(--primary-blue, #4353ff); border-radius:18px; padding:26px; margin-top:24px; box-shadow:0 8px 24px rgba(67,83,255,0.08);">
        <span style="background:var(--primary-blue, #4353ff); color:#ffffff; font-size:0.8rem; font-weight:800; padding:5px 14px; border-radius:9999px; text-transform:uppercase; letter-spacing:0.5px;">
          ${planBadge}
        </span>
        <h4 style="font-size:1.35rem; color:#0f172a; margin:14px 0 8px; font-weight:800; font-family:'Plus Jakarta Sans', sans-serif;">
          ${planTitle}
        </h4>
        <p style="color:#475569; font-size:0.95rem; line-height:1.65; margin-bottom:18px;">
          ${planDesc}
        </p>
        <a href="${generateWhatsAppUrl(quizWaText)}" target="_blank" class="btn-primary-wa" style="display:inline-flex;">
          💬 ${ctaText}
        </a>
      </div>
    `;
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

/* ==========================================================================
   FAQ ACCORDION
   ========================================================================== */
function setupFaqAccordion() {
  const faqItems = document.querySelectorAll(".faq-accordion-item");
  faqItems.forEach(item => {
    const question = item.querySelector(".faq-question");
    if (question) {
      question.addEventListener("click", () => {
        const isOpen = item.classList.contains("open");
        faqItems.forEach(i => i.classList.remove("open"));
        if (!isOpen) {
          item.classList.add("open");
        }
      });
    }
  });
}

/* ==========================================================================
   ANONYMOUS DOCTOR MESSENGER
   ========================================================================== */
function setupAnonymousForm() {
  const form = document.getElementById("anonymousForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("anonName").value.trim() || "Anonymous Patient";
    const age = document.getElementById("anonAge").value.trim() || "Not specified";
    const issue = document.getElementById("anonIssue").value;
    const duration = document.getElementById("anonDuration").value.trim() || "Unspecified";
    const details = document.getElementById("anonDetails").value.trim();
    const contact = document.getElementById("anonContact").value.trim();

    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const ticketId = `HI-${randomNum}`;

    const newEnquiry = {
      id: ticketId,
      date: new Date().toISOString(),
      name: name,
      age: age,
      issue: issue,
      duration: duration,
      details: details,
      contact: contact || "Not Provided (Confidential)",
      status: "New",
      language: currentLanguage
    };

    // 1. LocalStorage Persistence
    try {
      const existing = JSON.parse(localStorage.getItem("herbo_enquiries") || "[]");
      existing.unshift(newEnquiry);
      localStorage.setItem("herbo_enquiries", JSON.stringify(existing));
    } catch (err) {
      console.warn("Storage warning:", err);
    }

    // 2. Server API Persistence
    try {
      await fetch(API_BASE + "/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEnquiry)
      });
    } catch (err) {}

    // 3. Reveal Ticket ID
    form.style.display = "none";
    const alertBox = document.getElementById("anonSuccessBox");
    const ticketSpan = document.getElementById("anonTicketNumber");
    const chatBtn = document.getElementById("anonChatTicketBtn");

    if (ticketSpan) ticketSpan.innerText = ticketId;

    let waText = "";
    if (currentLanguage === "kn") {
      waText = `ನಮಸ್ಕಾರ ಹರ್ಬೋ ಇಂಡಿಯಾ ವೈದ್ಯರೇ, ನಾನು ವೆಬ್‌ಸೈಟ್‌ನಲ್ಲಿ ಅನಾಮಧೇಯ ಸಮಾಲೋಚನೆ ಸಲ್ಲಿಸಿದ್ದೇನೆ. ನನ್ನ ಟಿಕೆಟ್ ಸಂಖ್ಯೆ: ${ticketId}. ಸಮಸ್ಯೆ: ${issue}. ದಯವಿಟ್ಟು ಗೌಪ್ಯವಾಗಿ ಪರಿಶೀಲಿಸಿ.`;
    } else if (currentLanguage === "hi") {
      waText = `नमस्ते डॉक्टर, मैंने वेबसाइट पर गुमनाम परामर्श दर्ज किया है। मेरी टिकट संख्या: ${ticketId} है। समस्या: ${issue}। कृपया आगे बात करें।`;
    } else {
      waText = `Hello Doctor, I submitted an anonymous consultation on Herbo India. My Ticket ID is ${ticketId} regarding ${issue}. Please review my case.`;
    }

    if (chatBtn) chatBtn.href = generateWhatsAppUrl(waText);
    if (alertBox) alertBox.style.display = "block";
  });
}

/* ==========================================================================
   ORDER MODAL
   ========================================================================== */
function setupOrderModal() {
  const modal = document.getElementById("orderModal");
  const openBtns = document.querySelectorAll(".trigger-order-modal");
  const closeBtn = document.getElementById("closeOrderModal");
  const form = document.getElementById("orderForm");

  openBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (modal) modal.classList.add("open");
    });
  });

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => modal.classList.remove("open"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("open");
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("orderName").value.trim();
      const phone = document.getElementById("orderPhone").value.trim();
      const address = document.getElementById("orderAddress").value.trim();
      const problem = document.getElementById("orderProblem").value;
      const productCategory = document.getElementById("orderProduct") ? document.getElementById("orderProduct").value : "combo";

      const productDescriptions = {
        combo: {
          en: "Herbo India 3-in-1 Complete Combo (Tablets + Oil + Cream)",
          kn: "ಹರ್ಬೋ ಇಂಡಿಯಾ 3-ಇನ್-1 ಸೂಪರ್ ಕಾಂಬೋ (ಮಾತ್ರೆ + ಆಯಿಲ್ + ಕ್ರೀಮ್)",
          hi: "हर्बो इंडिया 3-इन-1 सुपर कॉम्बो (कैप्सूल + तेल + क्रीम)"
        },
        tablets: {
          en: "Herbo India Vitality Tablets (60 Veg Capsules)",
          kn: "ಹರ್ಬೋ ಇಂಡಿಯಾ ಪವರ್ ಮಾತ್ರೆಗಳು (60 Caps)",
          hi: "हर्बो इंडिया पॉवर कैप्सूल (60 कैप्सूल)"
        },
        oil: {
          en: "Herbo India Vigor Massage Oil (50ml Dropper)",
          kn: "ಹರ್ಬೋ ಇಂಡಿಯಾ ವಿಗರ್ ಆಯಿಲ್ (50ml)",
          hi: "हर्बो इंडिया विगर मसाज ऑयल (50ml)"
        },
        cream: {
          en: "Herbo India Vigor Massage Cream (50g Non-Sticky)",
          kn: "ಹರ್ಬೋ ಇಂಡಿಯಾ ವಿಗರ್ ಕ್ರೀಮ್ (50g)",
          hi: "हर्बो इंडिया विगर क्रीम (50g)"
        }
      };

      const selectedProductObj = productDescriptions[productCategory] || productDescriptions.combo;
      const chosenProduct = selectedProductObj[currentLanguage] || selectedProductObj.en;

      let orderText = "";
      if (currentLanguage === "kn") {
        orderText = `*ಹರ್ಬೋ ಇಂಡಿಯಾ - ಹೊಸ ಆಯುರ್ವೇದ ಆರ್ಡರ್ (COD)*\n` +
          `• ಹೆಸರು: ${name}\n` +
          `• ಮೊಬೈಲ್: ${phone}\n` +
          `• ಆಯ್ದ ಉತ್ಪನ್ನ: ${chosenProduct}\n` +
          `• ಮುಖ್ಯ ಸಮಸ್ಯೆ: ${problem}\n` +
          `• ವಿಳಾಸ: ${address}\n` +
          `• ಡೆಲಿವರಿ: 100% ಗೌಪ್ಯ ಸುರಕ್ಷಿತ ಪ್ಯಾಕಿಂಗ್ (ಕ್ಯಾಶ್ ಆನ್ ಡೆಲಿವರಿ)`;
      } else if (currentLanguage === "hi") {
        orderText = `*हर्बो इंडिया - नया आयुर्वेदिक ऑर्डर (Cash on Delivery)*\n` +
          `• नाम: ${name}\n` +
          `• मोबाइल: ${phone}\n` +
          `• चुना गया उत्पाद: ${chosenProduct}\n` +
          `• समस्या: ${problem}\n` +
          `• पूरा पता: ${address}\n` +
          `• डिलीवरी: 100% गुप्त और सीक्रेट पार्सल (COD)`;
      } else {
        orderText = `*HERBO INDIA - NEW COD ORDER*\n` +
          `• Name: ${name}\n` +
          `• Mobile: ${phone}\n` +
          `• Product: ${chosenProduct}\n` +
          `• Primary Issue: ${problem}\n` +
          `• Delivery Address: ${address}\n` +
          `• Packaging: 100% Tamper-Proof Discreet Packaging (COD)`;
      }

      // Persist customer COD order in MongoDB backend
      const orderPayload = {
        id: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
        date: new Date().toISOString(),
        type: "COD_ORDER",
        name: name,
        contact: phone,
        address: address,
        issue: `${chosenProduct} (${problem})`,
        details: `Customer Order: ${chosenProduct}\nDelivery Address: ${address}\nSelected Concern: ${problem}\nPayment Method: Cash on Delivery (COD)`,
        status: "New",
        language: currentLanguage
      };

      // Local storage backup
      try {
        const stored = JSON.parse(localStorage.getItem("herbo_enquiries") || "[]");
        stored.unshift(orderPayload);
        localStorage.setItem("herbo_enquiries", JSON.stringify(stored));
      } catch (e) {}

      // Server API dispatch
      try {
        fetch(API_BASE + "/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderPayload)
        }).catch(() => {});
      } catch (e) {}

      window.open(generateWhatsAppUrl(orderText), "_blank");
      if (modal) modal.classList.remove("open");
    });
  }
}

/* ==========================================================================
   DYNAMIC PRODUCT CATALOG & SHOWCASE (FILTERING & ACTIONS)
   ========================================================================== */

// 1. Dynamic Product Filtering by Category
window.filterProducts = function(category) {
  // Update active state on filter buttons
  const buttons = document.querySelectorAll(".product-filter-bar .filter-tab-btn");
  buttons.forEach(btn => {
    if (btn.getAttribute("data-filter") === category) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Filter product cards with smooth transition
  const cards = document.querySelectorAll(".products-grid .product-card-item");
  cards.forEach(card => {
    const cardCat = card.getAttribute("data-category");
    if (category === "all" || cardCat === category) {
      card.style.display = "flex";
      card.style.opacity = "0";
      card.style.transform = "translateY(8px)";
      setTimeout(() => {
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
        card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      }, 20);
    } else {
      card.style.display = "none";
    }
  });
};

// 2. Direct WhatsApp Product Ordering with Localized Pre-fill (Focused on Use & Goodness)
window.orderProductWhatsApp = function(productName) {
  let text = "";
  if (currentLanguage === "kn") {
    text = `*ಹರ್ಬೋ ಇಂಡಿಯಾ - ಆಯುರ್ವೇದ ಉತ್ಪನ್ನ ವಿಚಾರಣೆ & ಆರ್ಡರ್*\n` +
      `• ಉತ್ಪನ್ನ: ${productName}\n` +
      `• ಪ್ಯಾಕಿಂಗ್: 100% ಗೌಪ್ಯ ರಹಸ್ಯ ವಾಟರ್‌ಪ್ರೂಫ್ ಪ್ಯಾಕಿಂಗ್ (ಉಚಿತ ಹೋಮ್ ಡೆಲಿವರಿ)\n\n` +
      `ನಮಸ್ಕಾರ, ನನಗೆ ಈ ಉತ್ಪನ್ನದ ಬಳಕೆ ಮತ್ತು ಆರ್ಡರ್ ಮಾಡುವ ಬಗ್ಗೆ ವೈದ್ಯರೊಂದಿಗೆ ಸಮಾಲೋಚನೆ ನಡೆಸಲು ಸಹಾಯ ಮಾಡಿ.`;
  } else if (currentLanguage === "hi") {
    text = `*हर्बो इंडिया - आयुर्वेदिक उत्पाद पूछताछ व ऑर्डर*\n` +
      `• उत्पाद: ${productName}\n` +
      `• पैकेजिंग: 100% गुप्त व सुरक्षित सीलबंद पार्सल (फ्री होम डिलीवरी)\n\n` +
      `नमस्ते डॉक्टर, मुझे इस उत्पाद के उपयोग और कैश ऑन डिलीवरी ऑर्डर के संबंध में परामर्श चाहिए।`;
  } else {
    text = `*HERBO INDIA - AYURVEDIC PRODUCT ENQUIRY & COD ORDER*\n` +
      `• Product: ${productName}\n` +
      `• Packaging: 100% Tamper-Proof Discreet Packaging (Free Doorstep Delivery)\n\n` +
      `Hello Doctor, I would like consultation and assistance to order this Ayurvedic formulation via Cash on Delivery (COD).`;
  }

  window.open(generateWhatsAppUrl(text), "_blank");
};

// 3. Open Modal with Selected Product Pre-selected
window.openOrderModalWithProduct = function(category) {
  const modal = document.getElementById("orderModal");
  const productSelect = document.getElementById("orderProduct");
  if (productSelect && category) {
    productSelect.value = category;
  }
  if (modal) modal.classList.add("open");
};

/* ==========================================================================
   LIVE ORDER NOTIFICATION TICKER
   ========================================================================== */
function startLiveOrderTicker() {
  const cities = ["Bengaluru", "Mysuru", "Hubballi", "Belagavi", "Mangaluru", "Dharwad", "Shivamogga", "Tumakuru", "Delhi NCR", "Mumbai"];
  const ticker = document.createElement("div");
  ticker.id = "liveOrderTicker";
  ticker.className = "live-ticker-popup";
  document.body.appendChild(ticker);

  function showNext() {
    const city = cities[Math.floor(Math.random() * cities.length)];
    const mins = Math.floor(4 + Math.random() * 25);
    
    let text = "";
    if (currentLanguage === "kn") {
      text = `📦 <strong>${city}</strong> ಗ್ರಾಹಕರು ಹರ್ಬೋ ಇಂಡಿಯಾ ಕಾಂಬೋ ಆರ್ಡರ್ ಮಾಡಿದ್ದಾರೆ (${mins} ನಿಮಿಷಗಳ ಹಿಂದೆ)`;
    } else if (currentLanguage === "hi") {
      text = `📦 <strong>${city}</strong> के ग्राहक ने हर्बो इंडिया कॉम्बो ऑर्डर किया (${mins} मिनट पहले)`;
    } else {
      text = `📦 Someone from <strong>${city}</strong> just ordered Herbo India Combo (${mins} mins ago)`;
    }

    ticker.innerHTML = `
      <div class="ticker-inner">
        <span>${text}</span>
        <button class="ticker-close" onclick="this.parentElement.parentElement.classList.remove('show')">&times;</button>
      </div>
    `;
    ticker.classList.add("show");

    setTimeout(() => {
      ticker.classList.remove("show");
    }, 5500);
  }

  setTimeout(showNext, 4000);
  setInterval(showNext, 24000);
}

/* ==========================================================================
   DYNAMIC HEADER SCROLL & SCROLLSPY NAVIGATION
   ========================================================================== */
function setupHeaderScrollAndScrollspy() {
  const header = document.getElementById("siteHeader");
  const navLinks = document.querySelectorAll(".nav-menu .nav-link, .mobile-nav-links .mobile-nav-link");
  const sectionIds = ["home", "problems", "products", "formula", "timeline", "privacy", "anonymous"];
  const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

  // 1. Dynamic Header Scroll Shrink & Glassmorphic Elevation
  function handleScroll() {
    const scrollPos = window.scrollY || window.pageYOffset;
    if (header) {
      if (scrollPos > 25) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    }

    // 2. Active Section ScrollSpy
    const offset = (header ? header.offsetHeight : 70) + 60;
    let currentActiveId = "";

    for (let i = sections.length - 1; i >= 0; i--) {
      const sec = sections[i];
      const rect = sec.getBoundingClientRect();
      if (rect.top <= offset) {
        currentActiveId = sec.getAttribute("id");
        break;
      }
    }

    if (!currentActiveId && scrollPos < 200) {
      currentActiveId = "home";
    }

    if (currentActiveId) {
      navLinks.forEach(link => {
        const href = link.getAttribute("href");
        if (href === `#${currentActiveId}`) {
          link.classList.add("active");
        } else if (href && href.startsWith("#")) {
          link.classList.remove("active");
        }
      });
    }
  }

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();

  // 3. Smooth scrolling with header offset on anchor clicks
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function(e) {
      const targetId = this.getAttribute("href");
      if (!targetId || targetId === "#") return;
      const targetElem = document.querySelector(targetId);
      if (targetElem) {
        e.preventDefault();
        const headerH = header ? header.offsetHeight + 10 : 70;
        const targetPos = targetElem.getBoundingClientRect().top + window.pageYOffset - headerH;
        window.scrollTo({
          top: targetPos,
          behavior: "smooth"
        });

        // Instant active feedback
        navLinks.forEach(l => {
          if (l.getAttribute("href") === targetId) {
            l.classList.add("active");
          } else if (l.getAttribute("href")?.startsWith("#")) {
            l.classList.remove("active");
          }
        });
      }
    });
  });
}

/* ==========================================================================
   DYNAMIC MOBILE DRAWER NAVIGATION
   ========================================================================== */
function setupMobileDrawer() {
  const menuBtn = document.getElementById("mobileMenuBtn");
  const drawer = document.getElementById("mobileDrawer");
  const backdrop = document.getElementById("drawerBackdrop");
  const closeBtn = document.getElementById("mobileDrawerClose");

  if (!menuBtn || !drawer || !backdrop) return;

  function openDrawer() {
    drawer.classList.add("open");
    backdrop.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    drawer.classList.remove("open");
    backdrop.classList.remove("show");
    document.body.style.overflow = "";
  }

  menuBtn.addEventListener("click", openDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);

  // Close drawer on any drawer link click
  drawer.querySelectorAll(".mobile-nav-link, .btn-primary-wa").forEach(link => {
    link.addEventListener("click", () => {
      closeDrawer();
    });
  });

  // Close drawer on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("open")) {
      closeDrawer();
    }
  });
}
