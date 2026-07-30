import { useEffect, useMemo, useState } from "react";
import {
  ArrowClockwise,
  CaretDown,
  CaretUp,
  Info,
  Microphone,
  Pause,
  Play,
  ShieldCheck,
  SkipForward,
  Stop,
  Waveform,
} from "@phosphor-icons/react";
import { FlintChart } from "./components/FlintChart";
import { DEMO_TURNS } from "./data/demoTurns";
import {
  buildCombSpec,
  buildTtmBeliefSpec,
  buildTtmObservationSpec,
} from "./lib/flintSpecs";
import { summarizeConversation } from "./lib/scoring";
import "./styles.css";

const DECISION_COPY = {
  Continue: {
    trigger: "Stable stage · low gaps",
    behavior: "Normal flow, full task capability",
  },
  Soften: {
    trigger: "Mild capability or motivation gap",
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
  capability: "#39bdd2",
  motivation: "#f5b64d",
  opportunity: "#9b7bf7",
};

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
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

function MicRail({ active, onToggle, turnCount, elapsed }) {
  return (
    <aside className="mic-rail" aria-label="Voice input">
      <div className="mic-rail__status">
        <span className={`live-dot ${active ? "live-dot--active" : ""}`} />
        {active ? "Mic live" : "Mic paused"}
      </div>
      <time className="mic-rail__time">{elapsed}</time>

      <button
        className={`mic-button ${active ? "mic-button--active" : ""}`}
        type="button"
        onClick={onToggle}
        aria-label={active ? "Pause simulated microphone" : "Start microphone"}
        aria-pressed={active}
      >
        {active ? (
          <Microphone size={30} weight="fill" />
        ) : (
          <Stop size={25} weight="fill" />
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
        Behavioural inference,
        <br />
        not diagnosis
      </p>
    </aside>
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
          <span>Overall model belief</span>
          <span>Flint density plot</span>
        </div>
        <FlintChart
          spec={beliefSpec}
          label="Approximate overall model belief distributed across the ordinal TTM stage axis."
        />
      </div>

      <p className="chart-caveat">
        <Info size={14} weight="fill" />
        Ordinal model-belief approximation, not a clinical probability.
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
          label="Stacked capability, motivation, and opportunity gaps for each turn, with a line showing the total behavior score."
        />
      </div>

      <div className="gap-legend" aria-label="COM-B gap values">
        {["capability", "motivation", "opportunity"].map((gap) => (
          <div key={gap}>
            <span
              className="legend-swatch"
              style={{ background: GAP_COLORS[gap] }}
            />
            <span>{gap}</span>
            <strong>{selectedTurn[gap].toFixed(2)}</strong>
          </div>
        ))}
        <div className="gap-legend__risk">
          <span>Decision risk</span>
          <strong>{selectedTurn.decisionRisk.toFixed(2)}</strong>
          <small>45% C · 45% M · 10% O</small>
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
            formula="C = .3 length + .3 tense + .2 speech + .2 pause"
            value={selectedTurn.capability.toFixed(2)}
            color={GAP_COLORS.capability}
          />
          <FormulaRow
            formula="O = .5 time limit + .3 late night + .2 interruption"
            value={selectedTurn.opportunity.toFixed(2)}
            color={GAP_COLORS.opportunity}
          />
          <FormulaRow
            formula="M = .4 minimal ack + .3 no question + .3 monopitch"
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
    <div className="compact-gaps" aria-label="COM-B gap scores">
      <span style={{ color: GAP_COLORS.capability }}>
        C {turn.capability.toFixed(2)}
      </span>
      <span style={{ color: GAP_COLORS.motivation }}>
        M {turn.motivation.toFixed(2)}
      </span>
      <span style={{ color: GAP_COLORS.opportunity }}>
        O {turn.opportunity.toFixed(2)}
      </span>
    </div>
  );
}

function TurnLedger({ turns, selectedId, onSelect }) {
  return (
    <section className="ledger-section">
      <div className="section-heading">
        <div>
          <h2>Turn ledger</h2>
          <p>Conversation, inferred state, response fit, and routing decision.</p>
        </div>
        <span>Newest evidence first · {turns.length} turns</span>
      </div>

      <div className="ledger">
        {[...turns].reverse().map((turn) => {
          const index = turns.findIndex((candidate) => candidate.id === turn.id);
          const selected = turn.id === selectedId;
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
                <span className="column-label">User state · inferred</span>
                <strong>{turn.stage}</strong>
                <CompactGaps turn={turn} />
              </div>

              <div className="turn-row__assistant">
                <span className="column-label">Assistant reply</span>
                <p>{turn.assistant}</p>
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
              </div>

              {selected && (
                <div className="turn-evidence">
                  <div className="turn-evidence__summary">
                    <div>
                      <span>Stage confidence</span>
                      <strong>{formatPercent(turn.stageConfidence)}</strong>
                    </div>
                    <div>
                      <span>Evidence weight</span>
                      <strong>{formatPercent(turn.meaningfulness)}</strong>
                    </div>
                    <div>
                      <span>Behaviour sum</span>
                      <strong>{turn.behaviorScore.toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="turn-evidence__gaps">
                    <MetricBar
                      label="Capability"
                      value={turn.capability}
                      color={GAP_COLORS.capability}
                      compact
                    />
                    <MetricBar
                      label="Motivation"
                      value={turn.motivation}
                      color={GAP_COLORS.motivation}
                      compact
                    />
                    <MetricBar
                      label="Opportunity"
                      value={turn.opportunity}
                      color={GAP_COLORS.opportunity}
                      compact
                    />
                  </div>

                  <div className="turn-evidence__signals">
                    <span>Signals / evidence</span>
                    <div>
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
  const [visibleCount, setVisibleCount] = useState(4);
  const [selectedId, setSelectedId] = useState(DEMO_TURNS[3].id);
  const [micActive, setMicActive] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showRubric, setShowRubric] = useState(false);

  const turns = DEMO_TURNS.slice(0, visibleCount);
  const latestTurn = turns.at(-1);
  const selectedTurn =
    turns.find((turn) => turn.id === selectedId) ?? latestTurn;
  const summary = summarizeConversation(turns);

  useEffect(() => {
    if (!isPlaying) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setVisibleCount((count) => {
        if (count >= DEMO_TURNS.length) {
          setIsPlaying(false);
          return count;
        }
        const next = count + 1;
        setSelectedId(DEMO_TURNS[next - 1].id);
        return next;
      });
    }, 1600);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const handleNext = () => {
    if (visibleCount >= DEMO_TURNS.length) {
      setVisibleCount(1);
      setSelectedId(DEMO_TURNS[0].id);
      setIsPlaying(false);
      return;
    }

    const next = visibleCount + 1;
    setVisibleCount(next);
    setSelectedId(DEMO_TURNS[next - 1].id);
  };

  const handleReset = () => {
    setVisibleCount(1);
    setSelectedId(DEMO_TURNS[0].id);
    setIsPlaying(false);
    setMicActive(true);
  };

  return (
    <div className="app-shell">
      <MicRail
        active={micActive}
        onToggle={() => setMicActive((active) => !active)}
        turnCount={turns.length}
        elapsed={latestTurn.timestamp}
      />

      <main className="app-main">
        <Header
          summary={summary}
          firstTurn={turns[0]}
          latestTurn={latestTurn}
          isPlaying={isPlaying}
          onPlay={() => setIsPlaying((playing) => !playing)}
          onNext={handleNext}
          onReset={handleReset}
          canAdvance={visibleCount < DEMO_TURNS.length}
        />

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

        <TurnLedger
          turns={turns}
          selectedId={selectedTurn.id}
          onSelect={setSelectedId}
        />
      </main>
    </div>
  );
}
