import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwise,
  ChartLineUp,
  CaretDown,
  CaretUp,
  CircleNotch,
  Info,
  ListBullets,
  Microphone,
  PaperPlaneTilt,
  Pause,
  Play,
  ShieldCheck,
  SkipForward,
  SpeakerHigh,
  Stop,
  Waveform,
} from "@phosphor-icons/react";
import { FlintChart } from "./components/FlintChart";
import { LiteReplay } from "./components/LiteReplay";
import {
  REPLAY_SCENARIOS,
  replayScenarioToRawTurns,
} from "./data/replayScenarios";
import { useTurnRecorder } from "./hooks/useTurnRecorder";
import {
  buildCombSpec,
  buildTtmBeliefSpec,
  buildTtmObservationSpec,
} from "./lib/flintSpecs";
import { buildInstantTurn } from "./lib/instantAnalysis";
import {
  isAssistantEcho,
  isPotentialAssistantEcho,
} from "./lib/assistantReply";
import { scoreConversation, summarizeConversation } from "./lib/scoring";
import "./styles.css";
import "./dashboardTheme.css";

const DECISION_COPY = {
  Continue: {
    trigger: "Stable stage · low gaps",
    behavior: "Normal flow, full task bandwidth",
  },
  Soften: {
    trigger: "Mild bandwidth or engagement gap",
    behavior: "Shorter response, slower pacing, no new information",
  },
  Checkpoint: {
    trigger: "Stage regression or absolutist spike",
    behavior: "Ask one gentle, non-leading question before proceeding",
  },
  Escalate: {
    trigger: "Sustained regression · compounding high-risk signals",
    behavior: "Stop general assistance and hand off plainly",
  },
};

const GAP_COLORS = {
  capability: "#6f9f9a",
  motivation: "#d6a64e",
  opportunity: "#a385bd",
};

const GAP_LABELS = {
  capability: "Bandwidth",
  motivation: "Engagement",
  opportunity: "Timing",
};

const TTM_PROBABILITY_LABELS = [
  ["precontemplation", "Precontemplation"],
  ["contemplation", "Contemplation"],
  ["preparation", "Preparation"],
  ["action", "Action"],
];

const LEDGER_SOURCE_OPTIONS = Object.values(REPLAY_SCENARIOS).map(
  ({ id, label }) => ({
    id,
    label,
  }),
);
const DEFAULT_LEDGER_SOURCE = LEDGER_SOURCE_OPTIONS[0].id;
const EMPTY_TURNS = [];

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function allocateStagePercentages(probabilities) {
  const shares = TTM_PROBABILITY_LABELS.map(([key]) => {
    const exact = (probabilities[key] ?? 0) * 100;
    return { key, exact, whole: Math.floor(exact) };
  });
  let remaining =
    100 - shares.reduce((total, share) => total + share.whole, 0);

  shares
    .toSorted(
      (left, right) =>
        right.exact - right.whole - (left.exact - left.whole),
    )
    .forEach((share) => {
      if (remaining > 0) {
        share.whole += 1;
        remaining -= 1;
      }
    });

  return Object.fromEntries(
    shares.map(({ key, whole }) => [key, `${whole}%`]),
  );
}

function MetricBar({ label, value, color, compact = false }) {
  return (
    <div className={`metric-bar ${compact ? "metric-bar--compact" : ""}`}>
      <div className="metric-bar__label">
        <span>{label}</span>
        <strong>{formatPercent(value)}</strong>
      </div>
      <div className="metric-bar__track" aria-hidden="true">
        <span
          className="metric-bar__fill"
          style={{ width: `${value * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}

function MicRail({ active, busy, onToggle, turnCount, elapsed }) {
  const status = busy ? "Analyzing" : active ? "Recording" : "Mic ready";

  return (
    <aside className="mic-rail" aria-label="Voice input">
      <div className="mic-rail__status">
        <span className={`live-dot ${active ? "live-dot--active" : ""}`} />
        {status}
      </div>
      <time className="mic-rail__time">{elapsed}</time>

      <button
        className={`mic-button ${active ? "mic-button--active" : ""}`}
        type="button"
        onClick={onToggle}
        aria-label={active ? "Stop and analyze recording" : "Start recording"}
        aria-pressed={active}
        disabled={busy}
      >
        {busy ? (
          <CircleNotch className="spin" size={28} weight="bold" />
        ) : active ? (
          <Microphone size={30} weight="fill" />
        ) : (
          <Microphone size={28} weight="regular" />
        )}
      </button>

      <Waveform
        className={`mic-wave ${active ? "mic-wave--active" : ""}`}
        size={68}
        weight="duotone"
        aria-hidden="true"
      />

      <div className="mic-rail__turns">
        <strong>{turnCount}</strong>
        <span>turns measured</span>
      </div>

      <p className="mic-rail__note">
        Tap to record,
        <br />
        tap again to analyze
      </p>
    </aside>
  );
}

function AppTabs({
  activeTab,
  turnCount,
  onChange,
  onOpenReplay,
  replayDisabled,
  apiConfig,
}) {
  return (
    <div className="workspace-nav">
      <div className="app-tabs" role="tablist" aria-label="Workspace views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "ledger"}
          className={activeTab === "ledger" ? "is-active" : ""}
          onClick={() => onChange("ledger")}
        >
          <ListBullets size={17} weight="bold" />
          Turn ledger
          <span>{turnCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "analysis"}
          className={activeTab === "analysis" ? "is-active" : ""}
          onClick={() => onChange("analysis")}
        >
          <ChartLineUp size={17} weight="bold" />
          Live analysis
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={false}
          onClick={onOpenReplay}
          disabled={replayDisabled}
          title={
            replayDisabled
              ? "Finish the current turn before opening replay"
              : undefined
          }
        >
          <Play size={17} weight="fill" />
          Lite replay
        </button>
      </div>

      <div
        className={`api-status ${
          apiConfig.configured ? "api-status--ready" : ""
        }`}
      >
        <span />
        {apiConfig.loading
          ? "Checking OpenAI"
          : apiConfig.configured
            ? apiConfig.elevenLabsConfigured
              ? "Voice + analysis ready"
              : "Analysis ready"
            : "API key needed"}
      </div>
    </div>
  );
}

function AnalysisComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  configured,
}) {
  return (
    <form
      className="analysis-composer"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="typed-turn">Quick text fallback</label>
      <div>
        <input
          id="typed-turn"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={
            configured
              ? "Type a turn if browser speech recognition is unavailable…"
              : "OpenAI connection required"
          }
          disabled={!configured || disabled}
        />
        <button
          type="submit"
          disabled={!configured || disabled || !value.trim()}
        >
          {disabled ? (
            <CircleNotch className="spin" size={16} weight="bold" />
          ) : (
            <PaperPlaneTilt size={16} weight="fill" />
          )}
          Analyze
        </button>
      </div>
    </form>
  );
}

function Header({
  summary,
  firstTurn,
  latestTurn,
  isPlaying,
  onPlay,
  onNext,
  onReset,
  canAdvance,
}) {
  const trend =
    latestTurn.stagePosition < firstTurn.stagePosition - 0.6
      ? "regressing"
      : "stable";

  return (
    <header className="app-header">
      <div className="title-block">
        <h1>Conversation measurement</h1>
        <p>Live rubric · turn-by-turn evidence</p>
      </div>

      <div className="header-metrics">
        <div className="header-metric">
          <span>Conversation trend</span>
          <strong className={`trend trend--${trend}`}>{trend}</strong>
        </div>
        <div className="header-metric">
          <span>Aggregate response fit</span>
          <strong>
            {summary.appropriateness}
            <small>/100</small>
          </strong>
        </div>
        <div className="header-metric">
          <span>Evidence confidence</span>
          <strong className="confidence">{summary.confidence}</strong>
        </div>
        <div className="header-metric">
          <span>Current decision</span>
          <strong className={`decision-text decision-text--${summary.decision}`}>
            {summary.decision}
          </strong>
        </div>
      </div>

      <div className="demo-controls" aria-label="Demo playback controls">
        <button
          className="icon-button"
          type="button"
          onClick={onReset}
          aria-label="Reset demo"
        >
          <ArrowClockwise size={18} weight="bold" />
        </button>
        <button className="secondary-button" type="button" onClick={onNext}>
          <SkipForward size={17} weight="fill" />
          {canAdvance ? "Next turn" : "Restart"}
        </button>
        <button className="primary-button" type="button" onClick={onPlay}>
          {isPlaying ? (
            <Pause size={17} weight="fill" />
          ) : (
            <Play size={17} weight="fill" />
          )}
          {isPlaying ? "Pause" : "Play demo"}
        </button>
      </div>
    </header>
  );
}

function TtmPanel({ turns }) {
  const observationSpec = useMemo(
    () => buildTtmObservationSpec(turns),
    [turns],
  );
  const beliefSpec = useMemo(() => buildTtmBeliefSpec(turns), [turns]);
  const summary = summarizeConversation(turns);
  const stagePercentages = allocateStagePercentages(
    summary.stageProbabilities,
  );

  return (
    <section className="analysis-panel ttm-panel">
      <div className="panel-heading">
        <div>
          <h2>TTM stage classifier</h2>
          <p>Each point is a turn; size encodes evidential weight.</p>
        </div>
        <div className="panel-summary">
          <span>Overall</span>
          <strong>{summary.stage}</strong>
          <small>{formatPercent(summary.stagePosition / 3)} along axis</small>
        </div>
      </div>

      <div className="chart-block">
        <div className="chart-label">
          <span>Turn observations</span>
          <span>Flint scatter plot</span>
        </div>
        <FlintChart
          spec={observationSpec}
          label="TTM turn classifications from precontemplation to action. Point size represents how meaningful each turn is."
        />
      </div>

      <div className="chart-block chart-block--belief">
        <div className="chart-label">
          <span>Overall stage probability</span>
          <span>Flint probability curve</span>
        </div>
        <FlintChart
          spec={beliefSpec}
          label="Aggregated model probability across precontemplation, contemplation, preparation, and action."
        />
        <div
          className="ttm-probabilities"
          aria-label="Overall TTM stage probabilities"
        >
          {TTM_PROBABILITY_LABELS.map(([key, label]) => (
            <div key={key}>
              <span>{label}</span>
              <strong>{stagePercentages[key]}</strong>
            </div>
          ))}
        </div>
      </div>

      <p className="chart-caveat">
        <Info size={14} weight="fill" />
        Model classification probabilities, not a clinical assessment.
      </p>
    </section>
  );
}

function FormulaRow({ formula, value, color }) {
  return (
    <div className="formula-row">
      <span className="formula-row__dot" style={{ background: color }} />
      <code>{formula}</code>
      <strong>{value}</strong>
    </div>
  );
}

function CombPanel({ turns, selectedTurn, showRubric, onToggleRubric }) {
  const combSpec = useMemo(() => buildCombSpec(turns), [turns]);
  const summary = summarizeConversation(turns);

  return (
    <section className="analysis-panel comb-panel">
      <div className="panel-heading">
        <div>
          <h2>COM-B gap scorer</h2>
          <p>Stacked gaps over time; the white line is their total.</p>
        </div>
        <div className="panel-summary">
          <span>Behaviour score</span>
          <strong>{summary.behaviorScore.toFixed(2)}</strong>
          <small>sum of three gaps · 0–3</small>
        </div>
      </div>

      <div className="chart-block">
        <div className="chart-label">
          <span>Gap trajectory</span>
          <span>Flint stacked area + line</span>
        </div>
        <FlintChart
          spec={combSpec}
          label="Stacked bandwidth, engagement, and timing gaps for each turn, with a line showing the total behavior score."
        />
      </div>

      <div
        className="gap-legend"
        aria-label="Bandwidth, engagement, and timing gap values"
      >
        {["capability", "motivation", "opportunity"].map((gap) => (
          <div key={gap}>
            <span
              className="legend-swatch"
              style={{ background: GAP_COLORS[gap] }}
            />
            <span>{GAP_LABELS[gap]}</span>
            <strong>{selectedTurn[gap].toFixed(2)}</strong>
          </div>
        ))}
        <div className="gap-legend__risk">
          <span>Decision risk</span>
          <strong>{selectedTurn.decisionRisk.toFixed(2)}</strong>
          <small>45% B · 45% E · 10% T</small>
        </div>
      </div>

      <button
        className="rubric-toggle"
        type="button"
        onClick={onToggleRubric}
        aria-expanded={showRubric}
      >
        {showRubric ? (
          <CaretUp size={16} weight="bold" />
        ) : (
          <CaretDown size={16} weight="bold" />
        )}
        {showRubric ? "Hide scoring formulas" : "Show scoring formulas"}
      </button>

      {showRubric && (
        <div className="formula-list">
          <FormulaRow
            formula="B = .3 length + .3 tense + .2 speech + .2 pause"
            value={selectedTurn.capability.toFixed(2)}
            color={GAP_COLORS.capability}
          />
          <FormulaRow
            formula="T = .5 time limit + .3 late night + .2 interruption"
            value={selectedTurn.opportunity.toFixed(2)}
            color={GAP_COLORS.opportunity}
          />
          <FormulaRow
            formula="E = .4 minimal ack + .3 no question + .3 monopitch"
            value={selectedTurn.motivation.toFixed(2)}
            color={GAP_COLORS.motivation}
          />
        </div>
      )}
    </section>
  );
}

function DecisionStrip({ decision }) {
  const copy = DECISION_COPY[decision];

  return (
    <section className={`decision-strip decision-strip--${decision}`}>
      <div>
        <span>Decision layer</span>
        <strong>{decision}</strong>
      </div>
      <div>
        <span>Trigger</span>
        <strong>{copy.trigger}</strong>
      </div>
      <div className="decision-strip__behavior">
        <span>Agent behaviour</span>
        <strong>{copy.behavior}</strong>
      </div>
      <div className="decision-scale" aria-label={`Current state: ${decision}`}>
        {Object.keys(DECISION_COPY).map((state) => (
          <span
            key={state}
            className={state === decision ? "is-current" : ""}
          >
            {state}
          </span>
        ))}
      </div>
    </section>
  );
}

function CompactGaps({ turn }) {
  return (
    <div
      className="compact-gaps"
      aria-label="Bandwidth, engagement, and timing gap scores"
    >
      <span style={{ color: GAP_COLORS.capability }}>
        B {turn.capability.toFixed(2)}
      </span>
      <span style={{ color: GAP_COLORS.motivation }}>
        E {turn.motivation.toFixed(2)}
      </span>
      <span style={{ color: GAP_COLORS.opportunity }}>
        T {turn.opportunity.toFixed(2)}
      </span>
    </div>
  );
}

function LedgerSourceSwitcher({ value, onChange, disabled }) {
  return (
    <label className="ledger-source-switcher">
      <span>Conversation log</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Conversation log"
        disabled={disabled}
      >
        {LEDGER_SOURCE_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TurnLedger({
  turns,
  selectedId,
  onSelect,
  source,
  onSourceChange,
  sourceDisabled,
  onSpeak,
  speakingId,
}) {
  return (
    <section className="ledger-section">
      <div className="section-heading">
        <div>
          <h2>Turn ledger</h2>
          <p>Conversation, inferred state, response fit, and routing decision.</p>
        </div>
        <div className="ledger-heading-controls">
          <LedgerSourceSwitcher
            value={source}
            onChange={onSourceChange}
            disabled={sourceDisabled}
          />
          <span>Newest evidence first · {turns.length} turns</span>
        </div>
      </div>

      <div className="ledger">
        {[...turns].reverse().map((turn) => {
          const index = turns.findIndex((candidate) => candidate.id === turn.id);
          const selected = turn.id === selectedId;
          const turnStagePercentages =
            turn.ttmApplicable === false
              ? null
              : allocateStagePercentages(turn.stageProbabilities);
          return (
            <article
              key={turn.id}
              className={`turn-row ${selected ? "turn-row--selected" : ""}`}
            >
              <button
                className="turn-row__select"
                type="button"
                onClick={() => onSelect(turn.id)}
                aria-expanded={selected}
                aria-label={`Inspect turn ${index + 1}`}
              >
                <span className="turn-number">{index + 1}</span>
                <time>{turn.timestamp}</time>
                {selected ? (
                  <CaretUp size={16} weight="bold" />
                ) : (
                  <CaretDown size={16} weight="bold" />
                )}
              </button>

              <div className="turn-row__user">
                <span className="column-label">User</span>
                <p>{turn.user}</p>
              </div>

              <div className="turn-row__state">
                <span className="column-label">
                  {turn.ttmApplicable === false
                    ? "TTM · not applicable"
                    : "TTM observation"}
                </span>
                <strong>
                  {turn.ttmApplicable === false ? "N/A" : turn.stage}
                </strong>
                <CompactGaps turn={turn} />
              </div>

              <div className="turn-row__assistant">
                <span className="column-label">Assistant reply</span>
                <p
                  className={
                    turn.streamingAssistant ? "streaming-reply" : undefined
                  }
                  aria-live={turn.streamingAssistant ? "polite" : undefined}
                >
                  {turn.assistant}
                  {turn.streamingAssistant && (
                    <span className="streaming-caret" aria-hidden="true" />
                  )}
                  {turn.streamingAssistant && !turn.assistant && (
                    <span className="sr-only">
                      Assistant reply is streaming
                    </span>
                  )}
                </p>
                <button
                  className="listen-button"
                  type="button"
                  onClick={() => onSpeak(turn)}
                  disabled={!onSpeak}
                >
                  {speakingId === turn.id ? (
                    <Stop size={13} weight="fill" />
                  ) : (
                    <SpeakerHigh size={13} weight="fill" />
                  )}
                  {speakingId === turn.id ? "Stop" : "Listen"}
                </button>
              </div>

              <div className="turn-row__fit">
                <span className="column-label">Appropriateness</span>
                <strong>
                  {turn.appropriateness}
                  <small>/100</small>
                </strong>
                <span
                  className={`decision-tag decision-tag--${turn.decision}`}
                >
                  {turn.decision}
                </span>
                {turn.streamingAssistant && (
                  <span className="refinement-tag">Streaming with Luna</span>
                )}
                {turn.evaluationPending && !turn.streamingAssistant && (
                  <span className="refinement-tag">Checking response fit</span>
                )}
              </div>

              {selected && (
                <div className="turn-evidence">
                  <div className="turn-evidence__summary">
                    <div>
                      <span>Stage confidence</span>
                      <strong>
                        {turn.ttmApplicable === false
                          ? "N/A"
                          : formatPercent(turn.stageConfidence)}
                      </strong>
                    </div>
                    <div>
                      <span>Evidence weight</span>
                      <strong>{formatPercent(turn.meaningfulness)}</strong>
                    </div>
                    <div>
                      <span>Behaviour sum</span>
                      <strong>{turn.behaviorScore.toFixed(2)}</strong>
                    </div>

                    <div className="turn-evidence__ttm">
                      <span>TTM stage probabilities</span>
                      {turn.ttmApplicable === false ? (
                        <p className="ttm-unavailable">
                          Not applicable to this off-domain turn. Excluded from
                          the TTM trajectory.
                        </p>
                      ) : (
                        <div
                          className="ttm-probabilities ttm-probabilities--turn"
                          aria-label={`Turn ${index + 1} TTM stage probabilities`}
                        >
                          {TTM_PROBABILITY_LABELS.map(([key, label]) => (
                            <div key={key}>
                              <span>{label}</span>
                              <strong>{turnStagePercentages[key]}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="turn-evidence__gaps">
                    <MetricBar
                      label="Bandwidth"
                      value={turn.capability}
                      color={GAP_COLORS.capability}
                      compact
                    />
                    <MetricBar
                      label="Engagement"
                      value={turn.motivation}
                      color={GAP_COLORS.motivation}
                      compact
                    />
                    <MetricBar
                      label="Timing"
                      value={turn.opportunity}
                      color={GAP_COLORS.opportunity}
                      compact
                    />
                  </div>

                  <div className="turn-evidence__signals">
                    <span>Signals / evidence</span>
                    <div>
                      {turn.ttmApplicable === false && (
                        <span>TTM not applicable to this turn</span>
                      )}
                      {turn.billExposure && <span>billExposure window</span>}
                      {turn.directHarm?.present && (
                        <span>
                          Direct harm · {turn.directHarm.target} · {turn.directHarm.intentLevel}
                        </span>
                      )}
                      {turn.stageRegression && <span>stage regression</span>}
                      {turn.sustainedCapabilityGap && <span>sustained capability gap</span>}
                      {turn.sustainedAbsolutist && <span>sustained absolutist ratio</span>}
                      {turn.responseRetried && <span>Luna reply revised after evaluator</span>}
                      {turn.evidence.map((signal) => (
                        <span key={signal}>{signal}</span>
                      ))}
                    </div>
                  </div>

                  <div className="turn-evidence__rationale">
                    <ShieldCheck size={18} weight="duotone" />
                    <p>{turn.rationale}</p>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function App() {
  const [prototypeView, setPrototypeView] = useState("detailed");
  const [visibleCount, setVisibleCount] = useState(
    REPLAY_SCENARIOS[DEFAULT_LEDGER_SOURCE].turns.length,
  );
  const [selectedId, setSelectedId] = useState(
    `replay-${DEFAULT_LEDGER_SOURCE}-${REPLAY_SCENARIOS[DEFAULT_LEDGER_SOURCE].turns.length}`,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [showRubric, setShowRubric] = useState(false);
  const [activeTab, setActiveTab] = useState("ledger");
  const [ledgerSource, setLedgerSource] = useState(DEFAULT_LEDGER_SOURCE);
  const [liveRawTurnsBySource, setLiveRawTurnsBySource] = useState({});
  const [apiConfig, setApiConfig] = useState({
    loading: true,
    configured: false,
  });
  const [analysisStatus, setAnalysisStatus] = useState({
    state: "idle",
    message: "Record a new turn when you are ready.",
  });
  const [draftTranscript, setDraftTranscript] = useState("");
  const [speakingId, setSpeakingId] = useState(null);
  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);
  const { isRecording, start: startRecording, stop: stopRecording } =
    useTurnRecorder();

  const sourceTurnCount = REPLAY_SCENARIOS[ledgerSource].turns.length;
  const activeLiveRawTurns =
    liveRawTurnsBySource[ledgerSource] ?? EMPTY_TURNS;
  const turns = useMemo(
    () =>
      scoreConversation([
        ...replayScenarioToRawTurns(ledgerSource).slice(0, visibleCount),
        ...activeLiveRawTurns,
      ]),
    [activeLiveRawTurns, ledgerSource, visibleCount],
  );
  const latestTurn = turns.at(-1);
  const selectedTurn =
    turns.find((turn) => turn.id === selectedId) ?? latestTurn;
  const summary = summarizeConversation(turns);
  const analysisBusy = analysisStatus.state === "analyzing";

  const updateSourceTurns = (sourceId, updater) => {
    setLiveRawTurnsBySource((current) => {
      const sourceTurns = current[sourceId] ?? [];
      return {
        ...current,
        [sourceId]: updater(sourceTurns),
      };
    });
  };

  const clearSourceTurns = (sourceId) => {
    setLiveRawTurnsBySource((current) => ({
      ...current,
      [sourceId]: [],
    }));
  };

  useEffect(() => {
    let cancelled = false;

    fetch("/api/config")
      .then((response) => response.json())
      .then((config) => {
        if (!cancelled) {
          setApiConfig({ loading: false, ...config });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApiConfig({ loading: false, configured: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isPlaying) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setVisibleCount((count) => {
        if (count >= sourceTurnCount) {
          setIsPlaying(false);
          return count;
        }
        const next = count + 1;
        setSelectedId(`replay-${ledgerSource}-${next}`);
        return next;
      });
    }, 1600);

    return () => window.clearInterval(timer);
  }, [isPlaying, ledgerSource, sourceTurnCount]);

  const handleNext = () => {
    if (visibleCount >= sourceTurnCount) {
      setVisibleCount(1);
      clearSourceTurns(ledgerSource);
      setSelectedId(`replay-${ledgerSource}-1`);
      setIsPlaying(false);
      return;
    }

    const next = visibleCount + 1;
    setVisibleCount(next);
    setSelectedId(`replay-${ledgerSource}-${next}`);
  };

  const handleReset = () => {
    audioRef.current?.pause();
    setSpeakingId(null);
    setVisibleCount(1);
    clearSourceTurns(ledgerSource);
    setSelectedId(`replay-${ledgerSource}-1`);
    setIsPlaying(false);
    setAnalysisStatus({
      state: "idle",
      message: "Record a new turn when you are ready.",
    });
  };

  const submitTurn = async ({ transcript = "", blob, durationMs = 0 }) => {
    const sourceId = ledgerSource;
    const startedAt = performance.now();
    const priorSeconds = latestTurn.timestamp
      .split(":")
      .reduce((total, part) => total * 60 + Number(part), 0);
    const nextSeconds =
      priorSeconds + Math.max(8, Math.round(durationMs / 1000) + 4);
    const nextTimestamp = [
      Math.floor(nextSeconds / 3600),
      Math.floor((nextSeconds % 3600) / 60),
      nextSeconds % 60,
    ]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
    const id = `live-${Date.now()}`;
    const hasInstantPreview = Boolean(transcript.trim());

    setAnalysisStatus({
      state: "analyzing",
      message: hasInstantPreview
        ? "Instant estimate ready · extracting, routing, and checking the reply…"
        : "Transcribing, extracting evidence, and routing…",
    });

    if (hasInstantPreview) {
      const previewTurn = buildInstantTurn({
        id,
        timestamp: nextTimestamp,
        transcript,
        durationMs,
        previousTurns: turns,
      });
      updateSourceTurns(sourceId, (current) => [...current, previewTurn]);
      setSelectedId(id);
      setDraftTranscript("");
    }

    const formData = new FormData();
    if (transcript.trim()) {
      formData.append("transcript", transcript.trim());
    }
    if (blob) {
      formData.append(
        "audio",
        blob,
        blob.type.includes("mp4") ? "turn.m4a" : "turn.webm",
      );
    }
    formData.append(
      "history",
      JSON.stringify(
        turns.map(({
          user,
          assistant,
          stage,
          stagePosition,
          stageProbabilities,
          stageConfidence,
          meaningfulness,
          absolutist,
          absolutistTerms,
          features,
          decision,
          ttmApplicable,
          directHarm,
        }) => ({
          user,
          assistant,
          stage,
          stagePosition,
          stageProbabilities,
          stageConfidence,
          meaningfulness,
          absolutist,
          absolutistTerms,
          features,
          decision,
          ttmApplicable,
          directHarm,
        })),
      ),
    );
    formData.append("durationMs", String(durationMs));

    const response = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "The turn could not be analyzed.");
    }
    if (!response.body) {
      throw new Error("The analysis stream could not be opened.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let streamBuffer = "";
    let payload = null;
    let replyReady = false;
    let resolvedUserText = transcript.trim();

    const applyResultPayload = (resultPayload, evaluationPending) => {
      if (
        isAssistantEcho(
          resultPayload.analysis.assistant,
          resultPayload.transcript || resolvedUserText,
        )
      ) {
        throw new Error("Luna returned the user transcript instead of a reply.");
      }

      const rawTurn = {
        id,
        timestamp: nextTimestamp,
        user: resultPayload.transcript,
        assistant: resultPayload.analysis.assistant,
        guardGeneratedReply: true,
        streamingAssistant: false,
        ...resultPayload.analysis,
        evaluationPending,
      };

      updateSourceTurns(sourceId, (current) =>
        current.some((turn) => turn.id === id)
          ? current.map((turn) => (turn.id === id ? rawTurn : turn))
          : [...current, rawTurn],
      );
      setSelectedId(id);
      setDraftTranscript("");
    };

    const handleStreamEvent = (event) => {
      if (event.type === "transcript" && !hasInstantPreview) {
        resolvedUserText = event.transcript;
        const previewTurn = buildInstantTurn({
          id,
          timestamp: nextTimestamp,
          transcript: event.transcript,
          durationMs,
          previousTurns: turns,
        });
        updateSourceTurns(sourceId, (current) =>
          current.some((turn) => turn.id === id)
            ? current
            : [...current, previewTurn],
        );
        setSelectedId(id);
        setAnalysisStatus({
          state: "analyzing",
          message: "Transcript ready · Luna is streaming the reply…",
        });
      } else if (event.type === "assistant.delta") {
        if (isPotentialAssistantEcho(event.assistant, resolvedUserText)) {
          return;
        }
        updateSourceTurns(sourceId, (current) =>
          current.map((turn) =>
            turn.id === id
              ? {
                  ...turn,
                  assistant: event.assistant,
                  streamingAssistant: true,
                }
              : turn,
          ),
        );
      } else if (event.type === "reply.ready") {
        replyReady = true;
        applyResultPayload(event.payload, true);
        setAnalysisStatus({
          state: "analyzing",
          message: `Luna replied in ${(
            (performance.now() - startedAt) /
            1000
          ).toFixed(1)}s · checking response fit…`,
        });
      } else if (event.type === "result") {
        payload = event.payload;
        applyResultPayload(payload, false);
      } else if (event.type === "error") {
        throw new Error(
          replyReady
            ? `Luna replied, but response evaluation did not finish: ${
                event.error || "unknown evaluator error"
              }`
            : event.error || "The turn could not be analyzed.",
        );
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      streamBuffer += decoder.decode(value, { stream: !done });
      const lines = streamBuffer.split("\n");
      streamBuffer = lines.pop() || "";
      for (const line of lines) {
        if (line.trim()) {
          handleStreamEvent(JSON.parse(line));
        }
      }
      if (done) {
        break;
      }
    }

    if (streamBuffer.trim()) {
      handleStreamEvent(JSON.parse(streamBuffer));
    }
    if (!payload) {
      throw new Error("The analysis stream ended before returning a result.");
    }
    setAnalysisStatus({
      state: "success",
      message: `Turn analyzed in ${(
        (performance.now() - startedAt) /
        1000
      ).toFixed(1)}s · ${payload.models.analysis}.`,
    });
  };

  const handleMicToggle = async () => {
    if (analysisBusy) {
      return;
    }

    if (!isRecording) {
      if (!apiConfig.configured) {
        setAnalysisStatus({
          state: "error",
          message:
            "Add OPENAI_API_KEY to .env.local, then restart the preview.",
        });
        return;
      }

      try {
        await startRecording();
        setAnalysisStatus({
          state: "recording",
          message: "Recording… tap the microphone again when you finish.",
        });
      } catch (error) {
        setAnalysisStatus({
          state: "error",
          message:
            error instanceof Error
              ? error.message
              : "Microphone permission was not granted.",
        });
      }
      return;
    }

    try {
      setAnalysisStatus({
        state: "analyzing",
        message: "Finishing the transcript…",
      });
      const recording = await stopRecording();
      await submitTurn(recording);
    } catch (error) {
      setAnalysisStatus({
        state: "error",
        message:
          error instanceof Error
            ? error.message
            : "The recording could not be analyzed.",
      });
    }
  };

  const handleSpeak = async (turn) => {
    if (speakingId === turn.id) {
      audioRef.current?.pause();
      setSpeakingId(null);
      return;
    }

    audioRef.current?.pause();
    setSpeakingId(turn.id);

    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: turn.assistant }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "The reply could not be read aloud.");
      }

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      const audioUrl = URL.createObjectURL(await response.blob());
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audioUrlRef.current = audioUrl;
      audio.addEventListener("ended", () => setSpeakingId(null), {
        once: true,
      });
      audio.addEventListener("error", () => setSpeakingId(null), {
        once: true,
      });
      await audio.play();
    } catch (error) {
      setSpeakingId(null);
      setAnalysisStatus({
        state: "error",
        message:
          error instanceof Error
            ? error.message
            : "The reply could not be read aloud.",
      });
    }
  };

  const detailedView = (
    <div className="app-shell">
      <MicRail
        active={isRecording}
        busy={analysisBusy}
        onToggle={handleMicToggle}
        turnCount={turns.length}
        elapsed={latestTurn.timestamp}
      />

      <main className="app-main">
        <Header
          summary={summary}
          firstTurn={turns[0]}
          latestTurn={latestTurn}
          isPlaying={isPlaying}
          onPlay={() => {
            if (visibleCount >= sourceTurnCount && !isPlaying) {
              clearSourceTurns(ledgerSource);
              setVisibleCount(1);
              setSelectedId(`replay-${ledgerSource}-1`);
              setIsPlaying(true);
            } else {
              setIsPlaying((playing) => !playing);
            }
          }}
          onNext={handleNext}
          onReset={handleReset}
          canAdvance={visibleCount < sourceTurnCount}
        />

        <AppTabs
          activeTab={activeTab}
          turnCount={turns.length}
          onChange={setActiveTab}
          onOpenReplay={() => setPrototypeView("replay")}
          replayDisabled={isRecording || analysisBusy}
          apiConfig={apiConfig}
        />

        <div
          className={`analysis-status analysis-status--${analysisStatus.state}`}
          role="status"
        >
          {analysisStatus.state === "analyzing" && (
            <CircleNotch className="spin" size={16} weight="bold" />
          )}
          <span>{analysisStatus.message}</span>
        </div>

        <AnalysisComposer
          value={draftTranscript}
          onChange={setDraftTranscript}
          configured={apiConfig.configured}
          disabled={analysisBusy || isRecording}
          onSubmit={async () => {
            try {
              await submitTurn({ transcript: draftTranscript });
            } catch (error) {
              setAnalysisStatus({
                state: "error",
                message:
                  error instanceof Error
                    ? error.message
                    : "The turn could not be analyzed.",
              });
            }
          }}
        />

        {activeTab === "analysis" ? (
          <>
            <div className="analysis-grid">
            <TtmPanel turns={turns} />
              <CombPanel
                turns={turns}
                selectedTurn={selectedTurn}
                showRubric={showRubric}
                onToggleRubric={() => setShowRubric((shown) => !shown)}
              />
            </div>

            <DecisionStrip decision={latestTurn.decision} />
          </>
        ) : (
          <TurnLedger
            turns={turns}
            selectedId={
              turns.some((turn) => turn.id === selectedId)
                ? selectedId
                : turns.at(-1).id
            }
            onSelect={setSelectedId}
            source={ledgerSource}
            onSourceChange={(sourceId) => {
              setLedgerSource(sourceId);
              setVisibleCount(REPLAY_SCENARIOS[sourceId].turns.length);
              setSelectedId(
                liveRawTurnsBySource[sourceId]?.at(-1)?.id ??
                  `replay-${sourceId}-${REPLAY_SCENARIOS[sourceId].turns.length}`,
              );
              setIsPlaying(false);
            }}
            sourceDisabled={analysisBusy || isRecording}
            onSpeak={
              apiConfig.elevenLabsConfigured ? handleSpeak : undefined
            }
            speakingId={speakingId}
          />
        )}
      </main>
    </div>
  );

  return prototypeView === "detailed" ? (
    detailedView
  ) : (
    <LiteReplay
      onReturn={() => {
        setPrototypeView("detailed");
        setActiveTab("ledger");
      }}
    />
  );
}
