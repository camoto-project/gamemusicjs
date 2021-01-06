/*
 * Base class and defaults for music format handlers.
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

import * as Events from './events/index.js';

/**
 * Base class and defaults for music format handlers.
 *
 * To implement a new music file format, this is the class that will be
 * extended and its methods replaced with ones that perform the work.
 * @kind variable
 */
export default class MusicHandler
{
	/**
	 * Retrieve information about the music file format.
	 *
	 * This must be overridden by all format handlers.  It returns a structure
	 * detailed below.
	 *
	 * @return {MusicHandler.MetadataObject}.
	 */
	static metadata() {
		/**
		 * @typedef {Object} MusicHandler.MetadataObject
		 *
		 * @property {string} id
		 *   A unique identifier for the format.
		 *
		 * @property {string} title
		 *   The user-friendly title for the format.
		 *
		 * @property {Array<string>} games
		 *   A list of strings naming the games that use this format.
		 *
		 * @property {Array<string>} glob
		 *   A list of strings with filename expressions matching files that are
		 *   often in this format.  An examples is ['*.txt', '*.doc', 'file*.bin'].
		 *
		 * @property {Object} caps
		 *   Capability flags indicating what the format can or cannot support.
		 *   See example below for detail.
		 *
		 * @property {Array<Object>} caps.channelMap
		 *   One or more lists of output channel configurations, so we know what
		 *   channel types (OPL, PCM, MIDI) are available for use in this format.
		 *
		 * @property {Array<Object>} caps.tags
		 *   Zero or more tags that the format supports.
		 *
		 *   The key is the internal property name to use when specifying the tag,
		 *   and the value is a user-readable string explaining the tag name.
		 *
		 * @property {Array<Event>} caps.supportedEvents
		 *   Zero or more events that this format can store.  This will be an
		 *   empty array for instrument formats, which don't support any musical
		 *   notation events at all.  Other formats may have a varying number of
		 *   events they support, so only some Event instances may be in this
		 *   array.  Some Event instances may be listed more than one, such as the
		 *   ConfigurationEvent, which has multiple subtypes so will be listed
		 *   once for each supported ConfigurationEvent subtype.
		 *
		 * @property {boolean} caps.patchNames
		 *   `true` if the patches can have names, `false` if not.
		 *
		 * @example
		 * // console.log(metadata());
		 * {
		 *   id: 'mus-example',
		 *   title: 'Example format',
		 *   games: [
		 *     'Example game 1',
		 *   ],
		 *   glob: [
		 *     '*.txt',
		 *     '*.log',
		 *   ],
		 *   caps: {
		 *     channelMap: [
		 *       {
		 *         name: 'Only use first and second OPL channels',
		 *         channels: [
		 *           {
		 *             type: Music.ChannelType.OPLT,
		 *             target: 0,
		 *           }, {
		 *             type: Music.ChannelType.OPLT,
		 *             target: 1,
		 *           },
		 *         ],
		 *       }, {
		 *         name: 'Single PCM channel',
		 *         channels: [
		 *           {
		 *             type: Music.ChannelType.PCM,
		 *             target: 0,
		 *           },
		 *         ],
		 *       },
		 *     ],
		 *     tags: {
		 *       title: 'My example song',
		 *     },
		 *   },
		 * }
		 * @endexample
		 */
		return {
			id: 'unknown',
			title: 'Unknown format',
			games: [],
			glob: [],
			caps: {
				channelMap: [],
				tags: {},
			},
		};
	}

	/**
	 * Identify any problems writing the given song in the current format.
	 *
	 * @param {Music} music
	 *   Music to attempt to write in this handler's format.
	 *
	 * @return {Array<string>} listing any problems that will prevent the
	 *   supplied song from being written in this format.  An empty array
	 *   indicates no problems.
	 */
	static checkLimits(music)
	{
		const metadata = this.metadata();
		let issues = [];

		const validTags = Object.keys(metadata.caps.tags);
		const actualTags = Object.keys(music.tags);
		for (const tag of actualTags) {
			if (!validTags.includes(tag)) {
				const tagName = metadata.caps.tags[tag];
				issues.push(`The tag "${tagName}" is not supported by this format.`);
			}
		}

		// TODO: Check events against channel map

		if ((!music.patterns) || (music.patterns.length === undefined)) {
			throw new Error('Music.patterns must be an array.');
		}

		const trackCount = music.patterns[0].tracks.length;

		for (let idxPattern = 0; idxPattern < music.patterns.length; idxPattern++) {
			const pattern = music.patterns[idxPattern];

			if ((!pattern.tracks) || (pattern.tracks.length === undefined)) {
				throw new Error(`Music.patterns[${idxPattern}].tracks must be an array.`);
			}

			// Ensure all patterns have the same number of tracks.
			if (pattern.tracks.length !== trackCount) {
				throw new Error(`Pattern ${idxPattern} has ${pattern.tracks.length} `
					+ `tracks which does not match the first pattern's ${trackCount} `
					+ `tracks.`);
			}

			for (let idxTrack = 0; idxTrack < pattern.tracks.length; idxTrack++) {
				const track = pattern.tracks[idxTrack];

				for (const ev of track.events) {
					if (ev instanceof Events.NoteOn) {
						if (ev.instrument >= music.patches.length) {
							issues.push(`Track ${idxTrack} has a note using instrument `
								+ `${ev.instrument} which doesn't exist.`);
						}
					}
				}
			}
		}

		// Ensure all patternSequence values refer to valid pattern indices.
		for (
			let patternSequenceIndex = 0;
			patternSequenceIndex < music.patternSequence.length;
			patternSequenceIndex++
		) {
			const patternIndex = music.patternSequence[patternSequenceIndex];
			if (!music.pattern[patternIndex]) {
				issues.push(`BUG: Pattern sequence index ${patternSequenceIndex} wants `
					+ `to play non-existent pattern ${patternIndex}.`);
			}
		}
		return issues;
	}

	/**
	 * Get a list of supplementary files needed to use the format.
	 *
	 * Some formats store their data across multiple files, and this function
	 * will return a list of filenames needed, based on the filename and data in
	 * the main music file.
	 *
	 * This allows both the filename and music content to be examined, in case
	 * either of these are needed to construct the name of the supplementary
	 * files.
	 *
	 * @param {string} name
	 *   Music filename.
	 *
	 * @param {Uint8Array} content
	 *   Music content.
	 *
	 * @return `null` if there are no supplementary files, otherwise an `object`
	 *   where each key is an identifier specific to the handler, and the value
	 *   is the expected case-insensitive filename.  Don't convert passed names
	 *   to lowercase, but any changes (e.g. appending a filename extension)
	 *   should be lowercase.
	 */
	// eslint-disable-next-line no-unused-vars
	static supps(name, content) {
		return null;
	}

	/**
	 * See if the given song is in the format supported by this handler.
	 *
	 * This is used for format autodetection.
	 *
	 * @note More than one handler might report that it supports a file format,
	 *   such as the case of an empty file, which is a valid silent song in a
	 *   number of different formats.
	 *
	 * @param {Uint8Array} content
	 *   The file data to examine.
	 *
	 * @param {string} filename
	 *   The song's filename in case it is relevant, for those formats where
	 *   the filename extension is significant.
	 *
	 * @return {object} with a `.valid` property, set to `true` if the data is
	 *   definitely in this format, `false` if it is definitely not in this
	 *   format, and `undefined` if it's possible the data is in this format but
	 *   there is not enough information to know for certain one way or the other.
	 *   The returned object also has a `.reason` property containing a technical
	 *   although user-friendly explanation as to why the data was decreed to be
	 *   or not be in this format.  This is most useful when uncertain or
	 *   rejecting content, as the user can then be informed why.
	 */
	// eslint-disable-next-line no-unused-vars
	static identify(content, filename) {
		return {
			valid: false,
			reason: 'This function has not been implemented by the format handler, '
				+ 'so autodetecting this format is not possible.',
		};
	}

	/**
	 * Read the given music file.
	 *
	 * @param {Object} content
	 *   File content of the map.  The `main` property contains the main file,
	 *   with any other supps as other properties.  Each property is a
	 *   {Uint8Array}.
	 *
	 * @return {Music} object detailing the contents of the music file.
	 */
	// eslint-disable-next-line no-unused-vars
	static parse(content) {
		throw new Error('Not implemented yet.');
	}

	/**
	 * Write out a music file in this format.
	 *
	 * Preconditions: The parameter has already been passed through
	 *   {@link MusicHandler.checkLimits checkLimits()} successfully.  If not,
	 *   the behaviour is undefined and a corrupted file might be produced.
	 *
	 * @param {Music} music
	 *   The contents of the file to write.
	 *
	 * @return {Object} containing the contents of the file in the `main`
	 *   property, with any other supp files as other properties.  Each property
	 *   is a `Uint8Array` suitable for writing directly to a file on disk or
	 *   offering for download to the user.
	 */
	// eslint-disable-next-line no-unused-vars
	static generate(music) {
		throw new Error('Not implemented yet.');
	}
}
