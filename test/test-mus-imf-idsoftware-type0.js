/**
 * @file Tests specific to mus-imf-idsoftware-type0.
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

const ID_FORMAT = 'mus-imf-idsoftware-type0';

const assert = require('assert');

const TestUtil = require('./util.js');
const GameMusic = require('../index.js');

const handler = GameMusic.getHandler(ID_FORMAT);

const md = handler.metadata();
let testutil = new TestUtil(md.id);

describe(`Extra tests for ${md.title} [${md.id}]`, function() {
	let content = {};

	describe('I/O', function() {

		before('load test data from local filesystem', function() {

			content = testutil.loadContent(handler, [
				'short',
				'not_multiple_of_4',
				'bad_register',
				'excessive_delay',
			]);
		});

		describe('identify()', function() {

			it('should reject short files', function() {
				const result = handler.identify(
					content['short'].main,
					content['short'].main.filename
				);
				assert.equal(result.reason, 'File length 3 is less than minimum valid size of 4.');
				assert.equal(result.valid, false);
			});

			it('should reject lengths not multiples of 4', function() {
				const result = handler.identify(
					content['not_multiple_of_4'].main,
					content['not_multiple_of_4'].main.filename
				);
				assert.equal(result.reason, `File length is not a multiple of 4.`);
				assert.equal(result.valid, false);
			});

			it('should reject bad registers', function() {
				const result = handler.identify(
					content['bad_register'].main,
					content['bad_register'].main.filename
				);
				assert.equal(result.reason, 'Register 0xBF is not a valid OPL register.');
				assert.equal(result.valid, false);
			});

			it('should reject excessive delays', function() {
				const result = handler.identify(
					content['excessive_delay'].main,
					content['excessive_delay'].main.filename
				);
				assert.equal(result.reason, 'Delay value 61440 is unreasonably large.');
				assert.equal(result.valid, false);
			});

		}); // identify()

	}); // I/O

}); // Extra tests
