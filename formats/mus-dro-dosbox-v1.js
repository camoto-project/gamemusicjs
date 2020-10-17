/*
 * DOSBox .dro version 1.0 handler.
 *
 * This file format is fully documented on the ModdingWiki:
 *   http://www.shikadi.net/moddingwiki/DRO_Format
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

const Debug = require('../src/utl-debug.js')('mus-imf-idsoftware');
const Music = require('../src/music.js');
const MusicHandler = require('../src/musicHandler.js');
const UtilMusic = require('../src/utl-music.js');
const UtilOPL = require('../src/utl-opl.js');

const recordTypes = {
	header: {
		signature: RecordType.string.fixed.noTerm(8),
		verMajor: RecordType.int.u16le,
		verMinor: RecordType.int.u16le,
	},
	subheader: {
		lenMilliseconds: RecordType.int.u32le,
		lenBytes: RecordType.int.u32le,
		flagHW: RecordType.int.u32le, // u8 in early versions
	},
	tags: {
		title: RecordType.string.variable.reqTerm(256),
		artist: RecordType.string.variable.reqTerm(256),
		comment: RecordType.string.variable.reqTerm(256),
		app: RecordType.string.fixed.reqTerm(9),
	},
};
const DRO_HEADER_LEN = 8 + 2 + 2 + 4 + 4 + 1;

const DRO_SHORT_DELAY = 0x00;
const DRO_LONG_DELAY = 0x01;
const DRO_OPL_LOW = 0x02;
const DRO_OPL_HIGH = 0x03;
const DRO_ESCAPE = 0x04;

class Music_DRO_DOSBox_v1 extends MusicHandler
{
	static metadata() {
		let md = {
			...super.metadata(),
			id: 'mus-dro-dosbox-v1',
			title: 'DOSBox Raw OPL Capture (version 0.1)',
			games: [],
			glob: [
				'*.dro',
			],
			caps: {
				channelMap: [
					{
						name: 'OPL-1/4',
						mappings: [
							{
								name: '2x melodic 2-op',
								channels: [
									{
										type: Music.ChannelType.OPLT,
										target: 0,
									}, {
										type: Music.ChannelType.OPLT,
										target: 3,
									},
								],
							}, {
								name: '1x melodic 4-op',
								channels: [
									{
										type: Music.ChannelType.OPLF,
										target: 0,
									},
								],
							},
						],
					}, {
						name: 'OPL-2/5',
						mappings: [
							{
								name: '2x melodic 2-op',
								channels: [
									{
										type: Music.ChannelType.OPLT,
										target: 1,
									}, {
										type: Music.ChannelType.OPLT,
										target: 4,
									},
								],
							}, {
								name: '1x melodic 4-op',
								channels: [
									{
										type: Music.ChannelType.OPLF,
										target: 1,
									},
								],
							},
						],
					}, {
						name: 'OPL-3/6',
						mappings: [
							{
								name: '2x melodic 2-op',
								channels: [
									{
										type: Music.ChannelType.OPLT,
										target: 2,
									}, {
										type: Music.ChannelType.OPLT,
										target: 5,
									},
								],
							}, {
								name: '1x melodic 4-op',
								channels: [
									{
										type: Music.ChannelType.OPLF,
										target: 2,
									},
								],
							},
						],
					}, {
						name: 'OPL-7/8/9',
						mappings: [
							{
								name: '3x melodic 2-op',
								channels: [
									{
										type: Music.ChannelType.OPLT,
										target: 6,
									}, {
										type: Music.ChannelType.OPLT,
										target: 7,
									}, {
										type: Music.ChannelType.OPLT,
										target: 8,
									},
								],
							}, {
								name: '4x percussion 1-op + 1x percussion 2-op',
								channels: [
									{
										type: Music.ChannelType.OPLR,
										target: UtilOPL.Rhythm.HH,
									}, {
										type: Music.ChannelType.OPLR,
										target: UtilOPL.Rhythm.CY,
									}, {
										type: Music.ChannelType.OPLR,
										target: UtilOPL.Rhythm.TT,
									}, {
										type: Music.ChannelType.OPLR,
										target: UtilOPL.Rhythm.SD,
									}, {
										type: Music.ChannelType.OPLR,
										target: UtilOPL.Rhythm.BD,
									},
								],
							},
						],
					}, {
						name: 'OPL-10/13',
						mappings: [
							{
								name: '2x melodic 2-op',
								channels: [
									{
										type: Music.ChannelType.OPLT,
										target: 9,
									}, {
										type: Music.ChannelType.OPLT,
										target: 12,
									},
								],
							}, {
								name: '1x melodic 4-op',
								channels: [
									{
										type: Music.ChannelType.OPLF,
										target: 9,
									},
								],
							},
						],
					}, {
						name: 'OPL-11/14',
						mappings: [
							{
								name: '2x melodic 2-op',
								channels: [
									{
										type: Music.ChannelType.OPLT,
										target: 10,
									}, {
										type: Music.ChannelType.OPLT,
										target: 13,
									},
								],
							}, {
								name: '1x melodic 4-op',
								channels: [
									{
										type: Music.ChannelType.OPLF,
										target: 10,
									},
								],
							},
						],
					}, {
						name: 'OPL-12/15',
						mappings: [
							{
								name: '2x melodic 2-op',
								channels: [
									{
										type: Music.ChannelType.OPLT,
										target: 11,
									}, {
										type: Music.ChannelType.OPLT,
										target: 14,
									},
								],
							}, {
								name: '1x melodic 4-op',
								channels: [
									{
										type: Music.ChannelType.OPLF,
										target: 11,
									},
								],
							},
						],
					}, {
						name: 'OPL-16/17/18',
						mappings: [
							{
								name: '3x melodic 2-op',
								channels: [
									{
										type: Music.ChannelType.OPLT,
										target: 15,
									}, {
										type: Music.ChannelType.OPLT,
										target: 16,
									}, {
										type: Music.ChannelType.OPLT,
										target: 17,
									},
								],
							},
						],
					},
				],
				tags: {},
			},
		};

		return md;
	}

	static supps() {
		return null;
	}

	static identify(content) {
		// Files must contain at least the signature.
		const minLength = 12;
		if (content.length < minLength) {
			return {
				valid: false,
				reason: `File length ${content.length} is less than minimum valid size of ${minLength}.`,
			};
		}

		let buffer = new RecordBuffer(content);

		const header = buffer.readRecord(recordTypes.header);
		if (header.signature !== 'DBRAWOPL') {
			return {
				valid: false,
				reason: `Signature doesn't match.`,
			};
		}

		if ((header.verMajor !== 0) || (header.verMinor !== 1)) {
			return {
				valid: false,
				reason: `File is version ${header.verMajor}.${header.verMinor}, we only support 0.1.`,
			};
		}

		return {
			valid: true,
		};
	}

	static parse(content) {
		const debug = Debug.extend('parse');

		let buffer = new RecordBuffer(content.main);

		if (buffer.length < DRO_HEADER_LEN) {
			throw new Error(`File too short, ${buffer.length} bytes isn't enough to read the ${DRO_HEADER_LEN}-byte header.`);
		}
		let oplData = [];

		const header = buffer.readRecord(recordTypes.header);
		debug(`Format version ${header.verMajor}.${header.verMinor}, reading as 0.1`);
		const subheader = buffer.readRecord(recordTypes.subheader);
		if ((subheader.flagHW >> 8) !== 0) {
			debug('Looks like pre-0.1 version');
			// Undo UINT32LE flagHW, treat it as if it was UINT8
			buffer.seekRel(-3);
		}

		let regOffset = 0; // 0 = low registers, 0x100 = high registers

		let len = Math.min(subheader.lenBytes, buffer.length);
		while (len--) {
			const cmd = buffer.read(RecordType.int.u8);
			switch (cmd) {
				case DRO_SHORT_DELAY:
					oplData.push({
						delay: buffer.read(RecordType.int.u8) + 1,
					});
					len--;
					break;

				case DRO_LONG_DELAY:
					oplData.push({
						delay: buffer.read(RecordType.int.u16le) + 1,
					});
					len -= 2;
					break;

				case DRO_OPL_LOW:
					regOffset = 0;
					break;

				case DRO_OPL_HIGH:
					regOffset = 0x100;
					break;

				case DRO_ESCAPE: {
					const reg = buffer.read(RecordType.int.u8);
					const val = buffer.read(RecordType.int.u8);
					oplData.push({
						reg: regOffset + reg,
						val: val,
					});
					len -= 2;
					break;
				}

				default:
					oplData.push({
						reg: regOffset + cmd,
						val: buffer.read(RecordType.int.u8),
					});
					len--;
					break;
			}
		}

		let music = new Music();

		if (buffer.distFromEnd() >= 12) { // 12 = minimum length of empty tags
			// There's some trailing data
			const sig = buffer.read(RecordType.int.u8);
			if (sig === 0x1A) {
				try {
					const tags = buffer.readRecord(recordTypes.tags);

					music.tags = {
						title: tags.title,
						artist: tags.artist,
						comment: tags.comment,
					};

					if (tags.app && tags.app.length > 0) {
						debug(`File was created by: ${tags.app}`);
					}
				} catch (e) {
					debug(`Exception reading tags: ${e}`);
				}
			} else {
				debug('Not reading tags, extra data but incorrect signature byte.');
			}

		} else {
			debug(`Not reading tags, only ${buffer.distFromEnd()} bytes left in file`);
		}

		let initialTempoEvent = new Music.TempoEvent();
		initialTempoEvent.usPerTick = 1000;

		const { events, patches } = UtilOPL.parseOPL(oplData, initialTempoEvent);
		music.patches = patches;

		// Split the single long list of events into tracks.
		const { trackConfig, pattern } = UtilMusic.splitEvents(events, UtilOPL.standardTrackSplitConfig);

		music.trackConfig = trackConfig;

		// TODO: Split into multiple patterns
		music.patterns = [pattern];

		return music;
	}

	static generate(music)
	{
		// Convert all the events across all tracks in all patterns into a single
		// event list.
		let events = UtilMusic.mergePatternsAndTracks(music.patterns);

		// Remove any tempo events and adjust timing so the song will play at a
		// fixed speed.
		events = UtilMusic.fixedTempo(events, 1000);

		const { oplData, warnings } = UtilOPL.generateOPL(
			events,
			music.patches,
			music.trackConfig
		);

		let binOPL = new RecordBuffer(65536);

		let msTotal = 0;
		let hasOPL3 = false;
		let lastchip = 0;
		for (const d of oplData) {
			if (d.delay > 255) {
				binOPL.write(RecordType.int.u8, DRO_LONG_DELAY);
				binOPL.write(RecordType.int.u16le, d.delay - 1);
				msTotal += d.delay;

			} else if (d.delay > 0) {
				binOPL.write(RecordType.int.u8, DRO_SHORT_DELAY);
				binOPL.write(RecordType.int.u8, d.delay - 1);
				msTotal += d.delay;

			} else if (d.reg !== undefined) {
				if (d.reg >= 0x100) {
					hasOPL3 = true;
					if (lastchip != 1) {
						binOPL.write(RecordType.int.u8, DRO_OPL_HIGH);
						lastchip = 1;
					}
				} else {
					if (lastchip != 0) {
						binOPL.write(RecordType.int.u8, DRO_OPL_LOW);
						lastchip = 0;
					}
				}

				if (d.reg <= 0x04) {
					binOPL.write(RecordType.int.u8, DRO_ESCAPE);
				}
				binOPL.write(RecordType.int.u8, d.reg);
				binOPL.write(RecordType.int.u8, d.val);

			} else {
				// TempoEvent could trigger this, but because of the call to
				// fixedTempo() above, we'll never see any TempoEvents.
				const ds = JSON.stringify(d);
				throw new Error(`Unable to handle OPL data: ${ds}.`);
			}
		}

		let binFile = new RecordBuffer(binOPL.length + 32 + 1024);
		binFile.writeRecord(recordTypes.header, {
			signature: 'DBRAWOPL',
			verMajor: 0,
			verMinor: 1,
		});
		binFile.writeRecord(recordTypes.subheader, {
			lenMilliseconds: msTotal,
			lenBytes: binOPL.length,
			flagHW: hasOPL3 ? 1 : 0, // we don't handle dual-OPL2
		});
		binFile.put(binOPL);
		if (Object.keys(music.tags).length) {
			this.writeTags(binFile, music.tags);
		}

		return {
			content: {
				main: binFile.getU8(),
			},
			warnings,
		};
	}

	static writeTags(buffer, tags)
	{
		buffer.write(RecordType.int.u8, 0x1A);
		buffer.writeRecord(recordTypes.tags, {
			title: tags.title || '',
			artist: tags.artist || '',
			comment: tags.comment || '',
			app: 'CAMOTOJS',
		});
	}
}

module.exports = Music_DRO_DOSBox_v1;
