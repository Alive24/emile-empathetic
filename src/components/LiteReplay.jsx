import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import { REPLAY_SCENARIOS } from "../data/replayScenarios";
import "./liteReplay.css";

const STATE_LABELS = {
  Continue: "continue",
  Soften: "soften",
  Checkpoint: "checkpoint",
  Escalate: "escalate",
};

function ReplayTurn({ turn, index }) {
  return (
    <article className="replay-turn">
      <div className="message message--user">{turn.user}</div>
      <div className="message message--emile">{turn.emile}</div>
      <div className={`state-bar state-bar--${turn.state}`}>
        <span>{STATE_LABELS[turn.state]}</span>
        <span className="state-signals">
          {turn.signals.slice(0, 2).map((signal) => (
            <small key={signal}>{signal}</small>
          ))}
        </span>
      </div>
      <span className="sr-only">Turn {index + 1}</span>
    </article>
  );
}

export function LiteReplay({ onReturn }) {
  const [scenarioId, setScenarioId] = useState("gradual-drift");
  const [visibleCount, setVisibleCount] = useState(0);
  const scenario = REPLAY_SCENARIOS[scenarioId];
  const visibleTurns = useMemo(
    () => scenario.turns.slice(0, visibleCount),
    [scenario.turns, visibleCount],
  );
  const isComplete = visibleCount === scenario.turns.length;

  useEffect(() => {
    if (!visibleCount) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [scenarioId, visibleCount]);

  return (
    <main className="replay-app">
      <button className="replay-return" type="button" onClick={onReturn}>
        <ArrowLeft size={16} weight="bold" />
        Return to ledger
      </button>

      <header className="replay-header">
        <h1>Emile</h1>
        <p>Reads the shift, not the message.</p>
      </header>

      <section
        className="conversation"
        aria-live="polite"
        aria-label="Replay conversation"
      >
        <h2>the shape of the conversation</h2>
        {visibleTurns.length ? (
          visibleTurns.map((turn, index) => (
            <ReplayTurn
              key={`${scenarioId}-${index}`}
              turn={turn}
              index={index}
            />
          ))
        ) : (
          <p className="conversation-empty">
            Choose a scenario and step through the conversation.
          </p>
        )}
      </section>

      <footer className="replay-footer">
        <div className="replay-controls" aria-label="Replay controls">
          <button
            className="button button--primary"
            type="button"
            onClick={() =>
              setVisibleCount((count) =>
                count < scenario.turns.length ? count + 1 : 0,
              )
            }
          >
            {isComplete ? "Replay" : "Next turn"}
          </button>

          <label className="scenario-picker">
            <span className="sr-only">Scenario</span>
            <select
              value={scenarioId}
              onChange={(event) => {
                setScenarioId(event.target.value);
                setVisibleCount(0);
              }}
            >
              {Object.values(REPLAY_SCENARIOS).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <button
            className="button button--secondary"
            type="button"
            onClick={() => setVisibleCount(0)}
          >
            Reset
          </button>
        </div>

        <div
          className="trajectory"
          aria-label={`${visibleCount} of ${scenario.turns.length} turns replayed`}
        >
          <p>the shape of the conversation</p>
          <div className="trajectory-blocks">
            {scenario.turns.map((turn, index) => (
              <span
                key={`${scenarioId}-trajectory-${index}`}
                className={`trajectory-block ${
                  index < visibleCount
                    ? `trajectory-block--${turn.state}`
                    : ""
                }`}
                aria-hidden="true"
              />
            ))}
          </div>
          <div className="trajectory-numbers" aria-hidden="true">
            {scenario.turns.map((_, index) => (
              <span key={`${scenarioId}-number-${index}`}>{index + 1}</span>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
