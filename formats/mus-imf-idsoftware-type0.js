/*
 * ID Software Music Format .IMF handler - no header, 560 Hz variant.
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

import { RecordBuffer } from '@camoto/record-io-buffer';
import Music_IMF_IDSoftware_Common from './mus-imf-idsoftware-common.js';

export default class Music_IMF_IDSoftware_Type0 extends Music_IMF_IDSoftware_Common
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
