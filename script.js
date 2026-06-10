lucide.createIcons();

const toggle = document.getElementById("themeToggle");
const body = document.body;

if (localStorage.getItem("theme") === "light") {
    body.classList.add("light");
}

toggle.addEventListener("click", () => {
    body.classList.toggle("light");
    localStorage.setItem("theme", body.classList.contains("light") ? "light" : "dark");
});

const text = [
    "Developer from Bengaluru",
    "Good Listener 👂",
    "Professional Page Reader 📖",
    "Future Legend 🚀"
];

const typing = document.getElementById("typing");
let index = 0;
let charIndex = 0;
let isDeleting = false;

function typeEffect() {
    const current = text[index];

    if (!isDeleting) {
        typing.textContent = current.substring(0, charIndex + 1);
        charIndex++;

        if (charIndex === current.length) {
            isDeleting = true;
            setTimeout(typeEffect, 1400);
            return;
        }
    } else {
        typing.textContent = current.substring(0, charIndex - 1);
        charIndex--;

        if (charIndex === 0) {
            isDeleting = false;
            index = (index + 1) % text.length;
        }
    }

    setTimeout(typeEffect, isDeleting ? 55 : 95);
}

typeEffect();

const sections = document.querySelectorAll(".project-card, .skill-category, .stat-card, .glass-card");

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
        }
    });
}, {
    threshold: 0.12
});

sections.forEach(el => {
    el.style.opacity = "0";
    el.style.transform = "translateY(22px)";
    el.style.transition = "opacity 0.7s ease, transform 0.7s ease";
    observer.observe(el);
});