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

import assert from 'assert';
import { Music, Events, UtilMusic } from '../index.js';

describe(`UtilMusic tests`, function() {

	describe('splitEvents()', function() {
		const fnGetTrackConfig = ev => {
			let tc = new Music.TrackConfiguration({
				channelType: Music.TrackConfiguration.ChannelType.OPLT,
				channelIndex: ev.custom._test_channel_index,
			});
			tc.trackIndex = ev.custom._test_track_index;
			return tc;
		};

		it('various values are split correctly', function() {
			const inputEvents = [
				new Events.NoteOn({
					frequency: 110,
					velocity: 1,
					instrument: 0,
					custom: {
						_test_channel_index: 1,
						_test_track_index: 0,
					},
				}),
				new Events.NoteOn({
					frequency: 220,
					velocity: 1,
					instrument: 0,
					custom: {
						_test_channel_index: 2,
						_test_track_index: 1,
					},
				}),
				new Events.Delay({ticks: 20}),
				new Events.NoteOff({
					custom: {
						_test_channel_index: 1,
						_test_track_index: 0,
					},
				}),
				new Events.Delay({ticks: 10}),
				new Events.NoteOff({
					custom: {
						_test_channel_index: 2,
						_test_track_index: 1,
					},
				}),
			];

			const r = UtilMusic.splitEvents(inputEvents, fnGetTrackConfig);

			assert.ok(r.trackConfig);
			assert.ok(r.trackConfig[0]);
			assert.equal(r.trackConfig[0].channelType, Music.TrackConfiguration.ChannelType.OPLT);
			assert.equal(r.trackConfig[0].channelIndex, 1);

			assert.ok(r.trackConfig[1]);
			assert.equal(r.trackConfig[1].channelType, Music.TrackConfiguration.ChannelType.OPLT);
			assert.equal(r.trackConfig[1].channelIndex, 2);

			assert.ok(r.pattern);
			assert.ok(r.pattern.tracks);
			assert.ok(r.pattern.tracks[0]);
			assert.ok(r.pattern.tracks[0].events);
			assert.ok(r.pattern.tracks[1]);
			assert.ok(r.pattern.tracks[1].events);

			assert.ok(r.pattern.tracks[0].events[0]);
			assert.equal(r.pattern.tracks[0].events[0].type, Events.NoteOn);
			assert.equal(r.pattern.tracks[0].events[0].frequency, 110);
			assert.equal(r.pattern.tracks[0].events[1].type, Events.Delay);
			assert.equal(r.pattern.tracks[0].events[1].ticks, 20);
			assert.equal(r.pattern.tracks[0].events[2].type, Events.NoteOff);

			assert.ok(r.pattern.tracks[1].events[0]);
			assert.equal(r.pattern.tracks[1].events[0].type, Events.NoteOn);
			assert.equal(r.pattern.tracks[1].events[0].frequency, 220);
			assert.equal(r.pattern.tracks[1].events[1].type, Events.Delay);
			assert.equal(r.pattern.tracks[1].events[1].ticks, 30);
			assert.equal(r.pattern.tracks[1].events[2].type, Events.NoteOff);
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
				new Events.NoteOn({
					frequency: 110,
					velocity: 1,
					instrument: 0,
					custom: {
						_test_channel_index: 1,
						_test_track_index: 0,
					},
				}),
				new Events.Delay({ticks: 20}),
				new Events.NoteOff({
					custom: {
						_test_channel_index: 1,
						_test_track_index: 0,
					},
				}),
			];

			tracks[1].events = [
				new Events.NoteOn({
					frequency: 220,
					velocity: 1,
					instrument: 0,
					custom: {
						_test_channel_index: 2,
						_test_track_index: 1,
					},
				}),
				new Events.Delay({ticks: 30}),
				new Events.NoteOff({
					custom: {
						_test_channel_index: 2,
						_test_track_index: 1,
					},
				}),
			];

			UtilMusic.mergeTracks(events, tracks);

			assert.ok(events[0]);
			assert.equal(events[0].type, Events.NoteOn);
			assert.equal(events[0].frequency, 110);
			assert.equal(events[1].type, Events.NoteOn);
			assert.equal(events[1].frequency, 220);
			assert.equal(events[2].type, Events.Delay);
			assert.equal(events[2].ticks, 20);
			assert.equal(events[3].type, Events.NoteOff);
			assert.equal(events[4].type, Events.Delay);
			assert.equal(events[4].ticks, 10);
			assert.equal(events[5].type, Events.NoteOff);
		});
	}); // mergeTracks()

	describe('fixedTempo()', function() {
		it('same tempo does not change anything', function() {
			const genericEvent = new Events.Configuration({
				option: Events.Configuration.Option.EnableWaveSel,
				value: true,
			});
			const initialTempo = new Events.Tempo({usPerTick: 1000});

			let srcEvents = [
				new Events.Tempo({usPerTick: 1000}),
				genericEvent,
				new Events.Delay({ticks: 10}),
				genericEvent,
				new Events.Delay({ticks: 10}),
				new Events.Tempo({usPerTick: 1000}),
				new Events.Delay({ticks: 10}),
				genericEvent,
				new Events.Delay({ticks: 10}),
			];

			const dstEvents = UtilMusic.fixedTempo(
				srcEvents,
				initialTempo,
				new Events.Tempo({usPerTick: 1000})
			);

			assert.ok(dstEvents[0]);
			assert.equal(dstEvents[1].ticks, 10);
			assert.equal(dstEvents[3].ticks, 10);
			assert.equal(dstEvents[4].ticks, 10);
			assert.equal(dstEvents[6].ticks, 10);
		});

		it('double tempo doubles ticks', function() {
			const genericEvent = new Events.Configuration({
				option: Events.Configuration.Option.EnableWaveSel,
				value: true,
			});
			const initialTempo = new Events.Tempo({usPerTick: 1000});

			let srcEvents = [
				new Events.Tempo({usPerTick: 1000}),
				genericEvent,
				new Events.Delay({ticks: 10}),
				genericEvent,
				new Events.Delay({ticks: 10}),
				new Events.Tempo({usPerTick: 1000}),
				new Events.Delay({ticks: 10}),
				genericEvent,
				new Events.Delay({ticks: 10}),
			];

			const dstEvents = UtilMusic.fixedTempo(
				srcEvents,
				initialTempo,
				new Events.Tempo({usPerTick: 500})
			);

			assert.ok(dstEvents[0]);
			assert.equal(dstEvents[1].ticks, 20);
			assert.equal(dstEvents[3].ticks, 20);
			assert.equal(dstEvents[4].ticks, 20);
			assert.equal(dstEvents[6].ticks, 20);
		});

		it('mid-song changes work', function() {
			const genericEvent = new Events.Configuration({
				option: Events.Configuration.Option.EnableWaveSel,
				value: true,
			});
			const initialTempo = new Events.Tempo({usPerTick: 1000});

			let srcEvents = [
				new Events.Tempo({usPerTick: 1000}),
				genericEvent,
				new Events.Delay({ticks: 10}),
				genericEvent,
				new Events.Delay({ticks: 10}),
				new Events.Tempo({usPerTick: 2000}),
				new Events.Delay({ticks: 10}),
				genericEvent,
				new Events.Delay({ticks: 10}),
			];

			const dstEvents = UtilMusic.fixedTempo(
				srcEvents,
				initialTempo,
				new Events.Tempo({usPerTick: 500})
			);

			assert.ok(dstEvents[0]);
			assert.equal(dstEvents[1].ticks, 20);
			assert.equal(dstEvents[3].ticks, 20);
			assert.equal(dstEvents[4].ticks, 40);
			assert.equal(dstEvents[6].ticks, 40);
		});

		it('does not lose custom data', function() {
			const genericEvent = new Events.Configuration({
				option: Events.Configuration.Option.EnableWaveSel,
				value: true,
				custom: 'a',
			});
			const initialTempo = new Events.Tempo({usPerTick: 1000});

			let srcEvents = [
				new Events.Tempo({usPerTick: 1000}),
				genericEvent,
				new Events.Delay({ticks: 10}),
				genericEvent,
				new Events.Delay({ticks: 10}),
				new Events.Tempo({usPerTick: 2000}),
				new Events.Delay({ticks: 10}),
				genericEvent,
				new Events.Delay({ticks: 10}),
			];

			const dstEvents = UtilMusic.fixedTempo(
				srcEvents,
				initialTempo,
				new Events.Tempo({usPerTick: 500})
			);

			assert.ok(dstEvents[0]);
			assert.equal(dstEvents[0].custom, 'a');
			assert.equal(dstEvents[2].custom, 'a');
			assert.equal(dstEvents[5].custom, 'a');
		});
	}); // fixedTempo()

	describe('initialEvents()', function() {
		it('removing event works', function() {
			const genericEvent = new Events.Configuration({
				option: Events.Configuration.Option.EnableWaveSel,
				value: true,
			});

			let srcEvents = [
				new Events.Tempo({usPerTick: 1000}),
				genericEvent,
				new Events.Delay({ticks: 10}),
				genericEvent,
				new Events.Delay({ticks: 10}),
				new Events.Tempo({usPerTick: 1000}),
				new Events.Delay({ticks: 10}),
				genericEvent,
				new Events.Delay({ticks: 10}),
			];

			let music = new Music();
			music.initialTempo.usPerTick = 500;
			music.patterns.push(new Music.Pattern());
			music.patterns[0].tracks.push(new Music.Track());
			music.patterns[0].tracks[0].events = srcEvents;

			UtilMusic.initialEvents(music, ev => {
				if (ev.type === Events.Tempo) {
					// Remove initial tempo event, updating the initialTempo.
					music.initialTempo = ev;
					return null; // delete the event from the track
				}
				return false; // keep going
			});

			assert.equal(music.initialTempo.usPerTick, 1000, 'initialTempo not updated');

			const dstEvents = music.patterns[0].tracks[0].events;
			assert.ok(dstEvents[0], 'First TempoEvent not removed correctly');
			assert.notEqual(dstEvents[0].type, Events.Tempo, 'TempoEvent not removed');
			assert.equal(dstEvents[0].type, Events.Configuration, 'New first event is wrong type');
			assert.equal(dstEvents[1].ticks, 10);
			assert.equal(dstEvents[3].ticks, 10);
			assert.equal(dstEvents[5].ticks, 10);
			assert.equal(dstEvents[7].ticks, 10);
		});
	}); // initialEvents()

}); // UtilMIDI tests
