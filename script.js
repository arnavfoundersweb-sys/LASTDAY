// ==========================================================================
// SCROLL PROGRESS & ACTIVE NAVIGATION
// ==========================================================================
const scrollProgress = document.createElement("div");
scrollProgress.className = "scroll-progress";
document.body.appendChild(scrollProgress);

const sections = document.querySelectorAll("section");
const navLinks = document.querySelectorAll("nav ul li a");
const navbar = document.querySelector("nav");

window.addEventListener("scroll", () => {
  // Update scroll progress bar
  const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
  scrollProgress.style.width = scrolled + "%";

  // Navbar scrolled styling
  if (window.scrollY > 50) {
    navbar.classList.add("nav-scrolled");
  } else {
    navbar.classList.remove("nav-scrolled");
  }

  // Active navigation link tracking
  let currentSectionId = "";
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 180;
    if (window.scrollY >= sectionTop) {
      currentSectionId = section.getAttribute("id");
    }
  });

  navLinks.forEach(link => {
    link.classList.remove("active");
    if (link.getAttribute("href") === `#${currentSectionId}`) {
      link.classList.add("active");
    }
  });
});

// ==========================================================================
// PROCEDURAL FIRE SYNTHESIZER (WEB AUDIO API)
// ==========================================================================
class FireSynth {
  constructor() {
    this.audioCtx = null;
    this.isPlaying = false;
    this.rumbleNode = null;
    this.crackleTimer = null;
    this.rumbleInterval = null;
    this.masterGain = null;
  }

  init() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
    this.masterGain.connect(this.audioCtx.destination);
  }

  // Generates a pink noise buffer for realistic crackling and rumbling sound
  createPinkNoiseBuffer() {
    const bufferSize = 2 * this.audioCtx.sampleRate;
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      output[i] = pink * 0.11;
    }
    return noiseBuffer;
  }

  start() {
    if (!this.audioCtx) this.init();
    
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }

    this.isPlaying = true;

    // 1. Generate Flame Rumble (filtered low-frequency pink noise)
    const rumbleNoise = this.audioCtx.createBufferSource();
    rumbleNoise.buffer = this.createPinkNoiseBuffer();
    rumbleNoise.loop = true;

    const rumbleFilter = this.audioCtx.createBiquadFilter();
    rumbleFilter.type = "lowpass";
    rumbleFilter.frequency.setValueAtTime(110, this.audioCtx.currentTime);

    const rumbleGain = this.audioCtx.createGain();
    rumbleGain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);

    rumbleNoise.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.masterGain);
    rumbleNoise.start(0);
    this.rumbleNode = { source: rumbleNoise, gain: rumbleGain, filter: rumbleFilter };

    // Flickering low-frequency rumble modulation
    this.rumbleInterval = setInterval(() => {
      if (!this.isPlaying) return;
      const targetGain = 0.3 + Math.random() * 0.5;
      const targetFreq = 80 + Math.random() * 60;
      rumbleGain.gain.linearRampToValueAtTime(targetGain, this.audioCtx.currentTime + 0.15);
      rumbleFilter.frequency.linearRampToValueAtTime(targetFreq, this.audioCtx.currentTime + 0.15);
    }, 150);

    // 2. Generate Crackles (random short popping sound envelopes)
    const scheduleNextCrackle = () => {
      if (!this.isPlaying) return;
      this.playCrackle();
      const nextTime = 50 + Math.random() * 350; 
      this.crackleTimer = setTimeout(scheduleNextCrackle, nextTime);
    };
    
    scheduleNextCrackle();
  }

  playCrackle() {
    const crackleSource = this.audioCtx.createBufferSource();
    crackleSource.buffer = this.createPinkNoiseBuffer();
    
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1700 + Math.random() * 1500, this.audioCtx.currentTime);
    filter.Q.setValueAtTime(5.0, this.audioCtx.currentTime);

    const gain = this.audioCtx.createGain();
    const now = this.audioCtx.currentTime;
    
    const duration = 0.005 + Math.random() * 0.02;
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.06 + Math.random() * 0.12, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    crackleSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    crackleSource.start(now);
    crackleSource.stop(now + duration + 0.01);
  }

  stop() {
    this.isPlaying = false;
    clearTimeout(this.crackleTimer);
    clearInterval(this.rumbleInterval);

    if (this.rumbleNode) {
      try {
        this.rumbleNode.source.stop();
      } catch (e) {}
      this.rumbleNode = null;
    }
  }
}

// Bind sound toggle event
const soundToggle = document.getElementById("sound-toggle");
const synth = new FireSynth();

if (soundToggle) {
  soundToggle.addEventListener("click", () => {
    if (synth.isPlaying) {
      synth.stop();
      soundToggle.classList.remove("sound-on");
      soundToggle.title = "Turn Ambient Sound On";
    } else {
      synth.start();
      soundToggle.classList.add("sound-on");
      soundToggle.title = "Turn Ambient Sound Off";
    }
  });
}

// ==========================================================================
// INTERACTIVE HELLFIRE CANVAS EMBER ENGINE
// ==========================================================================
const canvas = document.getElementById("fire-canvas");
const ctx = canvas ? canvas.getContext("2d") : null;

const mouse = {
  x: null,
  y: null,
  active: false,
  radius: 120 // Mouse interaction ripple radius
};

// Sparks list captured in closure, accessible globally via function helper
let sparksArray = [];

// Expose spark generator globally to connect interaction triggers
window.spawnSparks = function(x, y, count = 20) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.0 + Math.random() * 4.0;
    sparksArray.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.2, // slight upward bias
      size: 1.5 + Math.random() * 3.5,
      life: 30 + Math.random() * 45,
      maxLife: 75
    });
  }
};

if (canvas && ctx) {
  let particlesArray = [];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  let isMouseDown = false;

  // Mouse move tracks
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;

    // Spawn subtle movement spark trail
    if (Math.random() < 0.25) {
      window.spawnSparks(mouse.x, mouse.y, 1);
    }
  });

  window.addEventListener("mouseleave", () => {
    mouse.active = false;
  });

  window.addEventListener("mousedown", (e) => {
    isMouseDown = true;
    if (e.target.tagName !== "BUTTON" && e.target.tagName !== "A" && window.spawnSparks) {
      window.spawnSparks(e.clientX, e.clientY, 15);
    }
  });

  window.addEventListener("mouseup", () => {
    isMouseDown = false;
  });

  // Ember particle representation
  class Ember {
    constructor() {
      this.reset();
      this.y = Math.random() * canvas.height; // Spread initially
    }

    reset() {
      this.x = Math.random() * canvas.width;
      this.y = canvas.height + Math.random() * 80;
      this.size = 1 + Math.random() * 3;
      
      this.speedY = 0.4 + Math.random() * 1.2;
      this.speedX = -0.4 + Math.random() * 0.8;
      
      this.maxLife = 150 + Math.random() * 180;
      this.life = this.maxLife;
      
      this.wobbleSpeed = 0.01 + Math.random() * 0.02;
      this.wobbleRange = 0.15 + Math.random() * 0.4;
      this.wobbleTime = Math.random() * 100;
    }

    update() {
      this.y -= this.speedY;
      this.wobbleTime += this.wobbleSpeed;
      this.x += Math.sin(this.wobbleTime) * this.wobbleRange + this.speedX;
      this.life--;

      // Push/Pull logic on mouse coordinates
      if (mouse.active) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance < mouse.radius) {
          const force = (mouse.radius - distance) / mouse.radius;
          const angle = Math.atan2(dy, dx);
          
          if (isMouseDown) {
            // Attract mode: pull sparks into the cursor!
            this.x -= Math.cos(angle) * force * 3.5;
            this.y -= Math.sin(angle) * force * 2.5;
          } else {
            // Repel mode: push sparks away
            this.x += Math.cos(angle) * force * 2.5;
            this.y += Math.sin(angle) * force * 1.2;
          }
        }
      }

      if (this.life <= 0 || this.y < -10 || this.x < -10 || this.x > canvas.width + 10) {
        this.reset();
      }
    }

    draw() {
      const lifeRatio = this.life / this.maxLife;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      
      let r, g, b, alpha;
      alpha = lifeRatio * 0.65;
      
      if (lifeRatio > 0.65) {
        r = 255;
        g = 200 + Math.floor(55 * ((lifeRatio - 0.65) / 0.35)); // white-gold
        b = 130;
      } else if (lifeRatio > 0.25) {
        r = 255;
        g = Math.floor(190 * ((lifeRatio - 0.25) / 0.4)); // orange
        b = 0;
      } else {
        r = Math.floor(255 * (lifeRatio / 0.25)); // decaying red
        g = 0;
        b = 0;
      }

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.fill();
    }
  }

  // Initialize embers
  const emberDensity = Math.min(90, Math.floor((canvas.width * canvas.height) / 16000));
  for (let i = 0; i < emberDensity; i++) {
    particlesArray.push(new Ember());
  }

  // Main canvas animation loop
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw rising background embers
    for (let i = 0; i < particlesArray.length; i++) {
      particlesArray[i].update();
      particlesArray[i].draw();
    }

    // 2. Draw explosive mouse sparks
    for (let i = 0; i < sparksArray.length; i++) {
      const s = sparksArray[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.04; // gravity drop
      s.life--;
      s.size *= 0.94; // slow shrink

      const lifeRatio = s.life / s.maxLife;
      
      if (lifeRatio > 0) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        
        let gVal = lifeRatio > 0.5 ? 190 + Math.floor(65 * ((lifeRatio - 0.5) / 0.5)) : Math.floor(190 * (lifeRatio / 0.5));
        ctx.fillStyle = `rgba(255, ${gVal}, 0, ${lifeRatio})`;
        ctx.fill();
      }

      if (s.life <= 0 || s.size <= 0.15) {
        sparksArray.splice(i, 1);
        i--;
      }
    }

    requestAnimationFrame(animate);
  }

  animate();
}

// ==========================================================================
// INTERACTIVE "IGNITE" BUTTON ACTIONS
// ==========================================================================
const btn = document.getElementById("btn");
if (btn) {
  btn.addEventListener("click", () => {
    btn.innerText = "Ignited 🔥";
    btn.disabled = true;

    // Retrieve button center coordinates
    const rect = btn.getBoundingClientRect();
    const btnCenterX = rect.left + rect.width / 2;
    const btnCenterY = rect.top + rect.height / 2;

    // Ignite with 35 quick sparks
    if (window.spawnSparks) {
      window.spawnSparks(btnCenterX, btnCenterY, 35);
    }

    // Let sound trigger as user interaction is registered, if user hasn't toggled yet
    if (!synth.isPlaying && soundToggle && !soundToggle.classList.contains("sound-on")) {
      synth.start();
      soundToggle.classList.add("sound-on");
      soundToggle.title = "Turn Ambient Sound Off";
    }

    setTimeout(() => {
      btn.innerText = "Ignite Contact";
      btn.disabled = false;
    }, 3000);
  });
}

// ==========================================================================
// 3D SPECULAR TILT EFFECT ON CARDS
// ==========================================================================
const cards = document.querySelectorAll(".card, .glass-card");

cards.forEach(card => {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rotateY = (x / rect.width - 0.5) * 14; 
    const rotateX = (0.5 - y / rect.height) * 14;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    
    // Dynamic specular fire lighting reflection
    const px = (x / rect.width) * 100;
    const py = (y / rect.height) * 100;
    card.style.background = `
      radial-gradient(circle at ${px}% ${py}%, rgba(255, 85, 0, 0.12) 0%, rgba(18, 18, 22, 0.85) 60%)
    `;

    // Spawn sparks periodically as the cursor glides over cards
    if (Math.random() < 0.08 && window.spawnSparks) {
      window.spawnSparks(e.clientX, e.clientY, 1);
    }
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)";
    card.style.background = "rgba(18, 18, 22, 0.7)";
  });
});

// ==========================================================================
// SKILLS LOAD-UP ANIMATION & SECTIONS REVEAL
// ==========================================================================
const skillsSection = document.getElementById("about");
const skillBars = document.querySelectorAll(".skill-progress-fill");

if (skillsSection && skillBars.length > 0) {
  const skillsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        skillBars.forEach(bar => {
          const targetWidth = bar.getAttribute("data-width") || "0%";
          bar.style.width = targetWidth;
        });
        skillsObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15
  });

  skillsObserver.observe(skillsSection);
}

// Reveal cards smoothly with custom trigger transitions
const revealElements = document.querySelectorAll(".card, .glass-card, section h2");
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
      // Spawn small spark burst at card location to "ignite" its load-up
      if (window.spawnSparks) {
        const rect = entry.target.getBoundingClientRect();
        window.spawnSparks(rect.left + rect.width / 2, rect.top + rect.height / 2, 8);
      }
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.1
});

revealElements.forEach(element => {
  element.style.opacity = "0";
  element.style.transform = "translateY(40px)";
  element.style.transition = "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)";
  revealObserver.observe(element);
});

// ==========================================================================
// MOBILE MENU SLIDE-OUT TOGGLE
// ==========================================================================
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mobileNavOverlay = document.getElementById("mobile-nav-overlay");
const mobileLinks = document.querySelectorAll(".mobile-link");

if (mobileMenuBtn && mobileNavOverlay) {
  mobileMenuBtn.addEventListener("click", () => {
    mobileMenuBtn.classList.toggle("active");
    mobileNavOverlay.classList.toggle("active");
  });

  mobileLinks.forEach(link => {
    link.addEventListener("click", () => {
      mobileMenuBtn.classList.remove("active");
      mobileNavOverlay.classList.remove("active");
    });
  });
}

// ==========================================================================
// ENTRY IGNITION OVERLAY INTERACTION
// ==========================================================================
const ignitionOverlay = document.getElementById("ignition-overlay");
const overlayIgniteBtn = document.getElementById("overlay-ignite-btn");

if (overlayIgniteBtn && ignitionOverlay) {
  overlayIgniteBtn.addEventListener("click", () => {
    // Start procedural fire audio synth on user interaction
    synth.start();
    if (soundToggle) {
      soundToggle.classList.add("sound-on");
      soundToggle.title = "Turn Ambient Sound Off";
    }

    // Explode massive burst of sparks from button coordinates
    const rect = overlayIgniteBtn.getBoundingClientRect();
    const btnCenterX = rect.left + rect.width / 2;
    const btnCenterY = rect.top + rect.height / 2;
    
    if (window.spawnSparks) {
      window.spawnSparks(btnCenterX, btnCenterY, 90);
    }

    // Fade out overlay
    ignitionOverlay.classList.add("fade-out");
  });
}