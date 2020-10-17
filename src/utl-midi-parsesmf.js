/*
 * Parse SMF (Standard MIDI Format) data into intermediate MIDI objects.
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

const { RecordBuffer, RecordType } = require('@malvineous/record-io-buffer');

const debug = require('./utl-debug.js')('utl-midi-parsesmf');
const Music = require('./music.js');
const UtilOPL = require('./utl-opl.js');

/**
 * Convert binary SMF MIDI data into an array of MIDI event objects.
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
 * @param {Array} midiData
 *   Array of objects, each of which is one of:
 *     - { delay: 123 }  // number of ticks to wait
 *     - { command: 123, data: [] }
 *   Do not specify the delay in the same object as the command, as this
 *   is ambiguous and doesn't indicate whether the delay should happen before
 *   or after the command.
 *
 * @return {Object} `{events: [], patches: []}` where Events is a list of
 *   `Event` instances and `patches` is a list of instruments as `Patch`
 *   instances.
 *
 * @alias UtilMIDI.parseSMF
 */
function parseSMF(midiData)
{
	const buffer = new RecordBuffer(midiData);

	let cmdPrev = 0x80;
	let midiEvents = [];
	while (buffer.distFromEnd()) {
		const delay = buffer.read(RecordType.int.midi);
		midiEvents.push({
			type: 'delay',
			delay: delay,
		});
		let cmd = buffer.read(RecordType.int.u8);
		if (cmd < 0x80) {
			// Running status
			cmd = cmdPrev;
			buffer.seekRel(-1);
		} else {
			cmdPrev = cmd;
		}
		const instruction = cmd & 0xF0;
		const channel = cmd & 0x0F;
		cmdPrev = cmd;
		switch (instruction) {
			case 0x80:
				midiEvents.push({
					type: 'noteOff',
					channel: channel,
					note: buffer.read(RecordType.int.u8),
					velocity: buffer.read(RecordType.int.u8),
				});
				break;

			case 0x90: {
				midiEvents.push({
					type: 'noteOn',
					channel: channel,
					note: buffer.read(RecordType.int.u8),
					velocity: buffer.read(RecordType.int.u8),
				});
				break;
			}

			case 0xA0:
				midiEvents.push({
					type: 'notePressure',
					channel: channel,
					pressure: buffer.read(RecordType.int.u8),
					note: buffer.read(RecordType.int.u8),
				});
				break;

			case 0xB0:
				midiEvents.push({
					type: 'controller',
					channel: channel,
					controller: buffer.read(RecordType.int.u8),
					value: buffer.read(RecordType.int.u8),
				});
				break;

			case 0xC0:
				midiEvents.push({
					type: 'patch',
					channel: channel,
					patch: buffer.read(RecordType.int.u8),
				});
				break;

			case 0xD0:
				midiEvents.push({
					type: 'channelPressure',
					channel: channel,
					pressure: buffer.read(RecordType.int.u8),
				});
				break;

			case 0xE0:
				midiEvents.push({
					type: 'pitchbend',
					channel: channel,
					lsb: buffer.read(RecordType.int.u8),
					msb: buffer.read(RecordType.int.u8),
				});
				break;

			case 0xF0: {
				let ev = {};
				if (channel === 0x0F) {
					ev.type = 'meta';
					ev.metaType = buffer.read(RecordType.int.u8);
				} else {
					ev.type = 'sysex';
					ev.sysexType = channel;
				}
				const len = buffer.read(RecordType.int.midi);
				if (len > buffer.distFromEnd()) {
					const remaining = buffer.distFromEnd();
					throw new Error(`Tried to read sysex of ${len} bytes, but only ${remaining} bytes left in track.`);
				}
				if (len) {
					ev.data = buffer.getU8(buffer.getPos(), len);
				} else {
					ev.data = [];
				}
				midiEvents.push(ev);
				buffer.seekRel(len);
				break;
			}
		}
	}
	return midiEvents;
}

module.exports = parseSMF;
