import { useEyeStore } from "@/hooks/useEyes";
import { useSymbolStore } from "@/stores/symbolStore";

declare global {
  interface Window {
    __symbolStore?: typeof useSymbolStore;
    __eyeStore?: typeof useEyeStore;
  }
}
