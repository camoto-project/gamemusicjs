/*
 * Parse MIDI event objects into gamemusicjs Event instances.
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
const debug = Debug.extend('util:midi:parse-midi');

import { RecordBuffer, RecordType } from '@camoto/record-io-buffer';
import * as Events from '../../interface/events/index.js';
import { MIDI as MIDIPatch } from '../../interface/patch/index.js';
import UtilMIDI from './index.js';

// Default patch to use in case none has been set.
const MIDI_DEFAULT_PATCH = 0;

/**
 * Convert an array of MIDI event objects into an array of `Event` instances.
 *
 * Parsing MIDI data is split into two steps.  The first reads the raw bytes
 * and translates them into MIDI events, and the second translates these MIDI
 * events into gamemusicjs `Event` objects.
 *
 * `parseSMF()` handles the first task, reading raw MIDI data in SMF (Standard
 * MIDI Format) and returning an array of MIDI events, which can then be passed
 * to `parseMIDI()` to produce the final `Event` instances.
 *
 * This split allows MIDI file format handlers to be simple as they only need
 * to read the raw MIDI bytes and `parseSMF()` can do the rest.  A non-standard
 * MIDI format parser also only needs to decode the data to standard MIDI
 * events, and not worry about translating them into gamemusicjs `Event`
 * objects.
 *
 * @param {Array} midiEvents
 *   Array of objects, each of which is one of:
 *     - { delay: 123 }  // number of ticks to wait
 *     - { type: '<midi event type>, ... }
 *   Do not specify the delay in the same object as the command, as this
 *   is ambiguous and doesn't indicate whether the delay should happen before
 *   or after the command.
 *   See UtilMIDI.parseSMF() for details on the exact format.
 *
 * @param {Array<Patch>} patches
 *   Array of patches to search for, and append to, as needed.  This allows
 *   the function to be called multiple times (once for each track) and to
 *   append to the patch list as needed.
 *
 * @param {TempoEvent} lastTempo
 *   Last tempo set in the song.  This should be the initial tempo of the song,
 *   which may get replaced during playback.  The caller is still responsible
 *   for adding this to the start of the event list.  This function does not do
 *   that to cater for multi-track MIDI files, where it is undesirable to have
 *   the initial tempo set at the start of every single track.
 *
 * @return {Object} `{events: []}` where Events is a list of
 *   `Event` instances.
 *
 * @alias UtilMIDI.parseMIDI
 */
export default function parseMIDI(midiEvents, patches, lastTempo)
{
	let events = [];

	// Start with all notes on all channels off.
	let tracks = [];
	let midiChannelSettings = [];

	function usePatch(midiPatch) {
		let p = patches.findIndex(p => p.midiPatch === midiPatch);
		if (p < 0) {
			p = patches.push(new MIDIPatch({
				midiBank: 0,
				midiPatch: midiPatch,
			})) - 1;
			debug(`New patch for MIDI ${midiPatch}`);
		}
		return p;
	}

	function forEachChannel(channel, cb) {
		// Figure out what track we put the event on.
		for (let idxTrack = 0; idxTrack < tracks.length; idxTrack++) {
			if (!tracks[idxTrack]) continue;
			if (tracks[idxTrack].channel === channel) {
				if (cb(idxTrack)) break;
			}
		}
	}

	for (const mev of midiEvents) {
		switch (mev.type) {
			case 'delay':
				if (mev.delay > 0) {
					events.push(new Events.Delay({
						ticks: mev.delay,
					}));
				}
				break;

			case 'noteOn':
				if (mev.velocity > 0) {
					if (midiChannelSettings[mev.channel] === undefined) {
						// Playing a note with no patch set
						midiChannelSettings[mev.channel] = usePatch(MIDI_DEFAULT_PATCH);
					}
					const ev = new Events.NoteOn({
						frequency: UtilMIDI.midiToFrequency(mev.note),
						velocity: mev.velocity / 127,
						instrument: midiChannelSettings[mev.channel],
						custom: {
							midiChannelIndex: mev.channel,
						},
					});
					// See if there's an existing track for the channel.
					let found = false;
					for (let t = 0; t < tracks.length; t++) {
						if (!tracks[t]) continue;
						if (
							(tracks[t].channel === mev.channel)
								&& (tracks[t].note === null)
						) {
							// Reuse this previously used track.
							ev.custom.subtrack = t;
							tracks[t].note = mev.note;
							found = true;
							break;
						}
					}
					if (!found) {
						// No free tracks for this channel.
						let newTrack = {
							channel: mev.channel,
							note: mev.note,
						};
						ev.custom.subtrack = tracks.push(newTrack) - 1;
					}
					events.push(ev);
					break;

				} else {
					// Note-on velocity zero is note off, so fall through.
				}
				// eslint-disable-next-line no-fallthrough

			case 'noteOff':
				forEachChannel(mev.channel, idxTrack => {
					if (tracks[idxTrack].note !== mev.note) return false;

					events.push(new Events.NoteOff({
						custom: {
							midiChannelIndex: mev.channel,
							subtrack: idxTrack,
						},
					}));
					tracks[idxTrack].note = null;

					return true;
				});
				break;

			case 'notePressure':
				forEachChannel(mev.channel, idxTrack => {
					if (tracks[idxTrack].note !== mev.note) return false;

					events.push(new Events.Effect({
						volume: mev.pressure / 127,
						custom: {
							midiChannelIndex: mev.channel,
							subtrack: idxTrack,
						},
					}));

					return true;
				});
				break;

			case 'controller':
				// These controller numbers are ignored.
				if ([
					1,  // Modulation MSB
					33, // Modulation LSB
				].includes(mev.controller)) break;

				debug(`TODO: controller ${mev.controller} = ${mev.value}`);
				break;

			case 'patch':
				midiChannelSettings[mev.channel] = usePatch(mev.patch);
				break;

			case 'channelPressure':
				forEachChannel(mev.channel, idxTrack => {
					events.push(new Events.Effect({
						volume: mev.pressure / 127,
						custom: {
							midiChannelIndex: mev.channel,
							subtrack: idxTrack,
						},
					}));
				});
				break;

			case 'pitchbend':
				forEachChannel(mev.channel, idxTrack => {
					events.push(new Events.Effect({
						pitchbend: (mev.pitchbend / 8192) - 1, // -8192..8181
						custom: {
							midiChannelIndex: mev.channel,
							subtrack: idxTrack,
						},
					}));
				});
				break;

			case 'meta':
				switch (mev.metaType) {
					case 0x51: { // set tempo
						let t = lastTempo.clone();
						let data = new RecordBuffer(mev.data);
						const newValue = data.read(RecordType.int.u24be);
						t.usPerQuarterNote = newValue;
						events.push(t);
						lastTempo = t;
						debug(`Tempo change to ${t.usPerQuarterNote} µs/quarter-note (${t.usPerTick} µs/tick)`);
						break;
					}
					case 0x2F: // end of track
						// Nothing needs to be done.
						break;
					default:
						debug(`MIDI meta event 0x${mev.metaType.toString(16)} not implemented yet.`);
						break;
				}
				break;

			case 'sysex':
debug('TODO');
				break;

			default:
				throw new Error(`Unable to process "${mev.type}" MIDI events.`);
		}
	}
	if (tracks.length > 256) {
		throw new Error(`Something went wrong - there shouldn't be more than 256 notes playing simultaneously!`);
	}
	return { events };
}
