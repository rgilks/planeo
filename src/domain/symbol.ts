import { z } from "zod";

export const SymbolInputSchema = z.object({
  key: z.string().min(1),
});

export type SymbolInput = z.infer<typeof SymbolInputSchema>;

export const SYMBOLS =
  "☉☯☢☣☠☮☭☽☾☿♀♁♂♃♄♅♆♇♈♉♊♋♌♍♎♏♐♑♒♓♔♕♖♗♘♙♚♛♜♝♞♟♠♣♥♦♪♫☀☁☂☃☄★☆☇☈☉☊☋☌☍☎☏☑☒☓☚☛☜☝☞☟☠☡☢☣☤☥☦☧☨☩☪☫☬☭☮☯☸☹☺☻☼☽☾☿♀♁♂♃♄♅♆♇".split(
    "",
  );
