/*
 * Tests for utl-music.js.
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

const assert = require('assert');

const Music = require('../src/music.js');
const UtilMusic = require('../src/utl-music.js');

describe(`UtilMusic tests`, function() {

	describe('splitEvents()', function() {
		const fnGetTrackConfig = ev => {
			let tc = new Music.TrackConfiguration({
				channelType: Music.ChannelType.OPLT,
				channelIndex: ev.custom._test_channel_index,
			});
			tc.trackIndex = ev.custom._test_track_index;
			return tc;
		};

		it('various values are split correctly', function() {
			const inputEvents = [
				new Music.NoteOnEvent({
					frequency: 110,
					velocity: 1,
					instrument: 0,
					custom: {
						_test_channel_index: 1,
						_test_track_index: 0,
					},
				}),
				new Music.NoteOnEvent({
					frequency: 220,
					velocity: 1,
					instrument: 0,
					custom: {
						_test_channel_index: 2,
						_test_track_index: 1,
					},
				}),
				new Music.DelayEvent({ticks: 20}),
				new Music.NoteOffEvent({
					custom: {
						_test_channel_index: 1,
						_test_track_index: 0,
					},
				}),
				new Music.DelayEvent({ticks: 10}),
				new Music.NoteOffEvent({
					custom: {
						_test_channel_index: 2,
						_test_track_index: 1,
					},
				}),
			];

			const r = UtilMusic.splitEvents(inputEvents, fnGetTrackConfig);

			assert.ok(r.trackConfig);
			assert.ok(r.trackConfig[0]);
			assert.equal(r.trackConfig[0].channelType, Music.ChannelType.OPLT);
			assert.equal(r.trackConfig[0].channelIndex, 1);

			assert.ok(r.trackConfig[1]);
			assert.equal(r.trackConfig[1].channelType, Music.ChannelType.OPLT);
			assert.equal(r.trackConfig[1].channelIndex, 2);

			assert.ok(r.pattern);
			assert.ok(r.pattern.tracks);
			assert.ok(r.pattern.tracks[0]);
			assert.ok(r.pattern.tracks[0].events);
			assert.ok(r.pattern.tracks[1]);
			assert.ok(r.pattern.tracks[1].events);

			assert.ok(r.pattern.tracks[0].events[0]);
			assert.equal(r.pattern.tracks[0].events[0].type, Music.NoteOnEvent);
			assert.equal(r.pattern.tracks[0].events[0].frequency, 110);
			assert.equal(r.pattern.tracks[0].events[1].type, Music.DelayEvent);
			assert.equal(r.pattern.tracks[0].events[1].ticks, 20);
			assert.equal(r.pattern.tracks[0].events[2].type, Music.NoteOffEvent);

			assert.ok(r.pattern.tracks[1].events[0]);
			assert.equal(r.pattern.tracks[1].events[0].type, Music.NoteOnEvent);
			assert.equal(r.pattern.tracks[1].events[0].frequency, 220);
			assert.equal(r.pattern.tracks[1].events[1].type, Music.DelayEvent);
			assert.equal(r.pattern.tracks[1].events[1].ticks, 30);
			assert.equal(r.pattern.tracks[1].events[2].type, Music.NoteOffEvent);
		});
	}); // midiToFrequency()

	describe('mergeTracks()', function() {
		it('various values are merged correctly', function() {
			let events = [];

			let tracks = [
				new Music.Track(),
				new Music.Track(),
			];

			tracks[0].events = [
				new Music.NoteOnEvent({
					frequency: 110,
					velocity: 1,
					instrument: 0,
					custom: {
						_test_channel_index: 1,
						_test_track_index: 0,
					},
				}),
				new Music.DelayEvent({ticks: 20}),
				new Music.NoteOffEvent({
					custom: {
						_test_channel_index: 1,
						_test_track_index: 0,
					},
				}),
			];

			tracks[1].events = [
				new Music.NoteOnEvent({
					frequency: 220,
					velocity: 1,
					instrument: 0,
					custom: {
						_test_channel_index: 2,
						_test_track_index: 1,
					},
				}),
				new Music.DelayEvent({ticks: 30}),
				new Music.NoteOffEvent({
					custom: {
						_test_channel_index: 2,
						_test_track_index: 1,
					},
				}),
			];

			UtilMusic.mergeTracks(events, tracks);

			assert.ok(events[0]);
			assert.equal(events[0].type, Music.NoteOnEvent);
			assert.equal(events[0].frequency, 110);
			assert.equal(events[1].type, Music.NoteOnEvent);
			assert.equal(events[1].frequency, 220);
			assert.equal(events[2].type, Music.DelayEvent);
			assert.equal(events[2].ticks, 20);
			assert.equal(events[3].type, Music.NoteOffEvent);
			assert.equal(events[4].type, Music.DelayEvent);
			assert.equal(events[4].ticks, 10);
			assert.equal(events[5].type, Music.NoteOffEvent);
		});
	}); // mergeTracks()

	describe('fixedTempo()', function() {
		it('same tempo does not change anything', function() {
			const genericEvent = new Music.ConfigurationEvent({
				option: Music.ConfigurationEvent.Option.EnableWaveSel,
				value: true,
			});
			const initialTempo = new Music.TempoEvent({usPerTick: 1000});

			let srcEvents = [
				new Music.TempoEvent({usPerTick: 1000}),
				genericEvent,
				new Music.DelayEvent({ticks: 10}),
				genericEvent,
				new Music.DelayEvent({ticks: 10}),
				new Music.TempoEvent({usPerTick: 1000}),
				new Music.DelayEvent({ticks: 10}),
				genericEvent,
				new Music.DelayEvent({ticks: 10}),
			];

			const dstEvents = UtilMusic.fixedTempo(
				srcEvents,
				initialTempo,
				new Music.TempoEvent({usPerTick: 1000})
			);

			assert.ok(dstEvents[0]);
			assert.equal(dstEvents[1].ticks, 10);
			assert.equal(dstEvents[3].ticks, 10);
			assert.equal(dstEvents[4].ticks, 10);
			assert.equal(dstEvents[6].ticks, 10);
		});

		it('double tempo doubles ticks', function() {
			const genericEvent = new Music.ConfigurationEvent({
				option: Music.ConfigurationEvent.Option.EnableWaveSel,
				value: true,
			});
			const initialTempo = new Music.TempoEvent({usPerTick: 1000});

			let srcEvents = [
				new Music.TempoEvent({usPerTick: 1000}),
				genericEvent,
				new Music.DelayEvent({ticks: 10}),
				genericEvent,
				new Music.DelayEvent({ticks: 10}),
				new Music.TempoEvent({usPerTick: 1000}),
				new Music.DelayEvent({ticks: 10}),
				genericEvent,
				new Music.DelayEvent({ticks: 10}),
			];

			const dstEvents = UtilMusic.fixedTempo(
				srcEvents,
				initialTempo,
				new Music.TempoEvent({usPerTick: 500})
			);

			assert.ok(dstEvents[0]);
			assert.equal(dstEvents[1].ticks, 20);
			assert.equal(dstEvents[3].ticks, 20);
			assert.equal(dstEvents[4].ticks, 20);
			assert.equal(dstEvents[6].ticks, 20);
		});

		it('mid-song changes work', function() {
			const genericEvent = new Music.ConfigurationEvent({
				option: Music.ConfigurationEvent.Option.EnableWaveSel,
				value: true,
			});
			const initialTempo = new Music.TempoEvent({usPerTick: 1000});

			let srcEvents = [
				new Music.TempoEvent({usPerTick: 1000}),
				genericEvent,
				new Music.DelayEvent({ticks: 10}),
				genericEvent,
				new Music.DelayEvent({ticks: 10}),
				new Music.TempoEvent({usPerTick: 2000}),
				new Music.DelayEvent({ticks: 10}),
				genericEvent,
				new Music.DelayEvent({ticks: 10}),
			];

			const dstEvents = UtilMusic.fixedTempo(
				srcEvents,
				initialTempo,
				new Music.TempoEvent({usPerTick: 500})
			);

			assert.ok(dstEvents[0]);
			assert.equal(dstEvents[1].ticks, 20);
			assert.equal(dstEvents[3].ticks, 20);
			assert.equal(dstEvents[4].ticks, 40);
			assert.equal(dstEvents[6].ticks, 40);
		});

		it('does not lose custom data', function() {
			const genericEvent = new Music.ConfigurationEvent({
				option: Music.ConfigurationEvent.Option.EnableWaveSel,
				value: true,
				custom: 'a',
			});
			const initialTempo = new Music.TempoEvent({usPerTick: 1000});

			let srcEvents = [
				new Music.TempoEvent({usPerTick: 1000}),
				genericEvent,
				new Music.DelayEvent({ticks: 10}),
				genericEvent,
				new Music.DelayEvent({ticks: 10}),
				new Music.TempoEvent({usPerTick: 2000}),
				new Music.DelayEvent({ticks: 10}),
				genericEvent,
				new Music.DelayEvent({ticks: 10}),
			];

			const dstEvents = UtilMusic.fixedTempo(
				srcEvents,
				initialTempo,
				new Music.TempoEvent({usPerTick: 500})
			);

			assert.ok(dstEvents[0]);
			assert.equal(dstEvents[0].custom, 'a');
			assert.equal(dstEvents[2].custom, 'a');
			assert.equal(dstEvents[5].custom, 'a');
		});
	}); // fixedTempo()

	describe('initialEvents()', function() {
		it('removing event works', function() {
			const genericEvent = new Music.ConfigurationEvent({
				option: Music.ConfigurationEvent.Option.EnableWaveSel,
				value: true,
			});

			let srcEvents = [
				new Music.TempoEvent({usPerTick: 1000}),
				genericEvent,
				new Music.DelayEvent({ticks: 10}),
				genericEvent,
				new Music.DelayEvent({ticks: 10}),
				new Music.TempoEvent({usPerTick: 1000}),
				new Music.DelayEvent({ticks: 10}),
				genericEvent,
				new Music.DelayEvent({ticks: 10}),
			];

			let music = new Music();
			music.initialTempo.usPerTick = 500;
			music.patterns.push(new Music.Pattern());
			music.patterns[0].tracks.push(new Music.Track());
			music.patterns[0].tracks[0].events = srcEvents;

			UtilMusic.initialEvents(music, ev => {
				if (ev.type === Music.TempoEvent) {
					// Remove initial tempo event, updating the initialTempo.
					music.initialTempo = ev;
					return null; // delete the event from the track
				}
				return false; // keep going
			});

			assert.equal(music.initialTempo.usPerTick, 1000, 'initialTempo not updated');

			const dstEvents = music.patterns[0].tracks[0].events;
			assert.ok(dstEvents[0], 'First TempoEvent not removed correctly');
			assert.notEqual(dstEvents[0].type, Music.TempoEvent, 'TempoEvent not removed');
			assert.equal(dstEvents[0].type, Music.ConfigurationEvent, 'New first event is wrong type');
			assert.equal(dstEvents[1].ticks, 10);
			assert.equal(dstEvents[3].ticks, 10);
			assert.equal(dstEvents[5].ticks, 10);
			assert.equal(dstEvents[7].ticks, 10);
		});
	}); // initialEvents()

}); // UtilMIDI tests
