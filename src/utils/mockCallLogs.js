// Placeholder call-log data — used ONLY as a fallback when the real
// /api/recordings call fails (e.g. no backend running locally, expired
// session), so the Reports UI has something to click through — including a
// real, downloadable/playable audio clip — while testing without a live
// backend. Never shown when the API genuinely returns zero calls for a real
// account; that's a legitimate empty state, not an error.

const AGENTS = ['Sushil', 'My Agent', 'Support Agent'];

const MOCK_TRANSCRIPTS = [
  [
    { speaker: 'caller', text: 'Hi, I wanted to check on my recent order.' },
    { speaker: 'agent', text: 'Sure — could you share your order ID?' },
    { speaker: 'caller', text: "It's ORD-48213." },
    { speaker: 'agent', text: "That order shipped yesterday and should arrive within 2 days." },
  ],
  [
    { speaker: 'caller', text: 'Do you have same-day delivery?' },
    { speaker: 'agent', text: 'Yes, for orders placed before 2 PM in select cities.' },
  ],
  [
    { speaker: 'caller', text: 'I need to reschedule my appointment.' },
    { speaker: 'agent', text: 'No problem — what day works better for you?' },
    { speaker: 'caller', text: 'Next Tuesday afternoon.' },
    { speaker: 'agent', text: "You're booked for Tuesday, 3 PM. Anything else?" },
  ],
];

const MOCK_SUMMARIES = [
  {
    sentiment: 'positive',
    gist: 'Caller checked on an order status and was satisfied with the shipping update.',
    intent: 'Order status inquiry',
    outcome: 'Resolved — shipping ETA provided',
    topics: ['order status', 'shipping'],
    actionItems: [],
  },
  {
    sentiment: 'neutral',
    gist: 'Caller asked about same-day delivery availability.',
    intent: 'Delivery options inquiry',
    outcome: 'Resolved — policy explained',
    topics: ['delivery', 'policy'],
    actionItems: [],
  },
  {
    sentiment: 'positive',
    gist: 'Caller rescheduled an appointment to the following week.',
    intent: 'Reschedule appointment',
    outcome: 'Resolved — new slot booked',
    topics: ['scheduling'],
    actionItems: ['Send calendar confirmation'],
  },
];

// Deterministic pseudo-random (seeded by index) so the mock list doesn't
// jitter between renders/dev reloads.
const rand = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// A short, self-contained beep tone encoded as a WAV data URI — generated
// once and reused across every mock row so playback/download always works
// with zero network dependency (no external audio host, no backend).
let _toneDataUri = null;
const buildToneDataUri = () => {
  if (_toneDataUri) return _toneDataUri;
  const sampleRate = 8000;
  const durationSec = 3;
  const freq = 440;
  const numSamples = durationSec * sampleRate;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeString = (offset, s) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);  // PCM
  view.setUint16(22, 1, true);  // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.sin(Math.PI * (i / numSamples)); // fade in/out
    const sample = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
    view.setInt16(44 + i * 2, sample * 32767, true);
  }
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  _toneDataUri = `data:audio/wav;base64,${btoa(binary)}`;
  return _toneDataUri;
};

export const buildMockCallRecordings = (count = 15) => {
  const audioUrl = buildToneDataUri();
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(Date.now() - (i * 9 + Math.floor(rand(i) * 6)) * 3600 * 1000);
    const hasTranscript = rand(i * 5) > 0.2;
    const hasRecording = rand(i * 8) > 0.15;
    const inbound = i % 3 !== 0;
    const from = inbound ? `9${100000000 + Math.floor(rand(i * 13) * 899999999)}` : '918037683048';
    const to   = inbound ? '918037683048' : `9${100000000 + Math.floor(rand(i * 17) * 899999999)}`;
    return {
      callId: `mock-call-${i}`,
      from,
      to,
      direction: inbound ? 'inbound' : 'outbound-api',
      startTime: start.toISOString(),
      duration: 5 + Math.floor(rand(i * 11) * 300),
      agentName: AGENTS[i % AGENTS.length],
      hasTranscript,
      audioUrl: hasRecording ? audioUrl : null,
      audioFilename: `demo-recording-${i + 1}.wav`,
      audioSize: hasRecording ? 48044 : null,
      transcript: hasTranscript ? MOCK_TRANSCRIPTS[i % MOCK_TRANSCRIPTS.length] : [],
      summary: hasTranscript ? MOCK_SUMMARIES[i % MOCK_SUMMARIES.length] : null,
    };
  });
};
