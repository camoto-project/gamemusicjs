/*
 * Standard MIDI format, type-1 (single file, multi track) handler.
 *
 * This file format is fully documented on the ModdingWiki:
 *   http://www.shikadi.net/moddingwiki/MID_Format
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

const assert = require('assert');
const { RecordBuffer, RecordType } = require('@malvineous/record-io-buffer');

const Debug = require('../src/utl-debug.js')('mus-mid-type1');
const Music = require('../src/music.js');
const MusicHandler = require('../src/musicHandler.js');
const UtilMusic = require('../src/utl-music.js');
const UtilMIDI = require('../src/utl-midi.js');

// Length of "MThd" header block.
const MID_MTHD_LEN = 8 + 6;

const MID_DEFAULT_TICKS_PER_QUARTER_NOTE = 48;

const recordTypes = {
	mthd: {
		signature: RecordType.string.fixed.noTerm(4),
		len: RecordType.int.u32be, // length not including signature or len
		type: RecordType.int.u16be,
		trackCount: RecordType.int.u16be,
		ticksPerQuarterNote: RecordType.int.u16be,
	},
	mtrk: {
		signature: RecordType.string.fixed.noTerm(4),
		len: RecordType.int.u32be, // length not including signature or len
	},
};

class Music_MID_Type1 extends MusicHandler
{
	static metadata() {
		let md = {
			...super.metadata(),
			id: 'mus-mid-type1',
			title: 'Standard MIDI file (type-1 / multi-track)',
			games: [],
			glob: [
				'*.mid',
			],
			caps: {
				channelMap: [
					{
						name: 'MIDI',
						mappings: [
							{
								name: 'General MIDI (1..16, P10)',
								channels: [
									{
										type: Music.ChannelType.MIDI,
										target: 0,
									}, {
										type: Music.ChannelType.MIDI,
										target: 1,
									}, {
										type: Music.ChannelType.MIDI,
										target: 2,
									}, {
										type: Music.ChannelType.MIDI,
										target: 3,
									}, {
										type: Music.ChannelType.MIDI,
										target: 4,
									}, {
										type: Music.ChannelType.MIDI,
										target: 5,
									}, {
										type: Music.ChannelType.MIDI,
										target: 6,
									}, {
										type: Music.ChannelType.MIDI,
										target: 7,
									}, {
										type: Music.ChannelType.MIDI,
										target: 8,
									}, {
										type: Music.ChannelType.MIDIP,
										target: 9,
									}, {
										type: Music.ChannelType.MIDI,
										target: 10,
									}, {
										type: Music.ChannelType.MIDI,
										target: 11,
									}, {
										type: Music.ChannelType.MIDI,
										target: 12,
									}, {
										type: Music.ChannelType.MIDI,
										target: 13,
									}, {
										type: Music.ChannelType.MIDI,
										target: 14,
									}, {
										type: Music.ChannelType.MIDI,
										target: 15,
									},
								],
							}, {
								name: 'Microsoft Basic MIDI (13..16, P16)',
								channels: [
									{
										type: Music.ChannelType.MIDI,
										target: 12,
									}, {
										type: Music.ChannelType.MIDI,
										target: 13,
									}, {
										type: Music.ChannelType.MIDI,
										target: 14,
									}, {
										type: Music.ChannelType.MIDIP,
										target: 15,
									},
								],
							}, {
								name: 'Microsoft Extended MIDI (1..10, P10)',
								channels: [
									{
										type: Music.ChannelType.MIDI,
										target: 0,
									}, {
										type: Music.ChannelType.MIDI,
										target: 1,
									}, {
										type: Music.ChannelType.MIDI,
										target: 2,
									}, {
										type: Music.ChannelType.MIDI,
										target: 3,
									}, {
										type: Music.ChannelType.MIDI,
										target: 4,
									}, {
										type: Music.ChannelType.MIDI,
										target: 5,
									}, {
										type: Music.ChannelType.MIDI,
										target: 6,
									}, {
										type: Music.ChannelType.MIDI,
										target: 7,
									}, {
										type: Music.ChannelType.MIDI,
										target: 8,
									}, {
										type: Music.ChannelType.MIDIP,
										target: 9,
									},
								],
							},
						],
					},
				],
				tags: {},
				supportedEvents: UtilMIDI.midiSupportedEvents,
			},
		};

		return md;
	}

	static supps() {
		return null;
	}

	static identify(content) {
		// Files must contain at least the signature.
		if (content.length < MID_MTHD_LEN) {
			return {
				valid: false,
				reason: `File too short, ${content.length} bytes isn't enough to `
					+ `read the ${MID_MTHD_LEN}-byte header.`
			};
		}

		let buffer = new RecordBuffer(content);

		const header = buffer.readRecord(recordTypes.mthd);
		if (header.signature !== 'MThd') {
			return {
				valid: false,
				reason: `Signature doesn't match.`,
			};
		}
		if (header.len < 6) {
			return {
				valid: false,
				reason: `Header too short.`,
			};
		}

		if (header.type !== 1) {
			return {
				valid: false,
				reason: `File is type-${header.type}, we only support type-1.`,
			};
		}

		return {
			valid: true,
		};
	}

	static parse(content) {
		const debug = Debug.extend('parse');

		let buffer = new RecordBuffer(content.main);

		if (buffer.length < MID_MTHD_LEN) {
			throw new Error(`File too short, ${buffer.length} bytes isn't enough to `
				+ `read the ${MID_MTHD_LEN}-byte header.`);
		}

		const header = buffer.readRecord(recordTypes.mthd);
		debug(`Format type-${header.type}, reading as type-0/type-1`);

		let music = new Music();
		music.initialTempo.ticksPerQuarterNote = (
			header.ticksPerQuarterNote || MID_DEFAULT_TICKS_PER_QUARTER_NOTE
		);
		music.initialTempo.usPerQuarterNote = 500000; // MIDI default
		music.patterns[0] = new Music.Pattern();

		let idxNextTrack = 0;
		for (let midiTrack = 0; midiTrack < header.trackCount; midiTrack++) {
			const mtrk = buffer.readRecord(recordTypes.mtrk);
			if (mtrk.signature !== 'MTrk') {
				throw new Error(`Missing expected MTrk signature on track ${midiTrack}.`);
			}

			const midiTrackData = buffer.getU8(buffer.getPos(), mtrk.len);
			buffer.seekRel(mtrk.len);

			const midiEvents = UtilMIDI.parseSMF(midiTrackData);
			const { events } = UtilMIDI.parseMIDI(midiEvents, music.patches, music.initialTempo);

			// Split the single long list of events into tracks.
			const fnTrackConfig = ev => UtilMIDI.standardTrackSplitConfig(idxNextTrack, ev);
			const { trackConfig, pattern } = UtilMusic.splitEvents(events, fnTrackConfig);

			// Append the new tracks onto the existing ones.
			idxNextTrack += trackConfig.length;
			music.trackConfig = [
				...music.trackConfig,
				...trackConfig,
			];
			music.patterns[0].tracks = [
				...music.patterns[0].tracks,
				...pattern.tracks,
			];
		}

		// See if there's an initial tempo event.
		UtilMusic.initialEvents(music, ev => {
			if (ev.type === Music.TempoEvent) {
				// Found one, scrap the default tempo and use this instead.
				debug('Found an existing initial tempo event:', ev);
				music.initialTempo = ev;
				return null; // delete the event from the track
			}
			return false; // keep going
		});

		return music;
	}

	static generate(music)
	{
		const debug = Debug.extend('generate');

		// Only need to write an extra tempo event if the usPerQuarterNote value is
		// not the default.
		let outTempo = Math.round(music.initialTempo.usPerQuarterNote) !== 500000;

		if (outTempo) {
			// Find the first tempo event, if one already exists
			UtilMusic.initialEvents(music, ev => {
				if (ev.type === Music.TempoEvent) {
					// There is already an early tempo event, so we don't have to insert
					// one.
					debug('Found an existing tempo event:', ev);
					outTempo = false;
					return true; // done
				}
				return false; // keep going
			});
		}

		// Combine all the patterns into a single long multi-track pattern.
		let pattern = UtilMusic.mergePatterns(music.patterns);
		assert.ok(pattern);

		// Start writing the .mid file to a memory buffer.
		let binMID = new RecordBuffer(65536);

		const mthd = {
			signature: 'MThd',
			len: 6, // length not including signature or len
			type: 1,
			trackCount: music.trackConfig.length,
			ticksPerQuarterNote: music.initialTempo.ticksPerQuarterNote,
		};
		binMID.writeRecord(recordTypes.mthd, mthd);

		let allWarnings = [];

		if (outTempo) {
			debug(`Adding initial tempo event: `
			+ `${music.initialTempo.usPerQuarterNote.toFixed(2)} µs/qn, `
			+ `${music.initialTempo.ticksPerQuarterNote} t/qn, `
			+ `${music.initialTempo.usPerTick.toFixed(2)} µs/t`);
			// There was no initial tempo event, and the song starts with a
			// nonstandard tempo, so set that as an initial event now.
			pattern.tracks[0].events.unshift(music.initialTempo);
		} else {
			debug('Not adding any extra tempo events');
		}

		// Run through each track and write it as an MTrk block to the .mid file.
		for (let idxTrack = 0; idxTrack < pattern.tracks.length; idxTrack++) {
			const track = pattern.tracks[idxTrack];
			const trackCfg = music.trackConfig[idxTrack];

			// Convert the Event objects into intermediate MIDI-event structures.
			// Event objects used by gamemusicjs are very generic, whereas the
			// resulting MIDI-event list closely matches the structure of MIDI data,
			// just as an array of objects rather than binary data.
			let { midiEvents, warnings } = UtilMIDI.generateMIDI(
				track.events,
				music.patches,
				trackCfg
			);
			allWarnings = {
				...allWarnings,
				...warnings,
			};

			// Replace any tempo events with meta events, as that is how tempo changes
			// are represented in .mid files.
			midiEvents = UtilMIDI.tempoAsMetaEvent(midiEvents);

			// Always end a track with the same meta event.
			midiEvents.push({
				type: 'meta',
				metaType: 0x2F,
				data: [],
			});

			// Now convert the array of MIDI-events into actual binary MIDI data that
			// can be written directly to a .mid file.
			const trackContent = UtilMIDI.generateSMF(midiEvents, {
				useRunningStatus: true,
			});

			// Add the MTrk header and write that and the binary data to the file.
			const mtrk = {
				signature: 'MTrk',
				len: trackContent.length, // length not including signature or len
			};
			binMID.writeRecord(recordTypes.mtrk, mtrk);
			binMID.put(trackContent);
		}

		return {
			content: {
				main: binMID.getU8(),
			},
			warnings: allWarnings,
		};
	}
}

module.exports = Music_MID_Type1;
