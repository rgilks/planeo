import { SYMBOLS } from "@/domain";
import { useSymbolStore } from "@/stores/symbolStore";

const GREEN = "#00FF41";

const getSymbol = (key: string) => {
  const code = key.codePointAt(0) || 0;
  return SYMBOLS[code % SYMBOLS.length];
};

const SymbolDisplay = () => {
  const lastInput = useSymbolStore((s) => s.lastInput);

  if (!lastInput) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        background: "rgba(0,0,0,0.7)",
        color: GREEN,
        padding: "1rem 2rem",
        borderRadius: 12,
        fontSize: 96,
        fontFamily: "monospace",
        zIndex: 1000,
      }}
    >
      {getSymbol(lastInput.key)}
    </div>
  );
};

export default SymbolDisplay;
