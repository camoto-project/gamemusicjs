/*
 * SoundBlaster Instrument .sbi handler.
 *
 * This file format is fully documented on the ModdingWiki:
 *   http://www.shikadi.net/moddingwiki/SBI_Format
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

const FORMAT_ID = 'ins-sbi-creativelabs';

import Debug from '../util/debug.js';
const debug = Debug.extend(FORMAT_ID);

import { RecordBuffer, RecordType } from '@camoto/record-io-buffer';
import MusicHandler from '../interface/musicHandler.js';
import { Music, UtilOPL } from '../index.js';
import { OPL as PatchOPL } from '../interface/patch/index.js';

const recordTypes = {
	header: {
		signature: RecordType.string.fixed.noTerm(4),
		title: RecordType.string.fixed.reqTerm(32),
	},
	data: {
		modChar: RecordType.int.u8,
		carChar: RecordType.int.u8,
		modScale: RecordType.int.u8,
		carScale: RecordType.int.u8,
		modAttack: RecordType.int.u8,
		carAttack: RecordType.int.u8,
		modSustain: RecordType.int.u8,
		carSustain: RecordType.int.u8,
		modWaveSel: RecordType.int.u8,
		carWaveSel: RecordType.int.u8,
		feedback: RecordType.int.u8,
	},
	ext: {
		// Officially the next five bytes are padding, but we will read the
		// SBTimbre extensions.
		percussionType: RecordType.int.u8, // 6=BD 7=SD 8=TT 9=CY 10=HH
		transpose: RecordType.int.s8,
		percussionNote: RecordType.int.u8,

		padding4: RecordType.int.u8,
		padding5: RecordType.int.u8,
	},
};

const SBI_MIN_LENGTH = 4 + 16 + 11;

// Which registers the binary OPL data is loaded into, in order.
const regOrder = [
	0x20,
	0x23,
	0x40,
	0x43,
	0x60,
	0x63,
	0x80,
	0x83,
	0xE0,
	0xE3,
	0xC0,
];

export default class Instrument_SBI extends MusicHandler
{
	static metadata() {
		let md = {
			...super.metadata(),
			id: FORMAT_ID,
			title: 'SoundBlaster Instrument',
			games: [],
			glob: [
				'*.sbi',
			],
			caps: {
				channelMap: [
					{
						name: 'OPL',
						mappings: [
							{
								name: 'Melodic',
								channels: [
									{
										type: Music.TrackConfiguration.ChannelType.OPLT,
										target: 0,
									},
								],
							},
						],
					},
				],
				tags: {},
				supportedEvents: [], // none, we are an instrument format
				patchNames: true,
			},
		};

		return md;
	}

	static supps() {
		return null;
	}

	static identify(content) {
		if (content.length < SBI_MIN_LENGTH) {
			return {
				valid: false,
				reason: `File length ${content.length} is less than minimum valid size of ${SBI_MIN_LENGTH}.`,
			};
		}

		let buffer = new RecordBuffer(content);

		const header = buffer.readRecord(recordTypes.header);

		if (header.signature !== 'SBI\u2192') { // actually char 0x1A but record-type maps it
			return {
				valid: false,
				reason: `Signature doesn't match.`,
			};
		}

		return {
			valid: true,
		};
	}

	static parse(content) {
		const debug = Debug.extend('parse');

		let buffer = new RecordBuffer(content.main);

		if (buffer.length < SBI_MIN_LENGTH) {
			throw new Error(`File too short.`);
		}

		const header = buffer.readRecord(recordTypes.header);

		const regs = [];
		for (const r of regOrder) {
			regs[r] = buffer.read(RecordType.int.u8);
		}

		let ext;
		if (buffer.distFromEnd() >= 5) {
			ext = buffer.readRecord(recordTypes.ext);
		} else {
			ext = {
				percussionType: 0,
				transpose: 0,
				percussionNote: 0,
			};
		}

		const cs = UtilOPL.getChannelSettings(regs, 0, [0, 1, -1, -1]);
		let patch = cs.patch;

		// 6=BD 7=SD 8=TT 9=CY 10=HH (map SBTimbre to UtilOPL.Rhythm)
		patch.rhythm = [
			UtilOPL.Rhythm.BD,
			UtilOPL.Rhythm.SD,
			UtilOPL.Rhythm.TT,
			UtilOPL.Rhythm.CY,
			UtilOPL.Rhythm.HH,
		][ext.percussionType - 6] || UtilOPL.Rhythm.NO;

		//let p = this.parseSBI(buffer.getU8(buffer.getPos(), buffer.distFromEnd()));
		patch.title = header.title;

		let music = new Music();
		music.patches.push(patch);

		return music;
	}

	static generate(music) {
		if (music.patches.length === 0) {
			throw new Error('At least one instrument must be present.');
		}

		if (!(music.patches[0] instanceof PatchOPL)) {
			throw new Error('Only OPL instruments can be written in this format.');
		}

		let warnings = [];

		if (music.patterns.length > 0) {
			warnings.push('This format cannot store musical events, the '
				+ 'patterns/tracks/notes have been ignored.');
		}

		if (music.patches.length > 1) {
			warnings.push('This format can only store one instrument.  The other '
				+ 'instruments have been ignored.');
		}

		const i = music.patches[0];

		if (i.slot[2] || i.slot[3]) {
			warnings.push('This format can only store 2-operator instruments.  '
				+ 'Settings for operators 3 and 4 have not been saved.');
		}

		let binFile = new RecordBuffer(4 + 32 + 16);
		binFile.writeRecord(recordTypes.header, {
			signature: 'SBI\u2192', // actually char 0x1A but record-type maps it
			title: music.patches[0].title || '',
		});

		let regs = [];
		UtilOPL.setPatch(regs, 0, [0, 1, -1, -1], i);
		for (const r of regOrder) {
			binFile.write(RecordType.int.u8, regs[r]);
		}

		binFile.writeRecord(recordTypes.ext, {
			// 6=BD 7=SD 8=TT 9=CY 10=HH (map UtilOPL.Rhythm to SBTimbre)
			percussionType: [0, 10, 9, 8, 7, 6][i.rhythm],
			transpose: 0,
			percussionNote: 0,

			padding4: 0,
			padding5: 0,
		});

		return {
			content: {
				main: binFile.getU8(),
			},
			warnings,
		};
	}
}
