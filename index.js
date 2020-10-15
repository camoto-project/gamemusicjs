/**
 * @file Main library interface.
 * @private
 *
 * Copyright (C) 2018-2020 Adam Nielsen <malvineous@shikadi.net>
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

/**
 * List of file format handlers available to the library.
 *
 * Add any new supported file formats to this list.
 *
 * @private
 */
const fileTypes = [
	// These file formats all have signatures so the autodetection is
	// fast and they are listed first.
	require('./formats/mus-dro-dosbox-v1.js'),

	// These formats require enumeration, sometimes all the way to the
	// end of the file, so they are next.
	...require('./formats/mus-imf-idsoftware.js'),

	// These formats are so ambiguous that they are often misidentified,
	// so they are last.
	// Coming soon :)
];

/**
 * Main library interface.
 */
class GameMusic
{
	/**
	 * Get a handler by ID directly.
	 *
	 * @param {string} type
	 *   Identifier of desired file format.
	 *
	 * @return {MusicHandler} from formats/*.js matching requested code, or {null}
	 *   if the code is invalid.
	 *
	 * @example const handler = GameMusic.getHandler('mus-cmf-creativelabs');
	 */
	static getHandler(type)
	{
		return fileTypes.find(x => type === x.metadata().id);
	}

	/**
	 * Get a handler by examining the file content.
	 *
	 * @param {Uint8Array} content
	 *   Binary file data.
	 *
	 * @param {string} filename
	 *   Filename where {content} was read from.  This is required for formats
	 *   like IMF where the tempo is different depending on whether the filename
	 *   extension is .imf or .wlf.
	 *
	 * @return {Array<MusicHandler>} Zero or more classes from `formats/*.js`
	 *   that can handle the format.  An empty array means the format could not
	 *   be identified.
	 *
	 * @example
	 * const content = fs.readFileSync('jazz.cmf');
	 * const handler = GameMusic.findHandler(content);
	 * if (!handler) {
	 *   console.log('Unable to identify file format.');
	 * } else {
	 *   const md = handler.metadata();
	 *   console.log('File is in ' + md.id + ' format');
	 * }
	 */
	static findHandler(content, filename)
	{
		if (content.length === undefined) {
			throw new Error('content parameter must be Uint8Array');
		}
		let handlers = [];
		fileTypes.some(x => {
			const metadata = x.metadata();
			const ident = x.identify(content, filename);
			if (ident.valid === true) {
				handlers = [x];
				return true; // exit loop early
			}
			if (ident.valid === undefined) {
				handlers.push(x);
				// keep going to look for a better match
			}
		});
		return handlers;
	}

	/**
	 * Get a list of all the available handlers.
	 *
	 * This is probably only useful when testing the library.
	 *
	 * @return {Array} of file format handlers, with each element being just like
	 *   the return value of {@link GameMusic.getHandler getHandler()}.
	 */
	static listHandlers() {
		return fileTypes;
	}
};

GameMusic.Music = require('./src/music.js');
GameMusic.UtilMusic = require('./src/utl-music.js');
GameMusic.UtilMIDI = require('./src/utl-midi.js');
GameMusic.UtilOPL = require('./src/utl-opl.js');

module.exports = GameMusic;
