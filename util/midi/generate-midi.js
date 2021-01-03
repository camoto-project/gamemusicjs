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

import Debug from '../debug.js';
const debug = Debug.extend('util:midi:generate-midi');

import { Events } from '../../index.js';
import UtilMIDI from './index.js';

/**
 * Convert the given events into a set of OPL register values.
 *
 * Each event must have an `idxTrack` property added so we know which track it
 * came from.
 *
 * @alias UtilMIDI.generateMIDI
 */
export default function generateMIDI(events, patches, trackConfig)
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

			case Events.Configuration:
				switch (ev.option) {
					default: {
						const name = Events.Configuration.optionNameToString(ev.option);
						warnings.push(`ConfigurationEvent option ${name} not implemented `
							+ `in generateOPL().`);
						break;
					}
				}
				break;

			case Events.Delay:
				midiEvents.push({
					type: 'delay',
					delay: ev.ticks,
				});
				break;

			case Events.Effect:
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

			case Events.NoteOn: {
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

				lastNote = Math.round(UtilMIDI.frequencyToMIDI(ev.frequency)); // TODO: handle pitchbend
				midiEvents.push({
					type: 'noteOn',
					note: lastNote,
					velocity: ev.velocity * 127,
					channel: trackConfig.channelIndex,
				});
				break;
			}

			case Events.NoteOff:
				midiEvents.push({
					type: 'noteOff',
					note: lastNote,
					velocity: 64,
					channel: trackConfig.channelIndex,
				});
				break;

			case Events.Tempo:
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
