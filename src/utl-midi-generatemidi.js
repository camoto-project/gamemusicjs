/*
 * Generate MIDI events from Event instances.
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

const debug = require('./utl-debug.js')('utl-midi-generatemidi');
const Music = require('./music.js');
const UtilMIDI = require('./utl-midi.js');

/**
 * Convert the given events into a set of OPL register values.
 *
 * Each event must have an `idxTrack` property added so we know which track it
 * came from.
 *
 * @alias UtilMIDI.generateMIDI
 */
function generateMIDI(events, patches, trackConfig)
{
	if (!trackConfig) {
		throw new Error('Missing trackConfig parameter.');
	}
	let warnings = [];

	let lastNote; // last note played
	let lastPatch = 0; // last MIDI instrument set

	let midiEvents = [];
	for (const ev of events) {
		switch (ev.type) {

			case Music.ConfigurationEvent:
				switch (ev.option) {
					default: {
						const name = ConfigurationEvent.optionNameToString(ev.option);
						warnings.push(`ConfigurationEvent option ${name} not implemented `
							+ `in generateOPL().`);
						break;
					}
				}
				break;

			case Music.DelayEvent:
				midiEvents.push({
					type: 'delay',
					delay: ev.ticks,
				});
				break;

			case Music.EffectEvent:
				if (ev.pitchbend !== undefined) {
					midiEvents.push({
						type: 'pitchbend',
						pitchbend: 8192 + Math.round(ev.pitchbend * 8192), // 0..16383
						channel: trackConfig.channelIndex,
					});
				}
				if (ev.volume !== undefined) {
					midiEvents.push({
						type: 'channelPressure',
						pressure: Math.round(ev.volume * 127),
						channel: trackConfig.channelIndex,
					});
				}
				break;

			case Music.NoteOnEvent: {
				const midiPatch = patches[ev.instrument].midiPatch;
				if (lastPatch != midiPatch) {
					// instrument is different
					midiEvents.push({
						type: 'patch',
						patch: midiPatch,
						channel: trackConfig.channelIndex,
					});
					lastPatch = midiPatch;
				}

				lastNote = Math.floor(UtilMIDI.frequencyToMIDI(ev.frequency)); // TODO: handle pitchbend
				midiEvents.push({
					type: 'noteOn',
					note: lastNote,
					velocity: ev.velocity * 127,
					channel: trackConfig.channelIndex,
				});
				break;
			}

			case Music.NoteOffEvent:
				midiEvents.push({
					type: 'noteOff',
					note: lastNote,
					velocity: 64,
					channel: trackConfig.channelIndex,
				});
				break;

			case Music.TempoEvent:
				midiEvents.push({
					type: 'tempo',
					tempo: ev,
				});
				break;

			default:
				throw new Error(`Events of type ${ev.type} not implemented in generateMIDI().`);
		}
	}

	return { midiEvents, warnings };
}

module.exports = generateMIDI;
