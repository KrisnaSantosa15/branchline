import { Audio, AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Caption } from "@remotion/captions";
import captionsJson from "./captions.json";

const captions = captionsJson as Caption[];
const C = {
  ink: "#07101f",
  navy: "#0b1930",
  line: "rgba(219, 240, 255, 0.18)",
  paper: "#ecf5ff",
  muted: "#9ab0c9",
  mint: "#69e6c5",
  amber: "#ffbf5b",
  coral: "#ff7272",
  blue: "#7db8ff",
};

const scene = (frame: number, start: number, end: number) => interpolate(frame, [start, start + 18, end - 18, end], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const pop = (frame: number, start: number) => interpolate(frame, [start, start + 18], [0.92, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const Eyebrow: React.FC<{ children: React.ReactNode; accent?: string }> = ({ children, accent = C.mint }) => (
  <div style={{ color: accent, fontSize: 26, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>{children}</div>
);

const Metric: React.FC<{ label: string; value: string; color: string; frame: number; start: number }> = ({ label, value, color, frame, start }) => (
  <div style={{ opacity: scene(frame, start, start + 210), scale: pop(frame, start), minWidth: 196, border: `1px solid ${C.line}`, borderTop: `4px solid ${color}`, borderRadius: 20, padding: "25px 28px", background: "rgba(9, 25, 48, 0.8)", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
    <div style={{ color: C.muted, fontSize: 21, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em" }}>{label}</div>
    <div style={{ color, fontSize: 58, lineHeight: 1.05, fontWeight: 800, marginTop: 10 }}>{value}</div>
  </div>
);

const ProductFrame: React.FC<{ file: string; frame: number; start: number; end: number; label: string; shift?: number; width?: number }> = ({ file, frame, start, end, label, shift = 0, width = 1250 }) => (
  <div style={{ opacity: scene(frame, start, end), scale: pop(frame, start), translate: `${interpolate(frame, [start, end], [shift, -shift], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px 0`, width, borderRadius: 30, overflow: "hidden", border: "1px solid rgba(222,242,255,0.32)", background: C.navy, boxShadow: "0 38px 90px rgba(0,0,0,0.46)" }}>
    <div style={{ height: 54, padding: "0 24px", display: "flex", alignItems: "center", gap: 10, background: "#152942", borderBottom: `1px solid ${C.line}` }}>
      <span style={{ width: 13, height: 13, borderRadius: 13, background: C.coral }} />
      <span style={{ width: 13, height: 13, borderRadius: 13, background: C.amber }} />
      <span style={{ width: 13, height: 13, borderRadius: 13, background: C.mint }} />
      <span style={{ marginLeft: 16, color: "#c9d7ea", fontSize: 20, fontWeight: 700 }}>{label}</span>
    </div>
    <Img src={staticFile(`screens/${file}`)} style={{ display: "block", width: "100%" }} />
  </div>
);

const CaptionBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const active = captions.find((caption) => frame * 1000 / fps >= caption.startMs && frame * 1000 / fps < caption.endMs);
  if (!active) return null;
  return <div style={{ position: "absolute", left: 180, right: 180, bottom: 72, display: "flex", justifyContent: "center" }}><div style={{ maxWidth: 1350, padding: "17px 30px", borderRadius: 18, background: "rgba(4, 12, 25, 0.86)", border: "1px solid rgba(233,245,255,0.22)", color: C.paper, fontSize: 34, fontWeight: 700, lineHeight: 1.25, textAlign: "center", boxShadow: "0 12px 32px rgba(0,0,0,0.25)" }}>{active.text}</div></div>;
};

export const BranchlineDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const intro = scene(frame, 0, 480);
  const problem = scene(frame, 390, 960);
  const impact = scene(frame, 870, 1590);
  const rehearsal = scene(frame, 1500, 2370);
  const paths = scene(frame, 2250, 3030);
  const council = scene(frame, 2910, 3780);
  const decision = scene(frame, 3660, 4380);
  const policy = scene(frame, 4260, 4830);
  const mcp = scene(frame, 4710, 5220);
  const outro = scene(frame, 5100, 5250);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 18% 9%, #1a3c60 0, transparent 29%), radial-gradient(circle at 88% 82%, #174a48 0, transparent 31%), linear-gradient(135deg, ${C.ink}, #101e37)`, color: C.paper, fontFamily: "Aptos Display, Inter, Arial, sans-serif", overflow: "hidden" }}>
      <Audio src={staticFile("narration.wav")} />
      <div style={{ position: "absolute", inset: 0, opacity: 0.22, backgroundImage: "linear-gradient(rgba(182,220,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(182,220,255,0.12) 1px, transparent 1px)", backgroundSize: "72px 72px", translate: `${-(frame % 72)}px ${-(frame % 72)}px` }} />
      <div style={{ position: "absolute", top: -180, right: -160, width: 580, height: 580, borderRadius: "50%", background: "rgba(105, 230, 197, 0.16)", filter: "blur(54px)", scale: interpolate(frame, [0, 5250], [0.9, 1.18]) }} />
      <div style={{ position: "absolute", top: 62, left: 82, display: "flex", alignItems: "center", gap: 17, zIndex: 4 }}><div style={{ width: 42, height: 42, borderRadius: 12, background: C.mint, boxShadow: "0 0 36px rgba(105,230,197,0.6)" }} /><div style={{ fontSize: 29, fontWeight: 900, letterSpacing: "0.1em" }}>BRANCHLINE</div><div style={{ color: C.muted, fontSize: 22, fontWeight: 700 }}>release rehearsal</div></div>
      <div style={{ position: "absolute", top: 72, right: 82, color: C.muted, fontSize: 21, fontWeight: 700, letterSpacing: "0.08em" }}>OPENAI BUILD WEEK · DEVELOPER TOOLS</div>

      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: intro }}>
        <div style={{ width: 1440, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <Eyebrow>Release control, before the incident</Eyebrow>
          <div style={{ fontSize: 124, lineHeight: 0.96, fontWeight: 900, letterSpacing: "-0.065em", marginTop: 34, maxWidth: 1310 }}>What if a release could <span style={{ color: C.mint }}>rehearse?</span></div>
          <div style={{ color: C.muted, fontSize: 40, lineHeight: 1.35, marginTop: 38, maxWidth: 960 }}>Real Git evidence. Deterministic impact. Human accountability.</div>
          <div style={{ marginTop: 62, display: "flex", gap: 18 }}>
            {["MAP", "REHEARSE", "DECIDE"].map((word, index) => <div key={word} style={{ opacity: interpolate(frame, [80 + index * 34, 122 + index * 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), border: `1px solid ${C.line}`, color: index === 2 ? C.ink : C.paper, background: index === 2 ? C.mint : "rgba(8,20,38,0.58)", borderRadius: 999, padding: "16px 28px", fontSize: 24, fontWeight: 900, letterSpacing: "0.12em" }}>{word}</div>)}
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: problem }}>
        <div style={{ width: 1500, display: "grid", gridTemplateColumns: "1fr 0.9fr", gap: 96, alignItems: "center" }}>
          <div><Eyebrow accent={C.coral}>The release-review blind spot</Eyebrow><div style={{ fontSize: 90, lineHeight: 1.03, fontWeight: 900, letterSpacing: "-0.055em", marginTop: 30 }}>One line can change <span style={{ color: C.coral }}>everything.</span></div><div style={{ color: C.muted, fontSize: 34, lineHeight: 1.36, marginTop: 28 }}>A contract field flips from optional to required. The code diff is small. The legacy-client risk is not.</div></div>
          <div style={{ border: "1px solid rgba(255,190,91,0.44)", borderRadius: 28, padding: 42, background: "rgba(18,33,55,0.86)", boxShadow: "0 28px 75px rgba(0,0,0,0.36)", scale: pop(frame, 390) }}><div style={{ color: C.muted, fontSize: 24, fontWeight: 800 }}>release-risk.ts</div><div style={{ marginTop: 34, fontFamily: "Cascadia Code, Consolas, monospace", fontSize: 31, lineHeight: 1.65 }}><div style={{ color: C.muted }}>interface ReleaseRisk {'{'}</div><div style={{ color: C.coral, marginLeft: 32 }}>− riskLevel?: string</div><div style={{ color: C.mint, marginLeft: 32 }}>+ riskLevel: string</div><div style={{ color: C.muted }}>{'}'}</div></div><div style={{ display: "flex", gap: 14, marginTop: 34 }}><div style={{ color: C.ink, background: C.coral, padding: "10px 16px", borderRadius: 11, fontWeight: 900 }}>CONTRACT TIGHTENING</div><div style={{ color: C.ink, background: C.amber, padding: "10px 16px", borderRadius: 11, fontWeight: 900 }}>LEGACY CLIENTS</div></div></div>
        </div>
      </div>

      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: impact }}>
        <div style={{ width: 1680, display: "flex", flexDirection: "column", alignItems: "center" }}><div style={{ alignSelf: "flex-start", marginBottom: 30 }}><Eyebrow>01 / Evidence over intuition</Eyebrow><div style={{ fontSize: 64, fontWeight: 900, letterSpacing: "-0.04em", marginTop: 14 }}>Git evidence becomes a release map.</div></div><ProductFrame file="impact.png" frame={frame} start={870} end={1590} label="Real Branchline impact map" shift={-24} width={1120} /><div style={{ position: "absolute", right: 118, top: 252, borderRadius: 18, padding: "18px 25px", color: C.ink, background: C.mint, fontSize: 25, fontWeight: 900, opacity: interpolate(frame, [1140, 1180], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>3 evidence links · 0 hand-waving</div></div>
      </div>

      <div style={{ position: "absolute", inset: 0, opacity: rehearsal }}>
        <div style={{ position: "absolute", top: 190, left: 180 }}><Eyebrow accent={C.amber}>02 / Simulate, never prophesy</Eyebrow><div style={{ fontSize: 64, fontWeight: 900, letterSpacing: "-0.04em", marginTop: 14 }}>Every release choice changes a rule-bound world.</div></div>
        <div style={{ position: "absolute", left: 158, top: 358 }}><ProductFrame file="rehearse.png" frame={frame} start={1500} end={2370} label="Real deterministic rehearsal" shift={-45} /></div>
        <div style={{ position: "absolute", right: 116, top: 760, display: "flex", gap: 16 }}><Metric label="Traffic" value="100%" color={C.coral} frame={frame} start={1710} /><Metric label="Errors" value="71%" color={C.coral} frame={frame} start={1760} /><Metric label="Confidence" value="86" color={C.mint} frame={frame} start={1810} /></div>
      </div>

      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: paths }}>
        <div style={{ width: 1510, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36, alignItems: "stretch" }}>
          <div style={{ border: "1px solid rgba(255,114,114,0.48)", borderRadius: 30, padding: 54, background: "linear-gradient(155deg, rgba(91,23,39,0.86), rgba(25,28,49,0.84))", scale: pop(frame, 2250) }}><Eyebrow accent={C.coral}>Alternate branch</Eyebrow><div style={{ fontSize: 64, fontWeight: 900, letterSpacing: "-0.05em", marginTop: 25 }}>Full rollout</div><div style={{ marginTop: 48, color: C.coral, fontSize: 97, fontWeight: 900 }}>71%</div><div style={{ fontSize: 29, color: C.muted }}>client error rehearsal outcome</div><div style={{ marginTop: 46, color: C.paper, fontSize: 32, lineHeight: 1.35 }}>All traffic sees the tightened contract before the legacy path is protected.</div></div>
          <div style={{ border: "1px solid rgba(105,230,197,0.54)", borderRadius: 30, padding: 54, background: "linear-gradient(155deg, rgba(11,75,69,0.86), rgba(20,35,57,0.84))", scale: pop(frame, 2310) }}><Eyebrow>Recommended path</Eyebrow><div style={{ fontSize: 64, fontWeight: 900, letterSpacing: "-0.05em", marginTop: 25 }}>Canary + adapter</div><div style={{ marginTop: 48, color: C.mint, fontSize: 97, fontWeight: 900 }}>observe</div><div style={{ fontSize: 29, color: C.muted }}>narrow failure path, explicit test gate</div><div style={{ marginTop: 46, color: C.paper, fontSize: 32, lineHeight: 1.35 }}>Keep legacy consumers alive. Verify the contract. Define the rollback trigger.</div></div>
        </div>
      </div>

      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: council }}>
        <div style={{ width: 1680, display: "flex", flexDirection: "column", alignItems: "center" }}><div style={{ alignSelf: "flex-start", marginBottom: 30 }}><Eyebrow>03 / Challenge the path</Eyebrow><div style={{ fontSize: 64, fontWeight: 900, letterSpacing: "-0.04em", marginTop: 14 }}>One evidence packet. Four specialist lenses.</div></div><ProductFrame file="council.png" frame={frame} start={2910} end={3780} label="Real evidence-bound Council" shift={26} width={1120} /><div style={{ position: "absolute", left: 110, bottom: 178, display: "flex", gap: 12, opacity: interpolate(frame, [3300, 3350], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>{["CONTRACT", "TEST + OBS", "ROLLOUT", "SECURITY"].map((name) => <div key={name} style={{ color: C.ink, background: C.mint, padding: "13px 16px", borderRadius: 12, fontSize: 20, fontWeight: 900 }}>{name}</div>)}</div></div>
      </div>

      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: decision }}>
        <div style={{ width: 1510, display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 58, alignItems: "center" }}><ProductFrame file="decision.png" frame={frame} start={3660} end={4380} label="Real accountable decision ledger" shift={-26} /><div><Eyebrow accent={C.amber}>Human authority stays explicit</Eyebrow><div style={{ fontSize: 76, lineHeight: 1.02, fontWeight: 900, letterSpacing: "-0.055em", marginTop: 25 }}>Agents advise.<br /><span style={{ color: C.amber }}>Humans own it.</span></div><div style={{ color: C.muted, fontSize: 32, lineHeight: 1.38, marginTop: 30 }}>Approve, block, accept risk, or request evidence—with rationale and follow-ups preserved in the release ledger.</div><div style={{ marginTop: 36, display: "inline-flex", borderRadius: 16, padding: "16px 21px", background: "rgba(255,191,91,0.14)", border: "1px solid rgba(255,191,91,0.44)", color: C.amber, fontWeight: 900, fontSize: 24 }}>ACCEPTED RISK · ACCOUNTABLE</div></div></div>
      </div>

      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: policy }}>
        <div style={{ width: 1500, display: "grid", gridTemplateColumns: "0.86fr 1.14fr", gap: 92, alignItems: "center" }}><div><Eyebrow>04 / Make the standard executable</Eyebrow><div style={{ fontSize: 80, lineHeight: 1.02, fontWeight: 900, letterSpacing: "-0.055em", marginTop: 25 }}>Turn release quality into a <span style={{ color: C.mint }}>policy gate.</span></div><div style={{ color: C.muted, fontSize: 31, lineHeight: 1.38, marginTop: 30 }}>Require test confidence, compatibility safeguards, Council coverage, and a human decision—locally or in CI.</div></div><div style={{ borderRadius: 28, overflow: "hidden", border: `1px solid ${C.line}`, background: "#08182d", boxShadow: "0 30px 80px rgba(0,0,0,0.35)", scale: pop(frame, 4260) }}><div style={{ padding: "20px 28px", background: "#142943", fontFamily: "Cascadia Code, Consolas, monospace", fontSize: 22, color: C.muted }}>.branchline/policy.yml</div><div style={{ padding: 36, fontFamily: "Cascadia Code, Consolas, monospace", fontSize: 27, lineHeight: 1.72 }}><div style={{ color: C.blue }}>requireCouncil:<span style={{ color: C.mint }}> true</span></div><div style={{ color: C.blue }}>requireAllCouncilRoles:<span style={{ color: C.mint }}> true</span></div><div style={{ color: C.blue }}>requireHumanDecision:<span style={{ color: C.mint }}> true</span></div><div style={{ color: C.blue }}>minTestConfidence:<span style={{ color: C.amber }}> 75</span></div><div style={{ marginTop: 26, padding: "14px 18px", borderRadius: 12, color: C.ink, background: C.mint, display: "inline-block", fontWeight: 900 }}>✓ POLICY CHECK PASSED</div></div></div></div>
      </div>

      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: mcp }}>
        <div style={{ width: 1500, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 70, alignItems: "center" }}><div style={{ borderRadius: 30, padding: 44, background: "#07111f", border: "1px solid rgba(105,230,197,0.34)", boxShadow: "0 34px 85px rgba(0,0,0,0.4)", fontFamily: "Cascadia Code, Consolas, monospace", scale: pop(frame, 4710) }}><div style={{ color: C.muted, fontSize: 22 }}>terminal · read-only MCP</div><div style={{ color: C.mint, fontSize: 29, marginTop: 28 }}>$ npx github:KrisnaSantosa15/branchline mcp</div><div style={{ color: C.paper, fontSize: 25, lineHeight: 1.8, marginTop: 28 }}>{["analyze_release", "get_evidence_pack", "compare_rollouts", "check_policy"].map((tool, index) => <div key={tool} style={{ opacity: interpolate(frame, [4800 + index * 24, 4830 + index * 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>› {tool}</div>)}</div><div style={{ color: C.muted, fontSize: 21, marginTop: 28 }}>Git-only · deterministic · no deploys · no pushes</div></div><div><Eyebrow>05 / Bring the proof to every harness</Eyebrow><div style={{ fontSize: 78, lineHeight: 1.02, fontWeight: 900, letterSpacing: "-0.055em", marginTop: 25 }}>One source of truth.<br /><span style={{ color: C.mint }}>Every agent.</span></div><div style={{ marginTop: 38, display: "flex", flexWrap: "wrap", gap: 14 }}>{["CODEX", "CLAUDE CODE", "CURSOR", "COPILOT", "OPENCODE", "GEMINI"].map((name) => <div key={name} style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: "14px 18px", fontSize: 22, fontWeight: 900, color: C.paper }}>{name}</div>)}</div><div style={{ color: C.muted, fontSize: 30, lineHeight: 1.35, marginTop: 34 }}>GPT-5.6 reasons over bounded, redacted evidence. The human retains the release call.</div></div></div>
      </div>

      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: outro }}><div style={{ textAlign: "center", width: 1450 }}><Eyebrow>Branchline</Eyebrow><div style={{ fontSize: 112, lineHeight: 0.95, fontWeight: 900, letterSpacing: "-0.07em", marginTop: 34 }}>Map it.<br /><span style={{ color: C.mint }}>Rehearse it.</span><br />Then decide.</div><div style={{ color: C.muted, fontSize: 35, marginTop: 34 }}>Evidence-led release rehearsal for humans and coding agents.</div></div></div>
      <CaptionBar />
    </AbsoluteFill>
  );
};
