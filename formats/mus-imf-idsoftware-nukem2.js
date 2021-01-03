/*
 * ID Software Music Format .IMF handler - no header, 280 Hz variant.
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

import Music_IMF_IDSoftware_Type0 from './mus-imf-idsoftware-type0.js';

export default class Music_IMF_IDSoftware_Nukem2 extends Music_IMF_IDSoftware_Type0
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
