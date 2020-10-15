/*
 * Parse OPL register/value pairs and convert to Event instances.
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

const Debug = require('./utl-debug.js')('utl-opl-parse');
const Music = require('./music.js');
const UtilOPL = require('./utl-opl.js');

/**
 * Examine the changed OPL data and produce events describing it.
 *
 * Postconditions: `oplPrevState` is updated with the values that have been
 *   actioned.  Some values won't be copied across, such as instrument
 *   settings if they are applied to a channel that is not being played.
 *   When the note is eventually played on the channel, that's when the
 *   instrument settings will be examined, actioned, and copied into
 *   `oplPrevState`.
 */
function appendOPLEvents(patches, events, oplState, oplStatePrev, hasKeyOn)
{
	const debug = Debug.extend('appendOPLEvents')

	let oplDiff = [];
	for (let i = 0; i < oplState.length; i++) {
		// By XOR'ing the values we'll end up with only the bits within each
		// byte that have changed.  If the value is 0, it means the register
		// hasn't been changed.
		oplDiff[i] = (oplStatePrev[i] || 0) ^ (oplState[i] || 0);
	}

	if (oplDiff[0x01]) {
		if (oplDiff[0x01] & 0x20) { // Wavesel mode changed
			events.push(new Music.ConfigurationEvent({
				option: Music.ConfigurationEvent.Option.EnableWaveSel,
				value: !!(oplState[0x01] & 0x20),
			}));
		}

		// Mark register as processed.
		oplStatePrev[0x01] = oplState[0x01];
	}

	if (oplDiff[0x105]) {
		if (oplDiff[0x105] & 0x01) { // OPL3 mode changed
			events.push(new Music.ConfigurationEvent({
				option: Music.ConfigurationEvent.Option.EnableOPL3,
				value: !!(oplState[0x105] & 0x01),
			}));
		}

		// Mark register as processed.
		oplStatePrev[0x105] = oplState[0x105];
	}

	if (oplDiff[0xBD]) {
		// We are assuming these values are set globally for the whole chip, even on
		// an OPL3 where the register only exists for the lower registers.
		// @todo Confirm this applies to all 18 channels and not just the lower 9.
		if (oplDiff[0xBD] & 0x80) { // tremolo mode changed
			events.push(new Music.ConfigurationEvent({
				option: Music.ConfigurationEvent.Option.EnableDeepTremolo,
				value: !!(oplState[0xBD] & 0x80),
			}));
		}

		if (oplDiff[0xBD] & 0x40) { // vibrato mode changed
			events.push(new Music.ConfigurationEvent({
				option: Music.ConfigurationEvent.Option.EnableDeepVibrato,
				value: !!(oplState[0xBD] & 0x40),
			}));
		}

		if (oplDiff[0xBD] & 0x20) { // rhythm mode changed
			events.push(new Music.ConfigurationEvent({
				option: Music.ConfigurationEvent.Option.EnableRhythm,
				value: !!(oplState[0xBD] & 0x20),
			}));
		}

		// Mark just these bits as processed, so the other bits can be handled
		// later in the percussive note-on handler.
		const mask = 0x80 + 0x40 + 0x20;
		oplStatePrev[0xBD] &= mask;
		oplStatePrev[0xBD] |= oplState[0xBD] & mask;
	}

	function calcCustom(channel, rhythm, slots) {
		if (rhythm > 0) {
			return {
				oplChannelType: Music.ChannelType.OPLR,
				oplChannelIndex: rhythm,
			};
		}
		if (slots[3] >= 0) { // 4op
			return {
				oplChannelType: Music.ChannelType.OPLF,
				oplChannelIndex: channel,
			};
		}
		return {
			oplChannelType: Music.ChannelType.OPLT,
			oplChannelIndex: channel,
		};
	}

	// Handle new note on events (not notes currently playing)
	const checkForNote = (channel, slots, rhythm) => {
		// If the channel is >= 8, set chipOffset to 0x100, otherwise use 0.
		const chipOffset = 0x100 * (channel / 9 >>> 0);
		const chipChannel = channel % 9;

		const rhythmBit = 1 << (rhythm - 1);
		// If this is a rhythm instrument, use its keyon bit, otherwise use the
		// normal channel keyon bit.
		const keyOnChange = !!(rhythm
			? oplDiff[0xBD] & rhythmBit // 0xBD is in lower register set only
			: oplDiff[chipChannel + 0xB0 + chipOffset] & 0x20);

		const keyOn = !!(rhythm
			? oplState[0xBD] & rhythmBit
			: oplState[chipOffset + 0xB0 + chipChannel] & 0x20);

		// True if a keyoff was followed by a keyon without any delay in between.
		const thisHasKeyOn = (rhythm === 0) ? hasKeyOn.melodic[channel] : hasKeyOn.rhythm[rhythm];
		const keyOnImmediate = !!(keyOn && thisHasKeyOn && !keyOnChange);

		// Ignore this channel if the note hasn't changed (was already playing or
		// already off).
		if (!keyOnChange && !keyOnImmediate) return;

		// Mark register as processed.
		const setPrevState = () => {
			if (!rhythm) {
				for (const i of [0xB0]) {
					const offset = chipOffset + i + chipChannel;
					oplStatePrev[offset] = oplState[offset];
				}
			} else {
				// Mark rhythm-mode keyon bit as processed
				oplStatePrev[0xBD] &= ~rhythmBit;
				oplStatePrev[0xBD] |= oplState[0xBD] & rhythmBit;
			}
		};

		if (!keyOn || keyOnImmediate) {
			// Note was just switched off
			let ev = new Music.NoteOffEvent();
			ev.custom = calcCustom(channel, rhythm, slots);
			events.push(ev);

			if (!keyOn) {
				// Note is off but wasn't switched back on again
				setPrevState(); // mark registers as processed
				return;
			}
		}

		// Compare active patch  to known ones, add if not.
		const channelSettings = UtilOPL.getChannelSettings(oplState, channel, slots);
		// Mark frequency registers as processed.
		oplStatePrev[chipOffset + 0xB0 + chipChannel] &= ~0x1F;
		oplStatePrev[chipOffset + 0xB0 + chipChannel] |= oplState[chipOffset + 0xB0 + chipChannel] & 0x1F;

		let patch = channelSettings.patch;
		const idxInstrument = UtilOPL.findAddPatch(patches, patch);

		const freq = UtilOPL.fnumToFrequency(channelSettings.fnum, channelSettings.block, 49716);

		const outputSlot = channelSettings.patch.slot[1] || channelSettings.patch.slot[0];
		const outputLevel = outputSlot.outputLevel || 0;

		let ev = new Music.NoteOnEvent({
			frequency: freq,
			velocity: UtilOPL.log_volume_to_lin_velocity(63 - outputLevel, 63),
			instrument: idxInstrument,
		});
		ev.custom = calcCustom(channel, rhythm, slots);
		events.push(ev);
		setPrevState(); // mark registers as processed
	}

	const rhythmOn = !!(oplState[0xBD] & 0x20);

	// Check if any channels are in four-operator mode.
	let op4 = [];
	op4[0] = !!(oplState[0x104] & 0x01);
	op4[1] = !!(oplState[0x104] & 0x02);
	op4[2] = !!(oplState[0x104] & 0x04);
	op4[9] = !!(oplState[0x104] & 0x08);
	op4[10] = !!(oplState[0x104] & 0x10);
	op4[11] = !!(oplState[0x104] & 0x20);

	for (let c = 0; c < 18; c++) {
		if (op4[c]) {
			checkForNote(c, [ 0,  1,  2,  3], UtilOPL.Rhythm.NO); // 4op
		} else if ((c === 6) && rhythmOn) {
			checkForNote(c, [ 0,  1, -1, -1], UtilOPL.Rhythm.BD); // BD: ch6 slot0+1 = op12+15
		} else if ((c === 7) && rhythmOn) {
			checkForNote(c, [ 0, -1, -1, -1], UtilOPL.Rhythm.HH); // HH: ch7 slot0 = op13
			checkForNote(c, [-1,  0, -1, -1], UtilOPL.Rhythm.SD); // SD: ch7 slot1 = op16
		} else if ((c === 8) && rhythmOn) {
			checkForNote(c, [ 0, -1, -1, -1], UtilOPL.Rhythm.TT); // TT: ch8 slot0 = op14
			checkForNote(c, [-1,  0, -1, -1], UtilOPL.Rhythm.CY); // CY: ch8 slot1 = op17
		} else {
			checkForNote(c, [ 0,  1, -1, -1], UtilOPL.Rhythm.NO); // 2op
		}
	}
}

/**
 * Convert an array of OPL register/value pairs into events.
 *
 * This works by storing all the register writes until we reach an audible
 * state (i.e. a delay event with notes playing) whereupon the current OPL
 * state is converted into Event instances, depending on what has changed
 * since the previous Events.
 *
 * @param {Array} oplData
 *   Array of objects, each of which is one of:
 *     - { delay: 123 }  // number of ticks to wait
 *     - { reg: 123, val: 123 }
 *     - { tempo: TempoEvent}   // TempoEvent instance
 *   Do not specify the delay in the same object as the reg/val items, as this
 *   is ambiguous and doesn't indicate whether the delay should happen before
 *   or after the reg/val pair.
 *
 * @param {Music.TempoEvent} initialTempoEvent
 *   Starting tempo of the song.
 *
 * @return {Object} `{events: [], patches: []}` where Events is a list of
 *   `Event` instances and `patches` is a list of instruments as `Patch`
 *   instances.
 */
function parseOPL(oplData, initialTempoEvent)
{
	const debug = Debug.extend('parseOPL');

	let events = [], patches = [];

	if (!initialTempoEvent || initialTempoEvent.type !== Music.TempoEvent) {
		throw new Error('parseOPL(): initialTempoEvent must be a TempoEvent.');
	}
	events.push(initialTempoEvent);

	// * 2 for two chips (OPL3)
	let oplState = new Array(256 * 2).fill(0);
	let oplStatePrev = new Array(256 * 2).fill(0);

	let hasKeyOn = {
		melodic: [], // 0..17
		rhythm: [],  // index is UtilOPL.Rhythm.*
	};
	for (const evOPL of oplData) {
		// If there's a register value then there's no delay, so just accumulate
		// all the register values for later.  This may overwrite some earlier
		// events, which is fine because with no delays those events wouldn't be
		// audible anyway.
		if (evOPL.reg !== undefined) {
			if (evOPL.delay) {
				throw new Error('Cannot specify both reg/val and delay in same event.');
			}
			if (evOPL.tempo) {
				throw new Error('Cannot specify both reg/val and tempo in same event.');
			}
			if ((evOPL.reg & 0xB0) === 0xB0) { // also 1B0
				// This could be a keyon/off
				if (evOPL.reg == 0xBD) { // rhythm
					for (let r = 1; r < 6; r++) {
						const rhythmBit = 1 << (r - 1);
						const prevKeyOn = !!(oplState[0xBD] & rhythmBit);
						const keyOn = !!(evOPL.val & rhythmBit);
						if (!prevKeyOn && keyOn) {
							// We've had a keyoff followed now by a keyon, so flag it.
							hasKeyOn.rhythm[r] = true;
						}
					}
				} else { // melodic
					const prevKeyOn = !!(oplState[evOPL.reg] & 0x20);
					const keyOn = !!(evOPL.val & 0x20);
					if (!prevKeyOn && keyOn) {
						// We've had a keyoff followed now by a keyon, so flag it.
						const chip = evOPL.reg >> 8;
						const channel = (chip * 9) + evOPL.reg & 0x0F;
						hasKeyOn.melodic[channel] = true;
					}
				}
			}
			oplState[evOPL.reg] = evOPL.val;
			continue;
		}

		if (evOPL.tempo) {
			if (evOPL.delay) {
				throw new Error('Cannot specify both tempo and delay in same event.');
			}
			if (!(evOPL.tempo instanceof Music.TempoEvent)) {
				throw new Error('Must pass Music.TempoEvent instance when setting tempo.');
			}
			if (events[events.length - 1].type === Music.TempoEvent) {
				// The previous event was a tempo change, replace it.
				events.pop();
			}
			if (evOPL.tempo.type !== Music.TempoEvent) {
				throw new Error('`tempo` property must be a TempoEvent.');
			}
			events.push(evOPL.tempo);
			continue;
		}

		if (evOPL.delay === undefined) {
			debug('Got empty OPL event:', evOPL);
			throw new Error('OPL event has no property of: register, delay, tempo.');
		}

		if (evOPL.delay === 0) {
			// Skip empty delays.
			continue;
		}

		// If we're here, this is a delay event, so figure out what registers
		// have changed and write out those events, followed by the delay.
		appendOPLEvents(patches, events, oplState, oplStatePrev, hasKeyOn);
		hasKeyOn = { // reset back to empty
			melodic: [],
			rhythm: [],
		};

		let lastEvent = events[events.length - 1] || {};
		if (lastEvent.type === Music.DelayEvent) {
			// Previous event was a delay, so nothing has changed since then.  Add
			// our delay onto that to avoid multiple DelayEvents in a row.
			lastEvent.ticks += evOPL.delay;
		} else {
			// Previous event wasn't a delay, so add a new delay.
			events.push(new Music.DelayEvent({ticks: evOPL.delay}));
		}
	}

	// Append any final event if there was no trailing delay.
	appendOPLEvents(patches, events, oplState, oplStatePrev, hasKeyOn);

	return {
		patches: patches,
		events: events,
	};
}

module.exports = parseOPL;
