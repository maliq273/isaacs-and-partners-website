"use strict";

/* =====================================================
   ISAACS & PARTNERS — WEBSITE RUNTIME
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {
    initialiseWebsite();
    initialiseRegistrationGateway();
    initialiseAuthButtons();
    initialiseScrollReveal();
    initialiseCounters();
    initialiseParticles();
    initialiseFormValidation();
    initialiseLazyImages();
});

function initialiseWebsite() {
    initialisePreloader();
    initialiseNavigation();
    initialiseMobileMenu();
    initialiseSmoothScroll();
    initialiseBackToTop();
    initialiseCurrentYear();
    initialiseRippleEffects();
    initialiseHeroParallax();
    initialiseActiveNavigation();
    initialiseCardEffects();
    initialiseScrollProgress();
    initialiseHeroFade();
}

/* =====================================================
   PRELOADER
   ===================================================== */

function initialisePreloader() {
    const preloader = document.getElementById("preloader");
    if (!preloader) return;

    window.addEventListener("load", () => {
        setTimeout(() => {
            preloader.style.opacity = "0";
            preloader.style.visibility = "hidden";
            preloader.style.pointerEvents = "none";
        }, 700);
    });
}

/* =====================================================
   NAVIGATION
   ===================================================== */

function initialiseNavigation() {
    const header = document.querySelector("header");
    if (!header) return;

    window.addEventListener("scroll", () => {
        header.classList.toggle("scrolled", window.scrollY > 80);
        header.style.boxShadow = window.scrollY > 50
            ? "0 10px 30px rgba(0,0,0,.35)"
            : "none";
    });
}

/* =====================================================
   MOBILE MENU
   ===================================================== */

function initialiseMobileMenu() {
    const hamburger = document.getElementById("mobile-menu-toggle");
    const navigation = document.getElementById("mobile-navigation");
    const overlay = document.getElementById("mobile-menu-overlay");
    const closeButton = document.getElementById("mobile-menu-close");

    function closeMenu() {
        document.body.classList.remove("mobile-menu-open");
        navigation?.classList.remove("active");
        overlay?.classList.remove("active");
        navigation?.setAttribute("aria-hidden", "true");
        overlay?.setAttribute("aria-hidden", "true");
        hamburger?.classList.remove("active");
        hamburger?.setAttribute("aria-expanded", "false");
        hamburger?.setAttribute("aria-label", "Open navigation menu");
    }

    function openMenu() {
        if (!navigation || !overlay) return;
        document.body.classList.add("mobile-menu-open");
        navigation.classList.add("active");
        overlay.classList.add("active");
        navigation.setAttribute("aria-hidden", "false");
        overlay.setAttribute("aria-hidden", "false");
        hamburger?.classList.add("active");
        hamburger?.setAttribute("aria-expanded", "true");
    }

    hamburger?.addEventListener("click", () => {
        navigation?.classList.contains("active") ? closeMenu() : openMenu();
    });

    closeButton?.addEventListener("click", closeMenu);
    overlay?.addEventListener("click", closeMenu);

    document.querySelectorAll(".mobile-navigation a").forEach(link => {
        link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 1024) closeMenu();
    });
}

/* =====================================================
   SMOOTH SCROLL
   ===================================================== */

function initialiseSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener("click", event => {
            const selector = link.getAttribute("href");
            const target = selector ? document.querySelector(selector) : null;
            if (!target) return;

            event.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });
}

/* =====================================================
   BACK TO TOP
   ===================================================== */

function initialiseBackToTop() {
    const button = document.getElementById("backToTop");
    if (!button) return;

    button.style.display = "none";

    window.addEventListener("scroll", () => {
        button.style.display = window.scrollY > 500 ? "flex" : "none";
    });

    button.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

/* =====================================================
   CURRENT YEAR
   ===================================================== */

function initialiseCurrentYear() {
    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
}

/* =====================================================
   REGISTRATION GATEWAY
   Homepage Individual / Business cards now open the
   central registration page with the correct account type.
   ===================================================== */

function initialiseRegistrationGateway() {
    document.querySelectorAll(".account-type-card[data-account-type]").forEach(card => {
        card.addEventListener("click", event => {
            event.preventDefault();

            const rawType = card.dataset.accountType;
            const type = rawType === "company" || rawType === "business"
                ? "business"
                : "individual";

            window.location.assign(
                `/signup.html?type=${encodeURIComponent(type)}`
            );
        });

        card.setAttribute("role", "link");
        card.setAttribute("tabindex", "0");

        card.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                card.click();
            }
        });
    });
}

/* =====================================================
   AUTHENTICATION / ACCESS BUTTONS
   ===================================================== */

function initialiseAuthButtons() {
    document.querySelectorAll("[data-auth-action]").forEach(button => {
        button.addEventListener("click", event => {
            const action = button.dataset.authAction;

            if (action === "signup") {
                const consultation = document.getElementById("consultation");
                if (consultation && button.getAttribute("href")?.startsWith("#")) {
                    event.preventDefault();
                    consultation.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                return;
            }

            if (action === "signin") {
                event.preventDefault();
                window.location.assign("/login.html");
                return;
            }

            if (action === "client-portal") {
                event.preventDefault();
                window.location.assign("/client-portal.html");
                return;
            }

            if (action === "company-admin") {
                event.preventDefault();
                window.location.assign("/company-admin-login.html");
            }
        });
    });
}

/* =====================================================
   VISUAL EFFECTS
   ===================================================== */

function initialiseRippleEffects() {
    document.querySelectorAll(".gold-btn").forEach(button => {
        button.addEventListener("mousemove", event => {
            const rect = button.getBoundingClientRect();
            button.style.setProperty("--x", `${event.clientX - rect.left}px`);
            button.style.setProperty("--y", `${event.clientY - rect.top}px`);
        });
    });
}

function initialiseHeroParallax() {
    const heroCard = document.querySelector(".hero-card");
    if (!heroCard) return;

    window.addEventListener("mousemove", event => {
        const x = (window.innerWidth / 2 - event.clientX) / 40;
        const y = (window.innerHeight / 2 - event.clientY) / 40;
        heroCard.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
    });

    window.addEventListener("mouseleave", () => {
        heroCard.style.transform = "rotateX(0deg) rotateY(0deg)";
    });
}

function initialiseActiveNavigation() {
    const sections = document.querySelectorAll("section");
    const links = document.querySelectorAll(".nav-links a");

    window.addEventListener("scroll", () => {
        let current = "";
        sections.forEach(section => {
            if (window.scrollY >= section.offsetTop - 120) {
                current = section.id;
            }
        });

        links.forEach(link => {
            link.classList.toggle(
                "active",
                link.getAttribute("href") === `#${current}`
            );
        });
    });
}

function initialiseScrollReveal() {
    const items = document.querySelectorAll(".fade-up,.fade-left,.fade-right,.zoom-in");
    if (!items.length || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    items.forEach(item => observer.observe(item));
}

function initialiseCounters() {
    const counters = document.querySelectorAll("[data-count]");
    if (!counters.length || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            const counter = entry.target;
            const target = Number(counter.dataset.count);
            let current = 0;
            const increment = Math.max(1, Math.ceil(target / 80));

            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    counter.textContent = `${target}+`;
                    clearInterval(timer);
                } else {
                    counter.textContent = current;
                }
            }, 20);

            observer.unobserve(counter);
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

function initialiseCardEffects() {
    document.querySelectorAll(".service-card").forEach(card => {
        card.addEventListener("mousemove", event => {
            const rect = card.getBoundingClientRect();
            card.style.background = `radial-gradient(circle at ${event.clientX - rect.left}px ${event.clientY - rect.top}px, rgba(201,162,39,.14), #121212)`;
        });
        card.addEventListener("mouseleave", () => card.style.background = "");
    });

    document.querySelectorAll(".contact-card").forEach(card => {
        card.addEventListener("mouseenter", () => {
            card.style.transform = "translateY(-10px) scale(1.03)";
        });
        card.addEventListener("mouseleave", () => {
            card.style.transform = "";
        });
    });

    const hero = document.querySelector("#hero");
    hero?.addEventListener("mousemove", event => {
        const glow = hero.querySelector(".hero-overlay");
        if (!glow) return;
        const x = event.clientX / window.innerWidth * 100;
        const y = event.clientY / window.innerHeight * 100;
        glow.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(201,162,39,.18), transparent 40%)`;
    });
}

function initialiseParticles() {
    const container = document.getElementById("particles");
    if (!container) return;

    for (let i = 0; i < 35; i++) {
        const particle = document.createElement("span");
        particle.className = "particle";
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.width = `${Math.random() * 6 + 2}px`;
        particle.style.height = particle.style.width;
        particle.style.animationDuration = `${Math.random() * 12 + 8}s`;
        particle.style.animationDelay = `${Math.random() * 5}s`;
        container.appendChild(particle);
    }
}

function initialiseScrollProgress() {
    const progress = document.createElement("div");
    progress.id = "scrollProgress";
    document.body.appendChild(progress);

    window.addEventListener("scroll", () => {
        const scroll = document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        progress.style.width = height > 0 ? `${scroll / height * 100}%` : "0%";
    });
}

function initialiseHeroFade() {
    const hero = document.querySelector("#hero");
    if (!hero) return;

    window.addEventListener("scroll", () => {
        hero.style.opacity = Math.max(1 - window.scrollY / 900, 0.35);
    });
}

/* =====================================================
   WEB3FORMS CONSULTATION SUBMISSION
   ===================================================== */

const consultationForm = document.getElementById("consultationForm");

if (consultationForm) {
    consultationForm.addEventListener("submit", submitConsultation);
}

async function submitConsultation(event) {
    event.preventDefault();

    const form = event.target;
    const button = form.querySelector(".submit-btn");
    if (!button) return;

    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = "Sending...";

    const formData = new FormData(form);
    formData.append("access_key", "d1d5b67c-10df-46ee-bb92-2eea199503d5");
    formData.append("from_name", "Isaacs & Partners Website");

    try {
        const response = await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showNotification("Thank you! Your consultation request has been submitted successfully.", "success");
            form.reset();
        } else {
            showNotification(data.message || "Submission failed.", "error");
        }
    } catch (error) {
        console.error(error);
        showNotification("Unable to connect. Please try again.", "error");
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

/* =====================================================
   FORM VALIDATION
   ===================================================== */

function initialiseFormValidation() {
    document.querySelectorAll("input[type=file]").forEach(input => {
        input.addEventListener("change", () => {
            const max = 10 * 1024 * 1024;
            for (const file of input.files) {
                if (file.size > max) {
                    alert(`${file.name} exceeds the 10MB upload limit.`);
                    input.value = "";
                    return;
                }
            }
        });
    });

    document.querySelectorAll("input[type=email]").forEach(input => {
        input.addEventListener("blur", () => {
            const email = input.value.trim();
            const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            input.style.borderColor = email && !valid ? "red" : "#2b2b2b";
        });
    });

    document.querySelectorAll("input[type=tel]").forEach(input => {
        input.addEventListener("input", () => {
            input.value = input.value.replace(/[^0-9+ ]/g, "");
        });
    });
}

/* =====================================================
   NOTIFICATIONS
   ===================================================== */

function showNotification(message, type) {
    const box = document.createElement("div");
    box.className = `notification ${type}`;
    box.textContent = message;
    document.body.appendChild(box);

    setTimeout(() => box.classList.add("show"), 100);
    setTimeout(() => {
        box.classList.remove("show");
        setTimeout(() => box.remove(), 500);
    }, 4000);
}

/* =====================================================
   LAZY LOAD IMAGES
   ===================================================== */

function initialiseLazyImages() {
    const images = document.querySelectorAll("img[data-src]");
    if (!images.length || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const image = entry.target;
            image.src = image.dataset.src;
            observer.unobserve(image);
        });
    });

    images.forEach(image => observer.observe(image));
}

console.log("%c ISAACS & PARTNERS ", "background:#C9A227;color:#111;padding:10px;font-size:18px;font-weight:bold;");
console.log("%cWebsite Ready", "color:#4ade80;font-size:14px;");
