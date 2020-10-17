/*
 * Generate binary MIDI data from an array of intermediate MIDI-events.
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

const debug = require('./utl-debug.js')('utl-midi-generatesmf');
const Music = require('./music.js');
const UtilMIDI = require('./utl-midi.js');

/**
 * Convert the given MIDI-events into Standard MIDI Format (SMF) binary data.
 *
 * The output data is the same as you'd find in the MTrk block of a .mid file.
 *
 * If the format being written doesn't support certain events (like SysEx data)
 * simply filter() out those events before calling this function.
 *
 * This function will not write `tempo` events as these can differ between
 * formats (especially those that do not support meta events) so the caller must
 * replace these with another MIDI-event type before calling this function.
 * The UtilMIDI.tempoAsMetaEvent() function can be used for this if the format
 * supports SMF meta event type 0x51 for tempo changes, as found in .mid files.
 *
 * @param {Array} midiEvents
 *   The MIDI-events to process.  UtilMIDI.generateMIDI() will produce an array
 *   in the correct format.
 *
 * @param {object} options
 *   Options that control how the data is produced.
 *
 * @param {boolean} options.useRunningStatus
 *   `true` to use MIDI running status, omitting repeated control bytes.
 *   `false` to always emit full MIDI control bytes.
 *
 * @alias UtilMIDI.generateSMF
 */
function generateSMF(midiEvents, options = { useRunningStatus: true })
{
	let bin = new RecordBuffer(65536);

	let pendingDelay = 0;
	function flushDelay() {
		bin.write(RecordType.int.midi, pendingDelay);
		pendingDelay = 0;
	}

	let lastCommand = 0;
	function writeCommand(cmd, channel) {
		const nextCommand = cmd | channel;
		if (options.useRunningStatus && (nextCommand === lastCommand)) return;
		bin.write(RecordType.int.u8, nextCommand);
		lastCommand = nextCommand;
	}

	for (const mev of midiEvents) {
		switch (mev.type) {

			case 'channelPressure':
				flushDelay();
				writeCommand(0xD0, mev.channel);
				bin.write(RecordType.int.u8, mev.pressure);
				break;

			case 'controller':
				flushDelay();
				writeCommand(0xB0, mev.channel);
				bin.write(RecordType.int.u8, mev.controller);
				bin.write(RecordType.int.u8, mev.value);
				break;

			case 'delay':
				// TODO: If delay is in ticks, and we know how many usPerTick and ticksPerQuarterNote,
				// can we convert this value into ticksPerQuarterNote units?
				pendingDelay += mev.delay;
				break;

			case 'meta':
				flushDelay();
				bin.write(RecordType.int.u8, 0xFF);
				bin.write(RecordType.int.u8, mev.metaType);
				bin.write(RecordType.int.midi, mev.data.length);
				bin.put(mev.data);
				break;

			case 'noteOff': {
				flushDelay();
				let velocity;
				if (options.useRunningStatus && (lastCommand === (0x90 | mev.channel))) {
					// Last command was a note-on, running status is active, so make this
					// a note-on as well to take advantage of running status.
					velocity = 0;
				} else {
					velocity = mev.velocity || 64;
					writeCommand(0x80, mev.channel);
				}
				bin.write(RecordType.int.u8, mev.note);
				bin.write(RecordType.int.u8, velocity);
				break;
			}

			case 'noteOn':
				flushDelay();
				writeCommand(0x90, mev.channel);
				bin.write(RecordType.int.u8, mev.note);
				bin.write(RecordType.int.u8, mev.velocity);
				break;

			case 'notePressure':
				flushDelay();
				writeCommand(0xA0, mev.channel);
				bin.write(RecordType.int.u8, mev.pressure);
				bin.write(RecordType.int.u8, mev.note);
				break;

			case 'patch':
				flushDelay();
				writeCommand(0xC0, mev.channel);
				bin.write(RecordType.int.u8, mev.patch);
				break;

			case 'pitchbend':
				flushDelay();
				writeCommand(0xE0, mev.channel);
				bin.write(RecordType.int.u8, mev.lsb);
				bin.write(RecordType.int.u8, mev.msb);
				break;

			case 'sysex':
				flushDelay();
				writeCommand(0xF0, mev.sysexType);
				bin.write(RecordType.int.midi, mev.data.length);
				bin.put(mev.data);
				break;

			case 'tempo':
				// Since different formats handle tempo changes differently, we require
				// the caller to replace tempo events before passing the event list to
				// us.  For General MIDI formats, UtilMIDI.tempoAsMetaEvent() can do
				// this.
				throw new Error('MIDI "tempo" events must be replaced with a '
					+ 'format-specific event before calling generateSMF(), e.g. with '
					+ 'UtilMIDI.tempoAsMetaEvent().');

			default:
				throw new Error(`MIDI events of type "${mev.type}" not implemented in generateSMF().`);
		}
	}

	return bin.getU8();
}

module.exports = generateSMF;
