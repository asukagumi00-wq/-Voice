const toast = document.getElementById("toast");

function notify(text) {
  toast.textContent = text;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 1600);
}

/* TAB MENU */
const studios = {
  mastering: document.getElementById("masteringStudio"),
  clean: document.getElementById("cleanStudio"),
  split: document.getElementById("splitStudio")
};

document.querySelectorAll(".tool-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tool-tab").forEach((item) => {
      item.classList.toggle("active", item === tab);
    });

    Object.entries(studios).forEach(([name, element]) => {
      element.classList.toggle("active", name === tab.dataset.tool);
    });
  });
});

/* MASTERING PRESET */
const presets = [
  "Fire",
  "Diamond",
  "Trap",
  "Rap",
  "Pop",
  "Bass",
  "Jedag",
  "Soft",
  "Studio",
  "Lo-fi"
];

let mode = "preset";
let selectedPreset = "";

const presetsElement = document.getElementById("presets");
const masterFile = document.getElementById("masterFile");
const masterButton = document.getElementById("masterButton");

function updateMasterButton() {
  const hasFile = masterFile.files.length > 0;
  const canProcess = mode === "manual" || selectedPreset !== "";

  masterButton.disabled = !(hasFile && canProcess);
}

function renderPresets() {
  presetsElement.innerHTML = presets
    .map((preset) => {
      const active = preset === selectedPreset ? "active" : "";

      return `
        <button class="preset ${active}" data-name="${preset}">
          <strong>${preset}</strong>
        </button>
      `;
    })
    .join("");

  document.querySelectorAll(".preset").forEach((button) => {
    button.addEventListener("click", () => {
      selectedPreset = button.dataset.name;

      document.getElementById("selectedText").textContent =
        "Preset: " + selectedPreset;

      renderPresets();
      updateMasterButton();
      notify("Preset " + selectedPreset + " dipilih");
    });
  });
}

renderPresets();

/* MODE PRESET / MANUAL */
document.querySelectorAll(".mode-btn").forEach((button) => {
  button.addEventListener("click", () => {
    mode = button.dataset.mode;

    document.querySelectorAll(".mode-btn").forEach((item) => {
      item.classList.toggle("active", item === button);
    });

    document
      .getElementById("presetPanel")
      .classList.toggle("active", mode === "preset");

    document
      .getElementById("manualPanel")
      .classList.toggle("active", mode === "manual");

    updateMasterButton();
  });
});

/* AUDIO PREVIEW */
let audio = null;
let audioContext = null;
let audioSource = null;
let audioNodes = null;
let objectUrl = null;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "00:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(remainingSeconds).padStart(2, "0")
  );
}

function buildAudioGraph() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();

  audioSource = audioContext.createMediaElementSource(audio);

  const bass = audioContext.createBiquadFilter();
  bass.type = "lowshelf";
  bass.frequency.value = 105;

  const mid = audioContext.createBiquadFilter();
  mid.type = "peaking";
  mid.frequency.value = 1800;
  mid.Q.value = 1;

  const treble = audioContext.createBiquadFilter();
  treble.type = "highshelf";
  treble.frequency.value = 8500;

  const clarity = audioContext.createBiquadFilter();
  clarity.type = "peaking";
  clarity.frequency.value = 4000;
  clarity.Q.value = 0.9;

  const compressor = audioContext.createDynamicsCompressor();
  const gain = audioContext.createGain();

  audioSource
    .connect(bass)
    .connect(mid)
    .connect(treble)
    .connect(clarity)
    .connect(compressor)
    .connect(gain)
    .connect(audioContext.destination);

  audioNodes = {
    bass,
    mid,
    treble,
    clarity,
    compressor,
    gain
  };

  applyPreview();
}

function getControlValue(id) {
  return Number(document.getElementById(id).value);
}

function applyPreview() {
  if (!audioNodes || !audioContext) return;

  audioNodes.bass.gain.value = getControlValue("bass");
  audioNodes.mid.gain.value = getControlValue("mid");
  audioNodes.treble.gain.value = getControlValue("treble");
  audioNodes.clarity.gain.value = getControlValue("clarity") / 12;

  const compression = getControlValue("compression");

  audioNodes.compressor.threshold.value = -8 - compression * 0.34;
  audioNodes.compressor.ratio.value = 1 + (compression / 100) * 7;

  const outputVolume = getControlValue("volume");
  audioNodes.gain.gain.value = Math.pow(10, outputVolume / 20);
}

/* FILE MASTERING */
masterFile.addEventListener("change", () => {
  const file = masterFile.files[0];

  document.getElementById("masterFileName").textContent = file
    ? "File: " + file.name
    : "Belum ada audio dipilih";

  document.getElementById("masterFileMeta").textContent = file
    ? (file.size / 1024 / 1024).toFixed(2) + " MB · siap untuk preview dan mastering"
    : "MP3, WAV, FLAC, M4A, AAC, OGG, OPUS, AMR, WMA, AIFF, AC3, WEBM, CAF";

  updateMasterButton();

  if (!file) return;

  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
  }

  if (audio) {
    audio.pause();

    if (audioSource) {
      audioSource.disconnect();
    }

    if (audioContext) {
      audioContext.close();
    }
  }

  objectUrl = URL.createObjectURL(file);
  audio = new Audio(objectUrl);
  audio.volume = Number(document.getElementById("previewVolume").value);

  buildAudioGraph();

  document.getElementById("player").classList.add("show");

  audio.addEventListener("loadedmetadata", () => {
    document.getElementById("time").textContent =
      "00:00 / " + formatTime(audio.duration);

    document.getElementById("seek").max = audio.duration;
  });

  audio.addEventListener("timeupdate", () => {
    document.getElementById("seek").value = audio.currentTime;

    document.getElementById("time").textContent =
      formatTime(audio.currentTime) + " / " + formatTime(audio.duration);
  });

  audio.addEventListener("ended", () => {
    document.getElementById("playButton").textContent = "▶";
  });
});

/* PLAY / PAUSE */
document.getElementById("playButton").addEventListener("click", async () => {
  if (!audio) return;

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  if (audio.paused) {
    await audio.play();
    document.getElementById("playButton").textContent = "Ⅱ";
  } else {
    audio.pause();
    document.getElementById("playButton").textContent = "▶";
  }
});

/* SEEK */
document.getElementById("seek").addEventListener("input", (event) => {
  if (audio) {
    audio.currentTime = Number(event.target.value);
  }
});

/* PREVIEW VOLUME */
document.getElementById("previewVolume").addEventListener("input", (event) => {
  if (audio) {
    audio.volume = Number(event.target.value);
  }
});

/* SLIDER MASTERING */
const controls = [
  ["bass", "bassOut", " dB"],
  ["mid", "midOut", " dB"],
  ["treble", "trebleOut", " dB"],
  ["compression", "compressionOut", "%"],
  ["clarity", "clarityOut", "%"],
  ["reverb", "reverbOut", "%"],
  ["loudness", "loudnessOut", " LUFS"],
  ["peak", "peakOut", " dB"],
  ["manualWidth", "manualWidthOut", "%"],
  ["intensity", "intensityOutput", "%"],
  ["volume", "volumeOutput", " dB"],
  ["fade", "fadeOutput", " ms"]
];

function isSignedControl(id) {
  return ["bass", "mid", "treble"].includes(id);
}

controls.forEach(([inputId, outputId, suffix]) => {
  const input = document.getElementById(inputId);
  const output = document.getElementById(outputId);

  input.addEventListener("input", (event) => {
    const value = Number(event.target.value);

    output.textContent =
      (isSignedControl(inputId) && value > 0 ? "+" : "") +
      value +
      suffix;

    applyPreview();
  });
});

/* RESET PREVIEW */
document.getElementById("resetPreview").addEventListener("click", () => {
  const defaults = {
    bass: 0,
    mid: 0,
    treble: 0,
    compression: 35,
    clarity: 20,
    reverb: 0,
    loudness: -14,
    peak: -1.2,
    manualWidth: 100,
    intensity: 100,
    volume: 0,
    fade: 0
  };

  Object.entries(defaults).forEach(([id, value]) => {
    const input = document.getElementById(id);
    input.value = value;
    input.dispatchEvent(new Event("input"));
  });

  notify("Preview direset");
});

/* FILE CLEAN VOICE DAN SPLIT AUDIO */
function bindUpload(inputId, filenameId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);

  input.addEventListener("change", () => {
    const file = input.files[0];

    document.getElementById(filenameId).textContent = file
      ? "File: " + file.name
      : "Belum ada audio dipilih";

    button.disabled = !file;
  });
}

bindUpload("cleanFile", "cleanFileName", "cleanButton");
bindUpload("splitFile", "splitFileName", "splitButton");

/* CLEAN VOICE MODE */
document.querySelectorAll("[data-clean]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-clean]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });

    document.getElementById("cleanStrengthText").textContent =
      button.querySelector("strong").textContent;
  });
});

document.getElementById("noise").addEventListener("input", (event) => {
  document.getElementById("noiseOut").textContent = event.target.value + "%";
});

document.getElementById("voiceClarity").addEventListener("input", (event) => {
  document.getElementById("voiceClarityOut").textContent =
    event.target.value + "%";
});

/* SPLIT AUDIO MODE */
document.querySelectorAll("[data-split]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-split]").forEach((item) => {
      item.classList.toggle("active", item === button);
    });

    document.getElementById("splitChoiceText").textContent =
      button.querySelector("strong").textContent;
  });
});

/* TOMBOL DEMO */
masterButton.addEventListener("click", () => {
  masterButton.textContent = "Siap dikirim ke backend";
  masterButton.disabled = true;
});

document.getElementById("cleanButton").addEventListener("click", (event) => {
  event.target.textContent = "Siap dikirim ke backend";
  event.target.disabled = true;
});

document.getElementById("splitButton").addEventListener("click", (event) => {
  event.target.textContent = "Siap dikirim ke backend";
  event.target.disabled = true;
});
