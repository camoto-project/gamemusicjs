/*
 * ID Software Music Format .WLF handler - with header, 700 Hz variant.
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

import { RecordType } from '@camoto/record-io-buffer';
import Music_IMF_IDSoftware_Type1 from './mus-imf-idsoftware-type1.js';

export default class Music_WLF_IDSoftware_Type1 extends Music_IMF_IDSoftware_Type1
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
