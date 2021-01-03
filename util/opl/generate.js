/*
 * Generate OPL register/value pairs from Event instances.
 *
 * Copyright (C) 2010-2021 Adam Nielsen <malvineous@shikadi.net>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import Debug from '../debug.js';
const debug = Debug.extend('util:opl:generate');

import { ChannelType } from '../../interface/music/track-configuration.js';
import { Events } from '../../index.js';
import UtilOPL from './index.js';

/**
 * Work out which OPL registers have changed since the last event and add them
 * to the array.
 *
 * @private
 */
function writeOPLChanges(oplData, oplStatePrev, oplState)
{
	for (let reg = 0; reg < 512; reg++) {
		if (oplState[reg] != oplStatePrev[reg]) {
			// This register has changed
			oplData.push({
				reg: reg,
				val: oplState[reg],
			});
		}
	}
}

/**
 * Convert channel 0, 1, 2, 9, 10, 11 => 4OP bits 0..5 for reg 0x104.
 */
function op4bit(ch) {
	return Math.floor(ch / 9) * 2 + (ch % 3);
}

/**
 * Convert the given events into a set of OPL register values.
 *
 * Each event must have an `idxTrack` property added so we know which track it
 * came from.
 *
 * @alias UtilOPL.generateOPL
 */
export default function generateOPL(events, patches, trackConfig)
{
	const debug = Debug.extend('generateOPL');

	if (!trackConfig) {
		throw new Error('Missing trackConfig parameter.');
	}
	let warnings = [];

	let countUnsupportedChannel = 0;
	let countClipFreq = 0;

	// * 2 for two chips (OPL3)
	let oplState = new Array(256 * 2).fill(0);
	let oplStatePrev = new Array(256 * 2).fill(0);

	let oplData = [];
	for (const ev of events) {

		if ((ev.custom.idxTrack === undefined) && (ev.type !== Events.Delay)) {
			debug('Encountered an event without an `idxTrack` property:', ev);
			throw new Error('Encountered an event without an `idxTrack` property.');
		}

		if (ev.custom.idxTrack >= trackConfig.length) {
			debug(`Encountered an event from track ${ev.custom.idxTrack} but the last track index from trackConfig is ${trackConfig.length}`);
			throw new Error('Encountered an event with an out of range `idxTrack` property.');
		}
		const trackCfg = trackConfig[ev.custom.idxTrack || 0]; // 0 for DelayEvents

		switch (ev.type) {

			case Events.Configuration:
				switch (ev.option) {

					case Events.Configuration.Option.EnableOPL3:
						if (ev.value) {
							oplState[0x105] |= 0x01;
						} else {
							oplState[0x105] &= ~0x01;
						}
						break;

					case Events.Configuration.Option.EnableDeepTremolo:
						if (ev.value) {
							oplState[0xBD] |= 0x80;
						} else {
							oplState[0xBD] &= ~0x80;
						}
						break;

					case Events.Configuration.Option.EnableDeepVibrato:
						if (ev.value) {
							oplState[0xBD] |= 0x40;
						} else {
							oplState[0xBD] &= ~0x40;
						}
						break;

					case Events.Configuration.Option.EnableRhythm:
						if (ev.value) {
							oplState[0xBD] |= 0x20;
						} else {
							oplState[0xBD] &= ~0x20;
						}
						break;

					case Events.Configuration.Option.EnableWaveSel:
						if (ev.value) {
							oplState[0x01] |= 0x20;
						} else {
							oplState[0x01] &= ~0x20;
						}
						break;

					default:
						warnings.push(`ConfigurationEvent option ${Events.Configuration.optionNameToString(ev.option)} not implemented in generateOPL().`);
						break;
				}
				break;

			case Events.Delay: {
				// Write all the changed OPL data followed by this delay.
				writeOPLChanges(oplData, oplStatePrev, oplState);
				oplStatePrev = oplState.slice();

				// If the last OPL data was for a delay, then instead of adding a
				// second delay now, just extend the last one.
				let lastElement = oplData[oplData.length - 1];
				if (lastElement && lastElement.delay) {
					lastElement.delay += ev.ticks;
				} else {
					// More events were added so add a new delay.
					oplData.push({
						delay: ev.ticks,
					});
				}
				break;
			}

			case Events.NoteOn: {
				// Figure out which OPL channel and slots we'll be using.
				let slots, targetChannel;
				switch (trackCfg.channelType) {

					case ChannelType.OPLR: // Rhythm
						switch (trackCfg.channelIndex) {
							case UtilOPL.Rhythm.HH:
								targetChannel = 7;
								slots = [0]; // load op0 into op0
								break;

							case UtilOPL.Rhythm.TT:
								targetChannel = 8;
								slots = [0]; // load op0 into op0
								break;

							case UtilOPL.Rhythm.SD:
								targetChannel = 7;
								slots = [1]; // load op0 into op1
								break;

							case UtilOPL.Rhythm.CY:
								targetChannel = 8;
								slots = [1]; // load op0 into op1
								break;

							case UtilOPL.Rhythm.BD: // fall through
							default:
								// Two operator, load as for 2op melodic
								targetChannel = 6;
								slots = [0, 1];
								break;
						}
						// Enable rhythm mode (no effect if already set).
						oplState[0xBD] |= 0x20;
						break;

					case ChannelType.OPLT: // Two op
						targetChannel = trackCfg.channelIndex;
						slots = [0, 1];

						// Clear channel 4-op mode (this won't generate any output events if
						// it's already unset).
						oplState[0x104] &= ~(1 << op4bit(trackCfg.channelIndex));

						if ((trackCfg.channelIndex >= 6) && (trackCfg.channelIndex <= 8)) {
							// Clear rhythm mode (no effect if already unset).
							oplState[0xBD] &= ~0x20;
						}
						break;

					case ChannelType.OPLF: // Four op
						targetChannel = trackCfg.channelIndex;
						slots = [0, 1, 2, 3];

						// Set channel to 4-op mode (this won't generate any output events if
						// it's already set).
						if (((trackCfg.channelIndex >= 3) && (trackCfg.channelIndex <= 5)) || (trackCfg.channelIndex > 11)) {
							throw new Error(`Invalid channel index ${trackCfg.channelIndex} for OPLF channel type.`);
						}

						oplState[0x104] |= 1 << op4bit(trackCfg.channelIndex);

						if ((trackCfg.channelIndex >= 6) && (trackCfg.channelIndex <= 8)) {
							// Clear rhythm mode (no effect if already unset).
							oplState[0xBD] &= ~0x20;
						}
						break;

					default:
						// Ignore other track types.  We're not adding a message here,
						// because formats that use multiple synth types will call us and
						// expect us to ignore non-OPL tracks.
						// The UI is expected to pick this up from the format capability
						// list and warn the user prior to saving.
						return;
				}

				const chipOffset = 0x100 * Math.floor(targetChannel / 9);
				const chipChannel = targetChannel % 9;
				const regOffset = chipOffset + chipChannel;

				const curBlock = (oplState[UtilOPL.BASE_KEYON_FREQ + regOffset] >> 2) & 0x7;
				const targetFnum = UtilOPL.frequencyToFnum(ev.frequency, curBlock);
				if (targetFnum.clip) {
					if (countClipFreq < 5) {
						warnings.push(`Frequency ${ev.frequency} Hz out of range, clipped to max 6208.431 Hz.`);
					} else if (countClipFreq === 5) {
						warnings.push(`Too many notes with frequencies out-of-range high, not including any more messages for these.`);
					}
					countClipFreq++;
				}
				// Program instrument
				let patch = patches[ev.instrument];
				if (!patch) {
					warnings.push(`Tried to play notes with instrument #${ev.instrument}, which doesn't exist, using instrument #0.`);
					patch = patches[0];
				}
				if (patch) {
					UtilOPL.setPatch(oplState, targetChannel, slots, patches[ev.instrument]);
				}

				// Set frequency
				oplState[0xA0 + regOffset] = targetFnum.fnum & 0xFF;
				oplState[0xB0 + regOffset] &= ~0x1F;
				oplState[0xB0 + regOffset] |= (targetFnum.block << 2) | (targetFnum.fnum >> 8);
				if (trackCfg.channelType === ChannelType.OPLR) {
					// Enable rhythm mode bit
					oplState[0xBD] |= 1 << (trackCfg.channelIndex - 1);
				} else { // 2op / 4op
					const reg = UtilOPL.BASE_KEYON_FREQ + regOffset;
					const curKeyOn = !!(oplState[reg] & 0x20);
					const prevKeyOn = !!(oplStatePrev[reg] & 0x20);
					if (!curKeyOn && prevKeyOn) {
						// Current state is keyoff, but previous state is keyon, if we set
						// keyon again we'll overwrite the keyoff and end up continuing the
						// previous note instead of starting a new one.  So to avoid this,
						// do a mini-flush now and write the keyoff event.
						oplData.push({
							reg: reg,
							val: oplState[reg],
						});
						oplStatePrev[reg] = oplState[reg]; // mark as processed
					}
					// Enable keyon bit
					oplState[reg] |= 0x20;
				}
				break;
			}

			case Events.NoteOff: {
				if (trackCfg.channelType === ChannelType.OPLR) {
					// Disable rhythm mode bit
					oplState[0xBD] &= ~(1 << (trackCfg.channelIndex - 1));
				} else { // 2op / 4op
					const chipOffset = 0x100 * Math.floor(trackCfg.channelIndex / 9);
					const chipChannel = trackCfg.channelIndex % 9;
					oplState[chipOffset + 0xB0 + chipChannel] &= ~0x20;
				}
				break;
			}

			case Events.Tempo:
				oplData.push({
					tempo: ev,
				});
				break;

			default:
				throw new Error(`Events of type ${ev.type} not implemented in generateOPL().`);
		}
	}
	// In case there were events with no final delay, do one final reg write.
	writeOPLChanges(oplData, oplStatePrev, oplState);

	if (countUnsupportedChannel) {
		warnings.push(`${countUnsupportedChannel} events were dropped as they were sent to non-OPL channels.`);
	}

	return { oplData, warnings };
}
