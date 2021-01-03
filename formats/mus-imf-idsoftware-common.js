/*
 * Base class for ID Software Music Format .IMF handler.
 *
 * This file format is fully documented on the ModdingWiki:
 *   http://www.shikadi.net/moddingwiki/IMF_Format
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

import Debug from '../util/debug.js';
const debug = Debug.extend('mus-imf-idsoftware-common');

import { RecordBuffer, RecordType } from '@camoto/record-io-buffer';
import MusicHandler from '../interface/musicHandler.js';
import { Music, UtilOPL, UtilMusic } from '../index.js';
import { Tempo as TempoEvent } from '../interface/events/index.js';
import { generateOPL, parseOPL } from '../util/opl/index.js';

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

export default class Music_IMF_IDSoftware_Common extends MusicHandler
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
										type: Music.TrackConfiguration.ChannelType.OPLT,
										target: 1,
									}, {
										type: Music.TrackConfiguration.ChannelType.OPLT,
										target: 2,
									}, {
										type: Music.TrackConfiguration.ChannelType.OPLT,
										target: 3,
									}, {
										type: Music.TrackConfiguration.ChannelType.OPLT,
										target: 4,
									}, {
										type: Music.TrackConfiguration.ChannelType.OPLT,
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
										type: Music.TrackConfiguration.ChannelType.OPLT,
										target: 6,
									}, {
										type: Music.TrackConfiguration.ChannelType.OPLT,
										target: 7,
									}, {
										type: Music.TrackConfiguration.ChannelType.OPLT,
										target: 8,
									},
								],
							}, {
								name: '5x percussive',
								channels: [
									{
										type: Music.TrackConfiguration.ChannelType.OPLR,
										target: UtilOPL.Rhythm.HH,
									}, {
										type: Music.TrackConfiguration.ChannelType.OPLR,
										target: UtilOPL.Rhythm.CY,
									}, {
										type: Music.TrackConfiguration.ChannelType.OPLR,
										target: UtilOPL.Rhythm.TT,
									}, {
										type: Music.TrackConfiguration.ChannelType.OPLR,
										target: UtilOPL.Rhythm.SD,
									}, {
										type: Music.TrackConfiguration.ChannelType.OPLR,
										target: UtilOPL.Rhythm.BD,
									},
								],
							},
						],
					},
				],
				tags: {},
				supportedEvents: UtilOPL.oplSupportedEvents,
				patchNames: false,
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

		music.initialTempo = new TempoEvent({
			hertz: this.getTempo(),
		});

		const { events, patches } = parseOPL(oplData);
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
		events = UtilMusic.fixedTempo(
			events,
			music.initialTempo,
			new TempoEvent({hertz: this.getTempo()})
		);

		const { oplData, warnings } = generateOPL(
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
