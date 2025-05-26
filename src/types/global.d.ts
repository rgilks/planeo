import { useRawEyeEventStore } from "@/stores/rawEyeEventStore";

declare global {
  interface Window {
    __rawEyeEventStore?: typeof useRawEyeEventStore;
  }
}
