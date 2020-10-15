/**
 * @file Standard tests.
 *
 * Copyright (C) 2018-2019 Adam Nielsen <malvineous@shikadi.net>
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

const assert = require('assert');

const TestUtil = require('./util.js');
const GameMusic = require('../index.js');
const Music = GameMusic.Music;

// These formats are skipped entirely.
const skipFormats = [
//	'arc-fixed-ddave_exe',
];

// These formats identify each other and there's nothing we can do about it
// because it's not actually wrong.
const identifyConflicts = {
	// This format...
	'mus-imf-idsoftware-type0': [
		// ...picks up these ones too.
		'mus-imf-idsoftware-nukem2',
		'mus-wlf-idsoftware-type0',
	],
	'mus-imf-idsoftware-nukem2': [
		'mus-imf-idsoftware-type0',
		'mus-wlf-idsoftware-type0',
	],
	'mus-imf-idsoftware-type1': [
		'mus-wlf-idsoftware-type1',
	],
};

// Override the default colours so we can actually see them
var colors = require('mocha/lib/reporters/base').colors;
colors['diff added'] = '1;33';
colors['diff removed'] = '1;31';
colors['green'] = '1;32';
colors['fail'] = '1;31';
colors['error message'] = '1;31';
colors['error stack'] = '1;37';

const allHandlers = GameMusic.listHandlers();
allHandlers.forEach(handler => {
	const md = handler.metadata();

	if (skipFormats.some(id => id === md.id)) {
		return;
	}

	let testutil = new TestUtil(md.id);

	describe(`Standard tests for ${md.title} [${md.id}]`, function() {
		let content = {};
		let defaultMusic = new Music();

		// Test the metadata first because we need it for the test file.
		describe('metadata()', function() {

			it('should provide a filename glob, even if empty', function() {
				assert.ok(md.glob);
			});

			it('should provide a title', function() {
				assert.ok(md.title && (md.title.length > 0));
			});

			it('should provide a capability list', function() {
				// Make sure the metadata() implementation amends the objects rather
				// than replacing them entirely.
				assert.ok(md.caps);
				assert.ok(md.caps.tags);

				// Ok to proceed with I/O tests below.
				md.pass = true;
			});
		});

		describe('I/O', function() {

			before('load test data from local filesystem', function() {

				// Skip all these tests if the metadata() one above failed.
				if (!md.pass) this.skip();

				content = testutil.loadContent(handler, [
					'default',
				]);

				// This is what we expect the default song in any given format to
				// look like.

				let track = new Music.Track();

				track.events.push(
					new Music.NoteOnEvent({
						frequency: 440, // A-4
						velocity: 1,
						instrument: 0,
					})
				);

				track.events.push(
					new Music.DelayEvent({
						ticks: 10,
					})
				);

				track.events.push(
					new Music.NoteOffEvent()
				);

				track.events.push(
					new Music.NoteOnEvent({
						frequency: 92.5, // F#2
						velocity: 0.5,
						instrument: 0,
					})
				);

				track.events.push(
					new Music.DelayEvent({
						ticks: 10,
					})
				);

				track.events.push(
					new Music.NoteOffEvent()
				);

				let pattern = new Music.Pattern();
				pattern.tracks.push(track);

				defaultMusic.patterns.push(pattern);

				let inst = new Music.Patch.OPL();
				// TODO: populate inst
				defaultMusic.patches[0] = inst;

				defaultMusic.trackConfig[0] = new Music.TrackConfiguration({
					channelType: Music.ChannelType.OPL,
					channelIndex: 0,
				});

				const mdTags = Object.keys(md.caps.tags);
				if (mdTags.length > 0) {
					mdTags.forEach(mdTag => {
						defaultMusic.tags[mdTag] = `${mdTag} goes here`;
					});
				}

			});

			describe('parse()', function() {
				let music;

				before('should parse correctly', function() {
					music = handler.parse(content.default);
					assert.notStrictEqual(music, undefined);
					assert.notStrictEqual(music, null);

					assert.ok(music.patterns, 'music.patterns must be an array.');
					assert.ok(music.patterns[0].tracks, 'music.patterns[0].tracks must be an array.');
				});

				it('should have the expected events', function() {
					const events = music.patterns[0].tracks[0].events;
					assert.equal(events[0].type, Music.TempoEvent);
					assert.equal(events[1].type, Music.NoteOnEvent);
					assert.equal(events[2].type, Music.DelayEvent);
					assert.equal(events[3].type, Music.NoteOffEvent);
					assert.equal(events[4].type, Music.NoteOnEvent);
					assert.equal(events[5].type, Music.DelayEvent);
					assert.equal(events[6].type, Music.NoteOffEvent);

					TestUtil.almostEqual(events[1].frequency, 440, 0.1);
					TestUtil.almostEqual(events[5].frequency, 92.5, 0.1);
				});

				it('should have the standard number of events', function() {
					assert.equal(music.patterns.length, 1);
					assert.equal(music.patterns[0].tracks.length, 1, 'Wrong number of tracks.');
					assert.equal(music.patterns[0].tracks[0].events.length, 7, 'Wrong number of events in first track.');
				});

				const mdTags = Object.keys(md.caps.tags);
				if (mdTags.length > 0) {
					mdTags.forEach(mdTag => {
						it(`should provide "${mdTag}" metadata field`, function() {
							assert.equal(music.tags[mdTag], `${mdTag} goes here`);
						});
					});
				} else {
					it(`supports no tags and provided no tags`, function() {
						assert.ok(music.tags, 'Even with no tags music.tags must == {}');
						const numTags = Object.keys(music.tags).length;
						assert.equal(numTags, 0, `Format reports no tags supported but handler read in ${numTags} tags.`);
					});
				}
			});

			describe('generate()', function() {

				it('should generate correctly', function() {
					const issues = handler.checkLimits(defaultMusic);
					assert.equal(issues.length, 0, `${issues.length} issues with song, expected 0`);

					const contentGenerated = handler.generate(defaultMusic);

					TestUtil.contentEqual(content.default, contentGenerated);
					// TODO: Test supps
				});

			});

			describe('identify()', function() {

				it('should not negatively identify itself', function() {
					const result = handler.identify(
						content.default.main,
						content.default.main.filename
					);
					assert.ok(result.valid === true || result.valid === undefined);
				});

				it('should not break on empty data', function() {
					const content = new Uint8Array();
					handler.identify(content, 'empty.bin');
					// Should not throw
					assert.ok(true);
				});

				it('should not break on short data', function() {
					// Test a handful of random file sizes
					[1, 7, 8, 15, 16, 20, 22, 23, 30].forEach(len => {
						const content = new Uint8Array(len);
						content[0] = 1;
						handler.identify(content, 'short.bin');
						// Should not throw
						assert.ok(true);
					});
				});

				const allHandlers = GameMusic.listHandlers();
				allHandlers.forEach(subhandler => {
					const submd = subhandler.metadata();

					// Skip ourselves
					if (submd.id === md.id) return;

					if (identifyConflicts[submd.id] && identifyConflicts[submd.id].includes(md.id)) {
						it(`will be positively identified by ${submd.id} handler, so unable to test`, function() {
							assert.ok(true);
						});
					} else {
						it(`should not be positively identified by ${submd.id} handler`, function() {
							const result = subhandler.identify(content.default.main, content.default.main.filename);
							assert.notEqual(result.valid, true);
						});
					}
				});

			}); // identify()

		}); // I/O
	}); // Standard tests

}); // for each handler
