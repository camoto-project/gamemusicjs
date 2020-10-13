/*
 * Generate OPL register/value pairs from Event instances.
 *
 * Copyright (C) 2010-2020 Adam Nielsen <malvineous@shikadi.net>
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

const Debug = require('./utl-debug.js')('utl-opl-generate');
const Music = require('./music.js');
const UtilOPL = require('./utl-opl.js');

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
 * Convert the given events into a set of OPL register values.
 *
 * Each event must have an `idxTrack` property added so we know which track it
 * came from.
 */
function generateOPL(events, trackConfig, outMessages)
{
	const debug = Debug.extend('generateOPL');

	if (!trackConfig) {
		throw new Error('Missing trackConfig parameter.');
	}
	if (!outMessages) outMessages = [];

	let countUnsupportedChannel = 0;
	let countClipFreq = 0;

	// TODO: Share between UtilOPL.getChannelSettings()?
	const BASE_KEYON_FREQ = 0xB0;

	let oplData = [];
	let oplState = [], oplStatePrev = [];
	for (const ev of events) {

		if ((ev.custom.idxTrack === undefined) && (ev.type !== Music.DelayEvent)) {
			debug('Encountered an event without an `idxTrack` property:', ev);
			throw new Error('Encountered an event without an `idxTrack` property.');
		}

		if (ev.custom.idxTrack >= trackConfig.length) {
			debug(`Encountered an event from track ${ev.custom.idxTrack} but the last track index from trackConfig is ${trackConfig.length}`);
			throw new Error('Encountered an event with an out of range `idxTrack` property.');
		}
		const trackCfg = trackConfig[ev.custom.idxTrack || 0]; // 0 for DelayEvents

		let channel;
		switch (trackCfg.channelType) {
			// Process these events
			case Music.ChannelType.Any:
			case Music.ChannelType.OPL:
				channel = trackCfg.channelIndex;
				break;
			case Music.ChannelType.OPLPerc:
				const map = [7, 8, 8, 7, 6]; // 0=HH .. 4=BD
				channel = map[trackCfg.channelIndex] || 0;
				break;

			default:
				// Skip events that are for a channel type we don't have.
				countUnsupportedChannel++;
				continue;
		}

		// TODO: Perc
		const chipOffset = 0x100 * (channel / 9 >>> 0);
		const chipChannel = channel % 9;
		const regOffset = chipOffset + chipChannel;

		switch (ev.type) {

			case Music.ConfigurationEvent:
				switch (ev.option) {

					case Music.ConfigurationEvent.Option.EnableWaveSel:
						if (ev.value) {
							oplState[0x01] |= 0x20;
						} else {
							oplState[0x01] &= ~0x20;
						}
						break;

					case Music.ConfigurationEvent.Option.EnableOPL3:
						if (ev.value) {
							oplState[0x105] |= 0x01;
						} else {
							oplState[0x105] &= ~0x01;
						}
						break;

					default:
						throw new Error(`ConfigurationEvent option ${ev.option} not implemented in eventsToOPL()`);
				}
				break;

			case Music.DelayEvent:
				// Write all the changed OPL data followed by this delay.
				const oplDataBefore = oplData.length;
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

			case Music.NoteOnEvent:
				// TODO: program instrument, handle perc
				const curBlock = (oplState[BASE_KEYON_FREQ + regOffset] >> 2) & 0x7;
				const targetFnum = UtilOPL.frequencyToFnum(ev.frequency, curBlock);
				if (targetFnum.clip) {
					if (countClipFreq < 5) {
						outMessages.push(`Frequency ${ev.frequency} Hz out of range, clipped to max 6208.431 Hz.`);
					} else if (countClipFreq === 5) {
						outMessages.push(`Too many notes with frequencies out-of-range high, not including any more messages for these.`);
					}
					countClipFreq++;
				}
				// Set frequency
				oplState[0xA0 + regOffset] = targetFnum.fnum & 0xFF;
				oplState[0xB0 + regOffset] &= ~0x1F;
				oplState[0xB0 + regOffset] |= (targetFnum.block << 2) | (targetFnum.fnum >> 8);
				if (trackCfg.channelType === Music.ChannelType.OPLPerc) {
					// Enable rhythm mode bit
					oplState[0xBD] |= 1 << trackCfg.channelIndex;
				} else {
					const reg = BASE_KEYON_FREQ + regOffset;
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

			case Music.NoteOffEvent:
				// TODO: handle perc
				oplState[0xB0 | trackCfg.channelIndex] &= ~0x20;
				break;

			case Music.TempoEvent:
				oplData.push({
					tempo: ev,
				});
				break;

			default:
				throw new Error(`Events of type ${ev.type} not implemented in eventsToOPL()`);
		}
	}
	// In case there were events with no final delay, do one final reg write.
	writeOPLChanges(oplData, oplStatePrev, oplState);

	if (countUnsupportedChannel) {
		outMessages.push(`${countUnsupportedChannel} events were dropped as they were sent to non-OPL channels.`);
	}

	return oplData;
}

module.exports = generateOPL;
