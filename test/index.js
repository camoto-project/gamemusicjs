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

			before('reset flag', function() {
				// This means md.pass = false if the metadata tests ran but failed, or
				// undefined if the tests didn't run, e.g. `-g generate` was used to
				// only run the generate() tests.
				md.pass = false;
			});

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
				assert.equal(!!md.caps.patchNames, md.caps.patchNames, 'caps.patchNames must be boolean');

				// Ok to proceed with I/O tests below.
				md.pass = true;
			});
		});

		describe('I/O', function() {

			before('load test data from local filesystem', function() {

				// Skip all these tests if the metadata() one above failed.
				if (md.pass === false) this.skip();

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

				// Figure out what type of instruments to use depending on what the
				// format supports.
				let channelTypes = [];
				for (const cm of md.caps.channelMap) {
					for (const mapping of cm.mappings) {
						for (const target of mapping.channels) {
							channelTypes[target.type] = true;
						}
					}
				}

				if (channelTypes[Music.ChannelType.OPLT]) {
					let inst = new Music.Patch.OPL({
						slot: [
							{
								enableTremolo: 1,
								enableVibrato: 1,
								enableSustain: 1,
								enableKSR: 0,
								freqMult: 2,
								scaleLevel: 3,
								outputLevel: 4,
								attackRate: 5,
								decayRate: 6,
								sustainRate: 7,
								releaseRate: 8,
								waveSelect: 6,
							}, {
								enableTremolo: 1,
								enableVibrato: 0,
								enableSustain: 1,
								enableKSR: 0,
								freqMult: 3,
								scaleLevel: 4,
								outputLevel: 5,
								attackRate: 6,
								decayRate: 7,
								sustainRate: 8,
								releaseRate: 9,
								waveSelect: 5,
							},
						],
						feedback: 4,
						connection: 0,
					});
					defaultMusic.patches.push(inst);

					defaultMusic.trackConfig.push(new Music.TrackConfiguration({
						channelType: Music.ChannelType.OPLT,
						channelIndex: 0,
					}));
				}

				if (channelTypes[Music.ChannelType.OPLF]) {
					let inst = new Music.Patch.OPL({
						slot: [
							{
								enableTremolo: 1,
								enableVibrato: 1,
								enableSustain: 1,
								enableKSR: 0,
								freqMult: 2,
								scaleLevel: 3,
								outputLevel: 4,
								attackRate: 5,
								decayRate: 6,
								sustainRate: 7,
								releaseRate: 8,
								waveSelect: 6,
							}, {
								enableTremolo: 1,
								enableVibrato: 0,
								enableSustain: 1,
								enableKSR: 0,
								freqMult: 3,
								scaleLevel: 4,
								outputLevel: 5,
								attackRate: 6,
								decayRate: 7,
								sustainRate: 8,
								releaseRate: 9,
								waveSelect: 5,
							}, {
								enableTremolo: 0,
								enableVibrato: 1,
								enableSustain: 0,
								enableKSR: 1,
								freqMult: 0,
								scaleLevel: 5,
								outputLevel: 6,
								attackRate: 7,
								decayRate: 8,
								sustainRate: 9,
								releaseRate: 10,
								waveSelect: 4,
							}, {
								enableTremolo: 0,
								enableVibrato: 0,
								enableSustain: 0,
								enableKSR: 0,
								freqMult: 1,
								scaleLevel: 6,
								outputLevel: 7,
								attackRate: 8,
								decayRate: 9,
								sustainRate: 10,
								releaseRate: 11,
								waveSelect: 3,
							},
						],
						feedback: 3,
						connection: 1,
					});
					defaultMusic.patches.push(inst);

					defaultMusic.trackConfig.push(new Music.TrackConfiguration({
						channelType: Music.ChannelType.OPLF,
						channelIndex: 3,
					}));
				}

				if (channelTypes[Music.ChannelType.OPLR]) {
					let inst = new Music.Patch.OPL({
						slot: [
							{
								enableTremolo: 1,
								enableVibrato: 1,
								enableSustain: 0,
								enableKSR: 1,
								freqMult: 8,
								scaleLevel: 3,
								outputLevel: 4,
								attackRate: 5,
								decayRate: 6,
								sustainRate: 7,
								releaseRate: 8,
								waveSelect: 3,
							},
						],
						feedback: 6,
						connection: 1,
					});
					defaultMusic.patches.push(inst);

					defaultMusic.trackConfig.push(new Music.TrackConfiguration({
						channelType: Music.ChannelType.OPLR,
						channelIndex: GameMusic.UtilOPL.Rhythm.HH,
					}));
				}

				if (channelTypes[Music.ChannelType.MIDI]) {
					let inst = new Music.Patch.MIDI({
						midiBank: 0,
						midiPatch: 1,
					});
					defaultMusic.patches.push(inst);

					defaultMusic.trackConfig.push(new Music.TrackConfiguration({
						channelType: Music.ChannelType.MIDI,
						channelIndex: 0,
					}));
				}

				if (channelTypes[Music.ChannelType.PCM]) {
					let inst = new Music.Patch.PCM({
						sampleRate: 8000,
					});
					defaultMusic.patches.push(inst);

					defaultMusic.trackConfig.push(new Music.TrackConfiguration({
						channelType: Music.ChannelType.PCM,
						channelIndex: 0,
					}));
				}

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
					assert.ok(events[0], 'parse() returned patterns[0].tracks[0].events[0] as invalid');
					assert.equal(events[0].type, Music.NoteOnEvent);
					assert.equal(events[1].type, Music.DelayEvent);
					assert.equal(events[2].type, Music.NoteOffEvent);
					assert.equal(events[3].type, Music.NoteOnEvent);
					assert.equal(events[4].type, Music.DelayEvent);
					assert.equal(events[5].type, Music.NoteOffEvent);

					TestUtil.almostEqual(events[0].frequency, 440, 0.1);
					TestUtil.almostEqual(events[4].frequency, 92.5, 0.1);
				});

				it('should have the standard number of events', function() {
					assert.equal(music.patterns.length, 1);
					assert.equal(music.patterns[0].tracks.length, 1, 'Wrong number of tracks.');
					assert.equal(music.patterns[0].tracks[0].events.length, 6, 'Wrong number of events in first track.');
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

					const gen = handler.generate(defaultMusic);

					TestUtil.contentEqual(content.default, gen.content);
					// TODO: Test supps
				});

			});

			describe('identify()', function() {

				it('should not negatively identify itself', function() {
					const result = handler.identify(
						content.default.main,
						content.default.main.filename
					);
					assert.ok(result.valid === true || result.valid === undefined,
						`Failed to recognise standard file: ${result.reason}`);
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
