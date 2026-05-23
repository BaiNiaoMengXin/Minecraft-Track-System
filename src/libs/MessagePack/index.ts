// Main Functions:

import { encode } from "./encode.js";
export { encode };

import { decode, decodeMulti } from "./decode.js";
export { decode, decodeMulti };

import { decodeAsync, decodeArrayStream, decodeMultiStream } from "./decodeAsync.js";
export { decodeAsync, decodeArrayStream, decodeMultiStream };

import { Decoder } from "./Decoder.js";
export { Decoder };
import type { DecoderOptions } from "./Decoder.js";
export type { DecoderOptions };
import { DecodeError } from "./DecodeError.js";
export { DecodeError };

import { Encoder } from "./Encoder.js";
export { Encoder };
import type { EncoderOptions } from "./Encoder.js";
export type { EncoderOptions };

// Utilities for Extension Types:

import { ExtensionCodec } from "./ExtensionCodec.js";
export { ExtensionCodec };
import type { ExtensionCodecType, ExtensionDecoderType, ExtensionEncoderType } from "./ExtensionCodec.js";
export type { ExtensionCodecType, ExtensionDecoderType, ExtensionEncoderType };
import { ExtData } from "./ExtData.js";
export { ExtData };

import {
  EXT_TIMESTAMP,
  encodeDateToTimeSpec,
  encodeTimeSpecToTimestamp,
  decodeTimestampToTimeSpec,
  encodeTimestampExtension,
  decodeTimestampExtension,
} from "./timestamp.js";
export {
  EXT_TIMESTAMP,
  encodeDateToTimeSpec,
  encodeTimeSpecToTimestamp,
  decodeTimestampToTimeSpec,
  encodeTimestampExtension,
  decodeTimestampExtension,
};
