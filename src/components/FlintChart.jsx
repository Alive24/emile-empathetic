import { useEffect, useRef, useState } from "react";
import vegaEmbed from "vega-embed";

export function FlintChart({ spec, label, className = "" }) {
  const hostRef = useRef(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!hostRef.current || !spec) {
      return undefined;
    }

    let mounted = true;
    let result;
    let frame;

    const render = () => {
      setStatus("loading");
      vegaEmbed(hostRef.current, spec, {
        actions: false,
        renderer: "svg",
        tooltip: { theme: "light" },
      })
        .then((nextResult) => {
          if (!mounted) {
            nextResult.view.finalize();
            return;
          }
          result = nextResult;
          setStatus("ready");
        })
        .catch(() => {
          if (mounted) {
            setStatus("error");
          }
        });
    };

    frame = requestAnimationFrame(render);

    return () => {
      mounted = false;
      cancelAnimationFrame(frame);
      result?.view?.finalize();
    };
  }, [spec]);

  return (
    <div
      className={`flint-chart ${className}`}
      role="img"
      aria-label={label}
      data-chart-status={status}
    >
      <div ref={hostRef} className="flint-chart__host" aria-hidden="true" />
      {status === "loading" && (
        <span className="chart-status">Compiling Flint chart…</span>
      )}
      {status === "error" && (
        <span className="chart-status chart-status--error">
          Chart unavailable
        </span>
      )}
    </div>
  );
}
