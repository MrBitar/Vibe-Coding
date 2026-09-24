console.log("Jarvis UI loaded");

const log = document.getElementById("log");
const inputForm = document.getElementById("inputForm");
const textInput = document.getElementById("textInput");
const micBtn = document.getElementById("micBtn");
const core = document.getElementById("core");
const coreStatus = document.getElementById("coreStatus");
const statusBadge = document.getElementById("statusBadge");

function addMessage(who, text) {
    const div = document.createElement("div");
    div.className = `msg ${who}`;
    const label = document.createElement("span");
    label.className = "who";
    label.textContent = who === "user" ? "YOU" : "JARVIS";
    div.appendChild(label);
    div.appendChild(document.createTextNode(text));
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

function setState(state, label) {
    core.className = "core" + (state ? ` ${state}` : "");
    coreStatus.textContent = label;
    statusBadge.className = "status-badge" + (state ? ` ${state}` : "");
    statusBadge.textContent = label;
}

function speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setState("speaking", "SPEAKING");
    utterance.onend = () => setState("", "STANDING BY");
    window.speechSynthesis.speak(utterance);
}

async function sendText(message) {
    addMessage("user", message);
    setState("thinking", "THINKING");
    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
        });
        const data = await res.json();
        addMessage("jarvis", data.reply);
        speak(data.reply);
    } catch (err) {
        addMessage("jarvis", "I couldn't reach my backend just now.");
        setState("", "STANDING BY");
        console.error(err);
    }
}

inputForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = textInput.value.trim();
    if (!text) return;
    textInput.value = "";
    sendText(text);
});

// --- Voice input: capture mic audio, encode as 16kHz mono WAV, POST to /api/voice ---

let audioContext = null;
let mediaStream = null;
let sourceNode = null;
let processorNode = null;
let recordedChunks = [];
let isRecording = false;

function mergeBuffers(chunks) {
    const length = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Float32Array(length);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result;
}

function downsampleBuffer(buffer, inputRate, outputRate) {
    if (outputRate === inputRate) return buffer;
    const ratio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < newLength) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
        let accum = 0;
        let count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
        }
        result[offsetResult] = count > 0 ? accum / count : 0;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result;
}

function encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    function writeString(offset, str) {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    }

    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Blob([view], { type: "audio/wav" });
}

async function startRecording() {
    if (isRecording) return;
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        addMessage("jarvis", "I need microphone access to listen.");
        return;
    }

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    sourceNode = audioContext.createMediaStreamSource(mediaStream);
    processorNode = audioContext.createScriptProcessor(4096, 1, 1);
    recordedChunks = [];

    sourceNode.connect(processorNode);
    processorNode.connect(audioContext.destination);
    processorNode.onaudioprocess = (e) => {
        recordedChunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };

    isRecording = true;
    micBtn.classList.add("recording");
    setState("listening", "LISTENING");
}

async function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    micBtn.classList.remove("recording");

    processorNode.disconnect();
    sourceNode.disconnect();
    mediaStream.getTracks().forEach((track) => track.stop());

    const inputRate = audioContext.sampleRate;
    const merged = mergeBuffers(recordedChunks);
    await audioContext.close();

    if (merged.length === 0) {
        setState("", "STANDING BY");
        return;
    }

    const downsampled = downsampleBuffer(merged, inputRate, 16000);
    const wavBlob = encodeWAV(downsampled, 16000);

    setState("thinking", "THINKING");
    const formData = new FormData();
    formData.append("audio", wavBlob, "speech.wav");

    try {
        const res = await fetch("/api/voice", { method: "POST", body: formData });
        const data = await res.json();
        if (data.transcript) {
            addMessage("user", data.transcript);
        } else {
            addMessage("jarvis", "I didn't catch that.");
        }
        addMessage("jarvis", data.reply);
        speak(data.reply);
    } catch (err) {
        addMessage("jarvis", "I couldn't reach my backend just now.");
        setState("", "STANDING BY");
        console.error(err);
    }
}

micBtn.addEventListener("mousedown", startRecording);
micBtn.addEventListener("touchstart", (e) => { e.preventDefault(); startRecording(); });
micBtn.addEventListener("mouseup", stopRecording);
micBtn.addEventListener("mouseleave", () => { if (isRecording) stopRecording(); });
micBtn.addEventListener("touchend", (e) => { e.preventDefault(); stopRecording(); });

addMessage("jarvis", "Hello, Sir. Jarvis online. Type or hold the mic button to talk.");
