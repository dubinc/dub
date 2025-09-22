import NoLogoIcon from "../../icons/no-logo.svg";
import CardPreview from "../../icons/frames/card-preview.svg";
import Card from "../../icons/frames/card.svg";
import CardFirstPreview from "../../icons/frames/card-1-preview.svg";
import CardFirst from "../../icons/frames/card-1.svg";
import CardSecondPreview from "../../icons/frames/card-2-preview.svg";
import CardSecond from "../../icons/frames/card-2.svg";
import CardThirdPreview from "../../icons/frames/card-3-preview.svg";
import CardThird from "../../icons/frames/card-3.svg";
import WreathPreview from "../../icons/frames/wreath-preview.svg";
import Wreath from "../../icons/frames/wreath.svg";
import EnvelopePreview from "../../icons/frames/envelope-preview.svg";
import Envelope from "../../icons/frames/envelope.svg";
import WaitressPreview from "../../icons/frames/waitress-preview.svg";
import Waitress from "../../icons/frames/waitress.svg";
import CoffeeCupPreview from "../../icons/frames/coffee-cup-preview.svg";
import CoffeeCup from "../../icons/frames/coffee-cup.svg";
import ScooterPreview from "../../icons/frames/scooter-preview.svg";
import Scooter from "../../icons/frames/scooter.svg";
import ClipboardFramePreview from "../../icons/frames/clipboard-preview.svg";
import ClipboardFrame from "../../icons/frames/clipboard.svg";

import { StyleOption } from "../../types/customization";
import { BLACK_COLOR, WHITE_COLOR } from "./colors";
import { embedQRIntoFrame } from "../../helpers/frame-helpers";

export const FRAME_TEXT = "Scan Me!";

export const FRAMES: StyleOption[] = [
  {
    id: "frame-none",
    type: "none",
    icon: NoLogoIcon,
  },
  {
    id: "frame-card",
    type: "card",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, Card, 0.75, 50, 5);
    },
    icon: CardPreview,
  },
  {
    id: "frame-card-1",
    type: "card-1",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, CardFirst, 0.75, 50, 5);
    },
    icon: CardFirstPreview,
  },
  {
    id: "frame-card-2",
    type: "card-2",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, CardSecond, 0.739, 52, 7);
    },
    icon: CardSecondPreview,
    defaultTextColor: BLACK_COLOR,
  },
  {
    id: "frame-card-3",
    type: "card-3",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, CardThird, 0.723, 57, 10);
    },
    icon: CardThirdPreview,
    defaultTextColor: BLACK_COLOR,
  },
  {
    id: "frame-wreath",
    type: "wreath",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, Wreath, 0.65, 81, 40);
    },
    icon: WreathPreview,
  },
  {
    id: "frame-envelope",
    type: "envelope",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, Envelope, 0.52, 138, 25);
    },
    icon: EnvelopePreview,
    defaultTextColor: BLACK_COLOR,
  },
  {
    id: "frame-waitress",
    type: "waitress",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, Waitress, 0.51, 150, 75);
    },
    icon: WaitressPreview,
    defaultTextColor: BLACK_COLOR,
  },
  {
    id: "frame-coffee-cup",
    type: "coffee-cup",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, CoffeeCup, 0.517, 121, 130);
    },
    icon: CoffeeCupPreview,
    defaultTextColor: BLACK_COLOR,
  },
  {
    id: "frame-scooter",
    type: "scooter",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, Scooter, 0.457, 43, 48);
    },
    icon: ScooterPreview,
  },
  {
    id: "frame-clipboard",
    type: "clipboard",
    extension: async (qr, options) => {
      await embedQRIntoFrame(qr, options, ClipboardFrame, 0.72, 60, 55);
    },
    icon: ClipboardFramePreview,
  },
];

export const isDefaultTextColor = (color: string): boolean => {
  return color === WHITE_COLOR || color === BLACK_COLOR;
};