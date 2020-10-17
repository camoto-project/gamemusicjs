/*
 * ID Software Music Format .IMF handler.
 *
 * This file format is fully documented on the ModdingWiki:
 *   http://www.shikadi.net/moddingwiki/IMF_Format
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
	event: {
		reg: RecordType.int.u8,
		val: RecordType.int.u8,
		delay: RecordType.int.u16le,
	},
	tags: {
		title: RecordType.string.variable.reqTerm(256),
		artist: RecordType.string.variable.reqTerm(256),
		comment: RecordType.string.variable.reqTerm(256),
		app: RecordType.string.fixed.reqTerm(9),
	},
};

class Music_IMF_IDSoftware_Common extends MusicHandler
{
	static metadata() {
		let md = {
			...super.metadata(),
			caps: {
				channelMap: [
					{
						name: 'OPL-1..6',
						mappings: [
							{
								name: '5x melodic',
								channels: [
									// OPL #0 is reserved for sound effects
									{
										type: Music.ChannelType.OPLT,
										target: 1,
									}, {
										type: Music.ChannelType.OPLT,
										target: 2,
									}, {
										type: Music.ChannelType.OPLT,
										target: 3,
									}, {
										type: Music.ChannelType.OPLT,
										target: 4,
									}, {
										type: Music.ChannelType.OPLT,
										target: 5,
									},
								],
							},
						],
					}, {
						name: 'OPL-7..9',
						mappings: [
							{
								name: '3x melodic',
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
								name: '5x percussive',
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

	/**
	 * Read the OPL data and ensure it all points to valid OPL registers.
	 *
	 * This is used when autodetecting the file format.
	 */
	static verifyContent(buffer, contentLength) {
		for (let pos = 0; pos < contentLength; pos += 4) {
			const event = buffer.readRecord(recordTypes.event);

			// 0x00 isn't a valid register but it's ok if it's the first event in the
			// file.
			if ((pos === 0) && (event.reg === 0x00)) {
				continue;
			}

			if (!UtilOPL.validRegister(event.reg)) {
				return {
					valid: false,
					reason: `Register 0x${event.reg.toString(16).toUpperCase()} is not a valid OPL register.`,
				};
			}

			// It's unlikely a delay would be legitimately this large.
			if (event.delay >= 0x8000) {
				return {
					valid: false,
					reason: `Delay value ${event.delay} is unreasonably large.`,
				};
			}
		}

		return {
			valid: true,
		};
	}

	static parse(content) {
		const debug = Debug.extend('parse');

		let buffer = new RecordBuffer(content.main);

		let oplData = [];

		const contentLength = this.getContentLength(buffer);

		for (let pos = 0; pos < contentLength; pos += 4) {
			const event = buffer.readRecord(recordTypes.event);

			oplData.push({
				reg: event.reg,
				val: event.val,
			});

			oplData.push({
				delay: event.delay,
			});
		}

		let music = new Music();

		if (contentLength < buffer.length) {
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
			debug(`Not reading tags, only ${buffer.length - contentLength} bytes left in file`);
		}

		let initialTempoEvent = new Music.TempoEvent();
		initialTempoEvent.hertz = this.getTempo();

		const { events, patches } = UtilOPL.parseOPL(oplData, initialTempoEvent);
		music.patches = patches;

		// Split the single long list of events into tracks.
		const { trackConfig, pattern } = UtilMusic.splitEvents(events, UtilOPL.standardTrackSplitConfig);

		music.trackConfig = trackConfig;

		// TODO: Split into multiple patterns
		music.patterns = [pattern];

		return music;
	}

	/**
	 * Create the binary IMF data, minus the type-1 header and tags.
	 */
	static generateOPLBuffer(music)
	{
		// Convert all the events across all tracks in all patterns into a single
		// event list.
		let events = UtilMusic.mergePatternsAndTracks(music.patterns);

		// Remove any tempo events and adjust timing so the song will play at a
		// fixed speed.
		events = UtilMusic.fixedTempo(events, 1000000 / this.getTempo());

		const { oplData, warnings } = UtilOPL.generateOPL(
			events,
			music.patches,
			music.trackConfig
		);

		let binOPL = new RecordBuffer(65536);

		// For some reason the files almost always start with 4x 0x00 bytes.
		let last = {
			reg: 0,
			val: 0,
			delay: 0,
		};
		binOPL.writeRecord(recordTypes.event, last);

		last.reg = undefined;

		function flush() {
			if (last.reg) {
				binOPL.writeRecord(recordTypes.event, last);
				last.reg = undefined;
				last.delay = 0;
			}
		}

		for (const d of oplData) {
			if (d.delay) {
				last.delay += d.delay;
			}
			flush();
			if (d.reg) {
				last.reg = d.reg;
				last.val = d.val;
			}
		}
		flush();

		return { binOPL, warnings };
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

class Music_IMF_IDSoftware_Type0 extends Music_IMF_IDSoftware_Common
{
	static metadata() {
		let md = {
			...super.metadata(),
			id: 'mus-imf-idsoftware-type0',
			title: 'ID Software Music Format (type-0, 560 Hz)',
			games: [
				'Commander Keen',
				'Cosmo\'s Cosmic Adventures',
				'Monster Bash',
				'Major Stryker',
			],
			glob: [
				'*.imf',
			],
		};

		return md;
	}

	static identify(content) {
		// Files must contain at least one event.
		const minLength = 4;
		if (content.length < minLength) {
			return {
				valid: false,
				reason: `File length ${content.length} is less than minimum valid size of ${minLength}.`,
			};
		}

		// Files must contain one or more complete 4-byte reg/val/delay blocks.
		if (content.length % 4 != 0) {
			return {
				valid: false,
				reason: `File length is not a multiple of 4.`,
			};
		}

		let buffer = new RecordBuffer(content);

		return this.verifyContent(buffer, content.length);
	}

	static getTempo() {
		return 560;
	}

	static getContentLength(content) {
		return content.length;
	}

	static generate(music) {
		const { binOPL, warnings } = super.generateOPLBuffer(music);
		return {
			content: {
				main: binOPL.getU8(),
			},
			warnings,
		};
	}
}

class Music_IMF_IDSoftware_Type1 extends Music_IMF_IDSoftware_Common
{
	static metadata() {
		let md = {
			...super.metadata(),
			id: 'mus-imf-idsoftware-type1',
			title: 'ID Software Music Format (type-1, 560 Hz)',
			games: [
				'Bio Menace',
			],
			glob: [
				'*.imf',
			],
		};

		md.caps.tags = {
			title: 'Title',
			artist: 'Artist',
			comment: 'Comment',
		};

		return md;
	}

	static identify(content) {
		// Files must contain at least one event.
		const minLength = 6;
		if (content.length < minLength) {
			return {
				valid: false,
				reason: `File length ${content.length} is less than minimum valid size of ${minLength}.`,
			};
		}

		let buffer = new RecordBuffer(content);

		const contentLength = buffer.read(RecordType.int.u16le);

		if (contentLength === 0) {
			return {
				valid: false,
				reason: 'Length field is zero.',
			};
		}

		// Length (plus size of length field itself) must be shorter than the
		// actual file.
		if (content.length < contentLength + 2) {
			return {
				valid: false,
				reason: `Content length ${content.length - 2} is shorter than length ${contentLength} given in header.`,
			};
		}

		// Files must contain one or more complete 4-byte reg/val/delay blocks.
		if (contentLength % 4 != 0) {
			return {
				valid: false,
				reason: `File length ${content.length} is not a multiple of 4.`,
			};
		}

		return this.verifyContent(buffer, contentLength);
	}

	static getTempo() {
		return 560;
	}

	static getContentLength(content) {
		if (content.length - content.pos < 2) {
			throw new Error(`File too short (length=${content.length}, offset=${content.pos}, wanted=2).`);
		}
		return content.read(RecordType.int.u16le);
	}

	static generate(music) {
		const { binOPL, warnings } = super.generateOPLBuffer(music);
		const buffer = new RecordBuffer(binOPL.length + 1024);
		// Write data length
		buffer.write(RecordType.int.u16le, binOPL.length);
		buffer.put(binOPL);
		if (Object.keys(music.tags).length) {
			super.writeTags(buffer, music.tags);
		}
		return {
			content: {
				main: buffer.getU8(),
			},
			warnings,
		};
	}
}

class Music_IMF_IDSoftware_Nukem2 extends Music_IMF_IDSoftware_Type0
{
	static metadata() {
		let md = {
			...super.metadata(),
			id: 'mus-imf-idsoftware-nukem2',
			title: 'ID Software Music Format (type-0, 280 Hz)',
			games: [
				'Duke Nukem II',
			],
			glob: [
				'*.mni',
			],
		};

		return md;
	}

	static identify(content, filename) {
		if (super.identify(content, filename) === true) {
			// Matches IMF, but we can't be sure it's a Nukem2 variant, so return a
			// definite maybe.
			return undefined;
		}
		return false;
	}

	static getTempo() {
		return 280;
	}

	static getContentLength(content) {
		return content.length;
	}

	static generate(music) {
		const { binOPL, warnings } = super.generateOPLBuffer(music);
		return {
			content: {
				main: binOPL.getU8(),
			},
			warnings,
		};
	}
}

class Music_WLF_IDSoftware_Type0 extends Music_IMF_IDSoftware_Type0
{
	static metadata() {
		let md = {
			...super.metadata(),
			id: 'mus-wlf-idsoftware-type0',
			title: 'ID Software Music Format (type-0, 700 Hz)',
			games: [
			],
			glob: [
				'*.wlf',
			],
		};

		return md;
	}

	static identify(content, filename) {
		// Exclude an incorrect extension if one was given to check.
		const ext = filename.substr(-4).toLowerCase();
		if (ext != '.wlf') {
			return {
				valid: false,
				reason: `File extension "${ext}" doesn't match required ".wlf".`,
			};
		}

		return super.identify(content, filename);
	}

	static getTempo() {
		return 700;
	}

	static getContentLength(content) {
		return content.length;
	}
}

class Music_WLF_IDSoftware_Type1 extends Music_IMF_IDSoftware_Type1
{
	static metadata() {
		let md = {
			...super.metadata(),
			id: 'mus-wlf-idsoftware-type1',
			title: 'ID Software Music Format (type-1, 700 Hz)',
			games: [
				'Blake Stone',
				'Corridor 7',
				'Operation Body Count',
				'Wolfenstein 3-D',
			],
			glob: [
				'*.wlf',
			],
		};

		return md;
	}

	static identify(content, filename) {
		// Exclude an incorrect extension if one was given to check.
		const ext = filename.substr(-4).toLowerCase();
		if (ext != '.wlf') {
			return {
				valid: false,
				reason: `File extension "${ext}" doesn't match required ".wlf".`,
			};
		}

		return super.identify(content, filename);
	}

	static getTempo() {
		return 700;
	}

	static getContentLength(content) {
		return content.read(RecordType.int.u16le);
	}
}

module.exports = [
	// WLF must go first because it checks for .wlf extension
	Music_WLF_IDSoftware_Type0,
	Music_WLF_IDSoftware_Type1,
	Music_IMF_IDSoftware_Nukem2,
	// IMF must go last because it accepts any extension, even .wlf
	Music_IMF_IDSoftware_Type0,
	Music_IMF_IDSoftware_Type1,
];
