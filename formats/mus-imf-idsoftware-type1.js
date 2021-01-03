/*
 * ID Software Music Format .IMF handler - with header, 560 Hz variant.
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

import { RecordBuffer, RecordType } from '@camoto/record-io-buffer';
import Music_IMF_IDSoftware_Common from './mus-imf-idsoftware-common.js';

export default class Music_IMF_IDSoftware_Type1 extends Music_IMF_IDSoftware_Common
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
