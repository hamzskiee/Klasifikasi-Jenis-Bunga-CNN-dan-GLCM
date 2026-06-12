lucide.createIcons();

// Active Navbar Link & Scroll Reveal
const sections = document.querySelectorAll("section");
const navItems = document.querySelectorAll(".nav-link-item");
const mobileNavItems = document.querySelectorAll(
  ".mobile-link:not(.bg-slate-900)",
);

window.addEventListener("scroll", () => {
  let current = "";
  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    if (pageYOffset >= sectionTop - 200) {
      current = section.getAttribute("id");
    }
  });
  navItems.forEach((item) => {
    item.classList.remove("active");
    if (item.getAttribute("href") === `#${current}`)
      item.classList.add("active");
  });
  mobileNavItems.forEach((item) => {
    item.classList.remove("text-slate-900", "bg-slate-50");
    item.classList.add("text-slate-600");
    if (item.getAttribute("href") === `#${current}`) {
      item.classList.remove("text-slate-600");
      item.classList.add("text-slate-900", "bg-slate-50");
    }
  });
});

window.addEventListener("DOMContentLoaded", () => {
  const revealElements = document.querySelectorAll(".reveal");
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          observer.unobserve(entry.target);
        }
      });
    },
    { root: null, threshold: 0.1, rootMargin: "0px 0px -30px 0px" },
  );
  revealElements.forEach((el) => revealObserver.observe(el));
});

window.addEventListener("DOMContentLoaded", () => {
  const bar = document.getElementById("hero-confidence-bar");
  const text = document.getElementById("hero-confidence-text");
  const targetValue = 98.5;
  let hasAnimated = false;
  if (bar && text) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          hasAnimated = true;
          setTimeout(() => {
            bar.style.width = targetValue + "%";
            let startValue = 0;
            const counter = setInterval(() => {
              startValue += targetValue / (2000 / 20);
              if (startValue >= targetValue) {
                text.innerText = targetValue + "%";
                clearInterval(counter);
              } else {
                text.innerText = startValue.toFixed(1) + "%";
              }
            }, 20);
          }, 300);
          observer.unobserve(bar);
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(bar);
  }
});

// Mobile Menu
document
  .getElementById("mobile-menu-btn")
  .addEventListener("click", () => {
    document.getElementById("mobile-menu").classList.toggle("hidden");
  });

// --- Logika Upload & Integrasi APP.PY ---
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const stepUpload = document.getElementById("step-upload");
const stepAnalyzing = document.getElementById("step-analyzing");
const stepResult = document.getElementById("step-result");
const previewScan = document.getElementById("preview-image-scan");
const previewResult = document.getElementById("preview-image-result");
const btnReset = document.getElementById("btn-reset");

let probChartInstance = null;
let predictionHistory = [];

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("border-blue-500", "bg-blue-50");
});
dropZone.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dropZone.classList.remove("border-blue-500", "bg-blue-50");
});
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("border-blue-500", "bg-blue-50");
  if (e.dataTransfer.files.length) {
    fileInput.files = e.dataTransfer.files;
    handleFile(e.dataTransfer.files[0]);
  }
});
fileInput.addEventListener("change", function () {
  if (this.files.length) handleFile(this.files[0]);
});

function handleFile(file) {
  if (!file.type.startsWith("image/")) {
    alert("Mohon unggah file gambar (JPG, PNG).");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    previewScan.src = e.target.result;
    previewResult.src = e.target.result;
    stepUpload.classList.add("hidden");
    stepAnalyzing.classList.remove("hidden");
    sendToFlaskBackend(file);
  };
  reader.readAsDataURL(file);
}

function sendToFlaskBackend(imageFile) {
  const formData = new FormData();
  formData.append("file", imageFile);

  fetch("/predict", { method: "POST", body: formData })
    .then((response) => response.json())
    .then((data) => {
      console.log("[DEBUG] Response dari Flask:", data);
      showResult(data);
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Gagal memproses gambar. Pastikan server Flask berjalan.");
      resetUI();
    });
}

// ========================================
// Fungsi Animasi: Counter Angka (smooth ease-out)
// ========================================
function animateCounter(element, target, suffix, duration, decimals) {
  const start = 0;
  const startTime = performance.now();
  decimals = decimals || 0;
  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Smooth ease-out quad — tidak ada overshoot, sangat halus
    const eased = 1 - (1 - progress) * (1 - progress);
    const currentVal = start + (target - start) * eased;
    element.innerText = currentVal.toFixed(decimals) + (suffix || "");
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.innerText = target.toFixed(decimals) + (suffix || "");
    }
  }
  requestAnimationFrame(step);
}

// ========================================
// Fungsi Animasi: Progress Bar (smooth)
// ========================================
function animateProgressBar(element, targetPercent, duration) {
  const startTime = performance.now();
  const startWidth = 0;
  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Smooth ease-out — tanpa overshoot
    const eased = 1 - (1 - progress) * (1 - progress);
    const currentWidth =
      startWidth + (targetPercent - startWidth) * eased;
    element.style.width = currentWidth + "%";
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.style.width = targetPercent + "%";
    }
  }
  element.style.width = "0%";
  requestAnimationFrame(step);
}

// ========================================
// Fungsi Animasi: Fade & Slide In (smooth)
// ========================================
function animateRevealElement(el, delay) {
  if (!el) return;
  el.style.opacity = "0";
  el.style.transform = "translateY(24px)";
  el.style.transition = `all 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
  setTimeout(() => {
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
  }, delay || 0);
}

// ========================================
// showResult — Animasi Smooth Bertahap
// ========================================
function showResult(data) {
  stepAnalyzing.classList.add("hidden");
  stepResult.classList.remove("hidden");
  stepResult.classList.add("flex");

  const name = data.class_name || "Unknown";
  const acc = data.confidence ? data.confidence.toFixed(2) : "0.00";
  const accNum = data.confidence || 0;

  // --- RESET semua animasi ---
  const resultNameEl = document.getElementById("result-name");
  resultNameEl.style.opacity = "0";
  resultNameEl.style.transform = "scale(0.9)";
  document.querySelectorAll(".glcm-value").forEach((el) => {
    el.dataset.target = el.innerText;
    el.innerText = "0.0000";
  });

  // === 1. NAMA BUNGA (delay 200ms) — scale in lembut ===
  setTimeout(() => {
    resultNameEl.style.transition =
      "all 900ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    resultNameEl.style.opacity = "1";
    resultNameEl.style.transform = "scale(1)";
    resultNameEl.innerText = name;
  }, 200);

  // === 2. CONFIDENCE BAR + COUNTER (delay 600ms) ===
  setTimeout(() => {
    animateProgressBar(
      document.getElementById("result-accuracy-bar"),
      accNum,
      1500,
    );
    animateCounter(
      document.getElementById("result-accuracy-text"),
      accNum,
      "%",
      1500,
      2,
    );
  }, 600);

  // === 3. GLCM VALUES COUNTER (delay 1000ms, stagger lembut) ===
  if (data.glcm) {
    setTimeout(() => {
      const glcmFields = [
        { id: "glcm-contrast", val: parseFloat(data.glcm.contrast) },
        {
          id: "glcm-correlation",
          val: parseFloat(data.glcm.correlation),
        },
        { id: "glcm-energy", val: parseFloat(data.glcm.energy) },
        {
          id: "glcm-homogeneity",
          val: parseFloat(data.glcm.homogeneity),
        },
        {
          id: "glcm-dissimilarity",
          val: parseFloat(data.glcm.dissimilarity),
        },
        { id: "glcm-asm", val: parseFloat(data.glcm.asm) },
      ];
      glcmFields.forEach((field, idx) => {
        setTimeout(() => {
          animateCounter(
            document.getElementById(field.id),
            field.val,
            "",
            1000,
            4,
          );
        }, idx * 180);
      });
    }, 1000);
  }

  // === 4. PREPROCESSING PIPELINE (delay 700ms) ===
  const origImg = document.getElementById("preview-original-card");
  const grayImg = document.getElementById("preview-grayscale-card");
  if (data.original_image && data.grayscale_image) {
    setTimeout(() => {
      origImg.src = data.original_image;
      grayImg.src = data.grayscale_image;
      origImg.onerror = function () {
        this.alt = "Gagal memuat gambar";
      };
      grayImg.onerror = function () {
        this.alt = "Gagal memuat gambar";
      };
    }, 700);
  }

  // === 5. PIPELINE CARDS REVEAL (delay 600ms) ===
  setTimeout(() => {
    document.querySelectorAll(".pipeline-card").forEach((el, i) => {
      animateRevealElement(el, i * 200);
    });
  }, 600);

  // === 6. CHART (delay 1300ms) & HISTORY (delay 1500ms) ===
  if (data.labels && data.probabilities) {
    setTimeout(() => {
      renderChart(data.labels, data.probabilities);
    }, 1300);
  }
  setTimeout(() => {
    addHistory(name, acc);
  }, 1500);
}

function renderChart(labels, dataArray) {
  const ctx = document.getElementById("probChart").getContext("2d");
  if (probChartInstance) probChartInstance.destroy();
  probChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Probabilitas (%)",
          data: dataArray,
          backgroundColor: "rgba(59, 130, 246, 0.7)",
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, max: 100 } },
    },
  });
}

function addHistory(name, acc) {
  const now = new Date();
  const timeStr =
    now.getHours().toString().padStart(2, "0") +
    ":" +
    now.getMinutes().toString().padStart(2, "0");
  predictionHistory.unshift({ time: timeStr, name: name, acc: acc });
  const tbody = document.getElementById("history-tbody");
  tbody.innerHTML = "";
  predictionHistory.forEach((item) => {
    tbody.innerHTML += `
            <tr class="border-b border-slate-200 last:border-0 hover:bg-white transition-colors">
                <td class="py-3 text-slate-500 font-mono text-xs">${item.time}</td>
                <td class="py-3 font-semibold text-slate-800">${item.name}</td>
                <td class="py-3 text-right"><span class="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-md">${item.acc}%</span></td>
            </tr>`;
  });
}

function resetUI() {
  fileInput.value = "";
  stepResult.classList.add("hidden");
  stepResult.classList.remove("flex");
  stepAnalyzing.classList.add("hidden");
  stepUpload.classList.remove("hidden");
}

btnReset.addEventListener("click", resetUI);