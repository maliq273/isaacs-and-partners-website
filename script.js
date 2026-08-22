"use strict";

/*=====================================================
 DOM LOADED
======================================================*/

document.addEventListener("DOMContentLoaded", () => {

    initialiseWebsite();

});

/*=====================================================
 INITIALISE WEBSITE
======================================================*/

function initialiseWebsite(){

    initialisePreloader();

    initialiseNavigation();

    initialiseSmoothScroll();

    initialiseBackToTop();

    initialiseCurrentYear();

}

/*=====================================================
 PRELOADER
======================================================*/

function initialisePreloader(){

    const preloader = document.getElementById("preloader");

    if(!preloader) return;

    window.addEventListener("load", ()=>{

        setTimeout(()=>{

            preloader.style.opacity="0";

            preloader.style.visibility="hidden";

            preloader.style.pointerEvents="none";

        },700);

    });

}

/*=====================================================
 NAVIGATION
======================================================*/

function initialiseNavigation(){

    const header=document.querySelector("header");

    window.addEventListener("scroll",()=>{

        if(window.scrollY>80){

            header.classList.add("scrolled");

        }else{

            header.classList.remove("scrolled");

        }

    });

}

/*=====================================================
 MOBILE / TABLET MENU
======================================================*/

const hamburger = document.getElementById("mobile-menu-toggle");
const mobileNavigation = document.getElementById("mobile-navigation");
const mobileMenuOverlay = document.getElementById("mobile-menu-overlay");
const mobileMenuClose = document.getElementById("mobile-menu-close");

function openMobileMenu(){

    if(!mobileNavigation || !mobileMenuOverlay) return;

    mobileNavigation.classList.add("active");
    mobileMenuOverlay.classList.add("active");
    mobileNavigation.setAttribute("aria-hidden", "false");
    mobileMenuOverlay.setAttribute("aria-hidden", "false");

    if(hamburger){
        hamburger.classList.add("active");
        hamburger.setAttribute("aria-expanded","true");
    }

    document.body.classList.add("mobile-menu-open");
}


function closeMobileMenu(){

    document.body.classList.remove("mobile-menu-open");

    if(mobileNavigation){

        if(mobileNavigation.contains(document.activeElement)){
            document.activeElement.blur();
        }

        mobileNavigation.classList.remove("active");

        mobileNavigation.setAttribute(
            "aria-hidden",
            "true"
        );

    }

    if(mobileMenuOverlay){

        mobileMenuOverlay.classList.remove("active");

        mobileMenuOverlay.setAttribute(
            "aria-hidden",
            "true"
        );

    }

    if(hamburger){

        hamburger.classList.remove("active");

        hamburger.setAttribute(
            "aria-expanded",
            "false"
        );

        hamburger.setAttribute(
            "aria-label",
            "Open navigation menu"
        );

        /*
         * Do not restore focus if the menu wasn't actually open.
         */
        if(document.activeElement !== hamburger){

            hamburger.focus({
                preventScroll:true
            });

        }

    }

}

if(hamburger){

    hamburger.addEventListener("click",()=>{

        if(
            mobileNavigation &&
            mobileNavigation.classList.contains("active")
        ){

            closeMobileMenu();

        }else{

            openMobileMenu();

        }

    });

}

if(mobileMenuClose){

    mobileMenuClose.addEventListener(
        "click",
        closeMobileMenu
    );

}

if(mobileMenuOverlay){

    mobileMenuOverlay.addEventListener(
        "click",
        closeMobileMenu
    );

}

/* Close menu when a mobile navigation link is selected */

document
.querySelectorAll(".mobile-navigation a")
.forEach(link=>{

    link.addEventListener("click",()=>{

        closeMobileMenu();

    });

});

/* Close with ESC */

document.addEventListener("keydown",(event)=>{

    if(event.key === "Escape"){

        closeMobileMenu();

    }

});

/*=====================================================
 SMOOTH SCROLL
======================================================*/

function initialiseSmoothScroll(){

    const links=document.querySelectorAll('a[href^="#"]');

    links.forEach(link=>{

        link.addEventListener("click",(e)=>{

            const target=document.querySelector(

                link.getAttribute("href")

            );

            if(!target) return;

            e.preventDefault();

            target.scrollIntoView({

                behavior:"smooth",

                block:"start"

            });

        });

    });

}

/*=====================================================
 BACK TO TOP
======================================================*/

function initialiseBackToTop(){

    const button=document.getElementById("backToTop");

    if(!button) return;

    window.addEventListener("scroll",()=>{

        if(window.scrollY>500){

            button.style.display="flex";

        }else{

            button.style.display="none";

        }

    });

    button.addEventListener("click",()=>{

        window.scrollTo({

            top:0,

            behavior:"smooth"

        });

    });

}

/*=====================================================
 CURRENT YEAR
======================================================*/

function initialiseCurrentYear(){

    const year=document.getElementById("year");

    if(year){

        year.textContent=new Date().getFullYear();

    }

}

/*=====================================================
 BUTTON RIPPLE EFFECT
======================================================*/

document.querySelectorAll(".gold-btn").forEach(button=>{

    button.addEventListener("mousemove",(e)=>{

        const rect=button.getBoundingClientRect();

        const x=e.clientX-rect.left;

        const y=e.clientY-rect.top;

        button.style.setProperty("--x",x+"px");

        button.style.setProperty("--y",y+"px");

    });

});

/*=====================================================
 HERO PARALLAX
======================================================*/

window.addEventListener("mousemove",(e)=>{

    const hero=document.querySelector(".hero-card");

    if(!hero) return;

    const x=(window.innerWidth/2-e.clientX)/40;

    const y=(window.innerHeight/2-e.clientY)/40;

    hero.style.transform=

    `rotateY(${x}deg) rotateX(${y}deg)`;

});

window.addEventListener("mouseleave",()=>{

    const hero=document.querySelector(".hero-card");

    if(hero){

        hero.style.transform="rotateX(0deg) rotateY(0deg)";

    }

});

/*=====================================================
 NAV LINK ACTIVE STATE
======================================================*/

const sections=document.querySelectorAll("section");

const menuLinks=document.querySelectorAll(".nav-links a");

window.addEventListener("scroll",()=>{

    let current="";

    sections.forEach(section=>{

        const top=section.offsetTop-120;

        const height=section.clientHeight;

        if(window.scrollY>=top){

            current=section.getAttribute("id");

        }

    });

    menuLinks.forEach(link=>{

        link.classList.remove("active");

        if(

            link.getAttribute("href")==="#"+current

        ){

            link.classList.add("active");

        }

    });

});

/*=====================================================
 SIMPLE CONSOLE BRANDING
======================================================*/

console.clear();

console.log(

"%c ISAACS & PARTNERS ",

"background:#C9A227;color:#111;padding:10px;font-size:18px;font-weight:bold;"

);

console.log(

"%c Premium Website Initialised",

"color:#C9A227;font-size:14px;"

);
/*=====================================================
 SCROLL REVEAL ANIMATIONS
======================================================*/

function initialiseScrollReveal() {

    const revealItems = document.querySelectorAll(
        ".fade-up,.fade-left,.fade-right,.zoom-in"
    );

    if (!revealItems.length) return;

    const observer = new IntersectionObserver((entries) => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {

                entry.target.classList.add("active");

            }

        });

    }, {

        threshold: 0.15

    });

    revealItems.forEach(item => {

        observer.observe(item);

    });

}

initialiseScrollReveal();

/*=====================================================
 STATISTICS COUNTER
======================================================*/

function initialiseCounters() {

    const counters = document.querySelectorAll("[data-count]");

    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {

        entries.forEach(entry => {

            if (!entry.isIntersecting) return;

            const counter = entry.target;

            const target = Number(counter.dataset.count);

            let current = 0;

            const increment = Math.ceil(target / 80);

            const timer = setInterval(() => {

                current += increment;

                if (current >= target) {

                    counter.textContent = target + "+";

                    clearInterval(timer);

                } else {

                    counter.textContent = current;

                }

            }, 20);

            observer.unobserve(counter);

        });

    }, {

        threshold: 0.5

    });

    counters.forEach(counter => {

        observer.observe(counter);

    });

}

initialiseCounters();

/*=====================================================
 HERO FLOATING GLOW
======================================================*/

const hero = document.querySelector("#hero");

if (hero) {

    hero.addEventListener("mousemove", e => {

        const glow = hero.querySelector(".hero-overlay");

        if (!glow) return;

        const x = e.clientX / window.innerWidth * 100;

        const y = e.clientY / window.innerHeight * 100;

        glow.style.background = `

radial-gradient(circle at ${x}% ${y}%,

rgba(201,162,39,.18),

transparent 40%)

`;

    });

}

/*=====================================================
 SERVICE CARD HOVER EFFECT
======================================================*/

document.querySelectorAll(".service-card").forEach(card => {

    card.addEventListener("mousemove", e => {

        const rect = card.getBoundingClientRect();

        const x = e.clientX - rect.left;

        const y = e.clientY - rect.top;

        card.style.background = `

radial-gradient(circle at ${x}px ${y}px,

rgba(201,162,39,.14),

#121212)

`;

    });

    card.addEventListener("mouseleave", () => {

        card.style.background = "";

    });

});

/*=====================================================
 CONTACT CARD EFFECT
======================================================*/

document.querySelectorAll(".contact-card").forEach(card => {

    card.addEventListener("mouseenter", () => {

        card.style.transform = "translateY(-10px) scale(1.03)";

    });

    card.addEventListener("mouseleave", () => {

        card.style.transform = "";

    });

});
/*=====================================================
 PARTICLE ENGINE
======================================================*/

const particleContainer = document.getElementById("particles");

if (particleContainer) {

    for (let i = 0; i < 35; i++) {

        const particle = document.createElement("span");

        particle.className = "particle";

        particle.style.left = Math.random() * 100 + "%";

        particle.style.top = Math.random() * 100 + "%";

        particle.style.width = (Math.random() * 6 + 2) + "px";

        particle.style.height = particle.style.width;

        particle.style.animationDuration =

            (Math.random() * 12 + 8) + "s";

        particle.style.animationDelay =

            Math.random() * 5 + "s";

        particleContainer.appendChild(particle);

    }

}

/*=====================================================
 SCROLL PROGRESS BAR
======================================================*/

const progress = document.createElement("div");

progress.id = "scrollProgress";

document.body.appendChild(progress);

window.addEventListener("scroll", () => {

    const scroll =

        document.documentElement.scrollTop;

    const height =

        document.documentElement.scrollHeight -

        document.documentElement.clientHeight;

    progress.style.width =

        (scroll / height) * 100 + "%";

});

/*=====================================================
 NAVBAR SHADOW
======================================================*/

window.addEventListener("scroll", () => {

    const header = document.querySelector("header");

    if (!header) return;

    if (window.scrollY > 50) {

        header.style.boxShadow =

        "0 10px 30px rgba(0,0,0,.35)";

    }

    else {

        header.style.boxShadow = "none";

    }

});

/*=====================================================
 HERO FADE
======================================================*/

window.addEventListener("scroll", () => {

    const hero = document.querySelector("#hero");

    if (!hero) return;

    const scroll = window.scrollY;

    hero.style.opacity =

        Math.max(1 - scroll / 900, .35);

});

/*=====================================================
 PERFORMANCE
======================================================*/

let ticking = false;

window.addEventListener("scroll", () => {

    if (!ticking) {

        window.requestAnimationFrame(() => {

            ticking = false;

        });

        ticking = true;

    }

});

/*=====================================================
 PAGE READY
======================================================*/

console.log(

"%cAnimations Loaded",

"color:#C9A227;font-size:15px;font-weight:bold;"

);

/*=====================================================
 WEB3FORMS SUBMISSION
======================================================*/

const consultationForm = document.getElementById("consultationForm");

if (consultationForm) {
    consultationForm.addEventListener("submit", submitConsultation);
}

async function submitConsultation(e) {

    e.preventDefault();

    const form = e.target;

    const button = form.querySelector(".submit-btn");

    const originalText = button.innerHTML;

    button.disabled = true;
    button.innerHTML = "Sending...";

    const formData = new FormData(form);
     for (const [key, value] of formData.entries()) {
       console.log(key, "=", value);
}

    formData.append(
        "access_key",
        "d1d5b67c-10df-46ee-bb92-2eea199503d5"
    );

    formData.append(
        "from_name",
        "Isaacs & Partners Website"
    );

    try {

        const response = await fetch(
            "https://api.web3forms.com/submit",
            {
                method: "POST",
                body: formData
            }
        );

        const data = await response.json();

        if (response.ok) {

            showNotification(
                "Thank you! Your consultation request has been submitted successfully.",
                "success"
            );

            form.reset();

        } else {

            showNotification(
                data.message || "Submission failed.",
                "error"
            );

        }

    } catch (error) {

        console.error(error);

        showNotification(
            "Unable to connect. Please try again.",
            "error"
        );

    }

    button.disabled = false;
    button.innerHTML = originalText;

}

/*=====================================================
 FAKE API DELAY
======================================================*/

function fakeDelay(ms){

    return new Promise(resolve=>{

        setTimeout(resolve,ms);

    });

}

/*=====================================================
 FILE VALIDATION
======================================================*/

document

.querySelectorAll("input[type=file]")

.forEach(file=>{

file.addEventListener("change",()=>{

const max=10*1024*1024;

for(let f of file.files){

if(f.size>max){

alert(

f.name+

" exceeds the 10MB upload limit."

);

file.value="";

return;

}

}

});

});

/*=====================================================
 EMAIL VALIDATION
======================================================*/

document

.querySelectorAll("input[type=email]")

.forEach(input=>{

input.addEventListener("blur",()=>{

const email=input.value.trim();

const regex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if(email!=="" && !regex.test(email)){

input.style.borderColor="red";

}else{

input.style.borderColor="#2b2b2b";

}

});

});

/*=====================================================
 PHONE VALIDATION
======================================================*/

document

.querySelectorAll("input[type=tel]")

.forEach(input=>{

input.addEventListener("input",()=>{

input.value=input.value.replace(

/[^0-9+ ]/g,

""

);

});

});

/*=====================================================
 NOTIFICATIONS
======================================================*/

function showNotification(message,type){

let box=document.createElement("div");

box.className="notification "+type;

box.innerHTML=message;

document.body.appendChild(box);

setTimeout(()=>{

box.classList.add("show");

},100);

setTimeout(()=>{

box.classList.remove("show");

setTimeout(()=>{

box.remove();

},500);

},4000);

}

/*=====================================================
 ACCESSIBILITY
======================================================*/

document

.querySelectorAll("button,a")

.forEach(item=>{

item.addEventListener("keyup",(e)=>{

if(e.key==="Enter"){

item.click();

}

});

});

/*=====================================================
 LAZY LOAD IMAGES
======================================================*/

const lazyImages=document.querySelectorAll("img");

const imageObserver=new IntersectionObserver(entries=>{

entries.forEach(entry=>{

if(entry.isIntersecting){

const img=entry.target;

if(img.dataset.src){

img.src=img.dataset.src;

}

imageObserver.unobserve(img);

}

});

});

lazyImages.forEach(img=>{

imageObserver.observe(img);

});

/*=====================================================
 CONSOLE INFO
======================================================*/

console.log(

"%cIsaacs & Partners Premium Website",

"color:#D4AF37;font-size:18px;font-weight:bold;"

);

console.log(

"%cWebsite Ready",

"color:#4ade80;font-size:14px;"

);

/*=====================================================
 AUTHENTICATION / ACCESS BUTTONS
======================================================*/

function initialiseAuthButtons(){

    const authButtons = document.querySelectorAll(
        "[data-auth-action]"
    );

    if(!authButtons.length) return;

    authButtons.forEach(button => {

        button.addEventListener("click", function(event){

            const action = this.dataset.authAction;

            /*
             * Allow normal anchor navigation for real destinations.
             * We only close the mobile menu before navigation.
             */

            if(typeof closeMobileMenu === "function"){
                closeMobileMenu();
            }

            switch(action){

                case "signup":

                    /*
                     * Book Consultation
                     * Keep the user on the consultation section.
                     */

                    const consultation =
                        document.getElementById("consultation");

                    if(consultation){

                        event.preventDefault();

                        consultation.scrollIntoView({
                            behavior:"smooth",
                            block:"start"
                        });

                    }

                    break;


                case "signin":

                    /*
                     * Customer sign in
                     */

                    window.location.href = "/login.html";

                    break;


                case "client-portal":

                    /*
                     * Client portal
                     */

                    window.location.href = "/client-portal.html";

                    break;


                case "company-admin":

                    /*
                     * Company administrator
                     */

                    window.location.href =
                        "/company-admin-login.html";

                    break;

            }

        });

    });

}


/* Initialise authentication buttons */

initialiseAuthButtons();

/*=====================================================
 FUTURE MODULES PLACEHOLDERS
======================================================*/

const WebsiteModules={

aiConsultation:false,

bookingPortal:false,

matterTracking:false,

clientPortal:false,

supabase:false,

zoho:false,

web3forms:false,

whatsappBot:false,

onlinePayments:false

};

console.table(WebsiteModules);

/*=====================================================
 END
======================================================*/
