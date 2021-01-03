/*
 * Main library interface.
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

import Debug from './util/debug.js';
const debug = Debug.extend('index');

import * as formats from './formats/index.js';

export * from './formats/index.js';
export { default as Music } from './interface/music/index.js';
export { default as UtilMIDI } from './util/midi/index.js';
export { default as UtilMusic } from './util/music.js';
export { default as UtilOPL } from './util/opl/index.js';

import * as Events from './interface/events/index.js';
import * as Patch from './interface/patch/index.js';
export { Events, Patch };

/**
 * Get a list of all the available handlers.
 *
 * This is preferable to `import *` because most libraries also export utility
 * functions like the autodetection routine which would be included even though
 * they are not format handlers.
 */
export const all = [
	...Object.values(formats),
];

/**
 * Get a handler by examining the file content.
 *
 * Ensure the content has been decompressed first if necessary, e.g. by passing
 * it through `decompressEXE()` first.
 *
 * @param {Uint8Array} content
 *   Executable file content.
 *
 * @param {string} filename
 *   Filename where `content` was read from.  This is required to identify
 *   formats where the filename extension is significant.  This can be
 *   omitted for less accurate autodetection.
 *
 * @return {Array<CodeHandler>} from formats/*.js that can handle the
 *   format, or an empty array if the format could not be identified.
 *
 * @example
 * import { findHandler as gameCodeFindHandler, decompressEXE } from '@camoto/gamecode';
 * const content = decompressEXE(fs.readFileSync('cosmo1.exe'));
 * const handler = gameCodeFindHandler(content, 'cosmo1.exe');
 * if (handler.length === 0) {
 *   console.log('Unable to identify file format.');
 * } else {
 *   const md = handler[0].metadata();
 *   console.log('File is in ' + md.id + ' format');
 * }
 */
export function findHandler(content, filename) {
	if (content.length === undefined) {
		throw new Error('content parameter must be Uint8Array');
	}
	let handlers = [];
	for (const x of all) {
		const metadata = x.metadata();
		debug(`Trying format handler ${metadata.id} (${metadata.title})`);
		const confidence = x.identify(content, filename);
		if (confidence.valid === true) {
			debug(`Matched ${metadata.id}: ${confidence.reason}`);
			handlers = [x];
			break;
		} else if (confidence.valid === undefined) {
			debug(`Possible match for ${metadata.id}: ${confidence.reason}`);
			handlers.push(x);
			// keep going to look for a better match
		} else {
			debug(`Not ${metadata.id}: ${confidence.reason}`);
		}
	}
	return handlers;
};
