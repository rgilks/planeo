import { useEyeStore } from "@/hooks/useEyes";

declare global {
  interface Window {
    __eyeStore?: typeof useEyeStore;
  }
}
