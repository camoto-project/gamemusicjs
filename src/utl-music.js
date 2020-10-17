/**
 * @file Utility functions for working with Music instances.
 * @private
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

const Debug = require('./utl-debug.js')('utl-music');
const Music = require('./music.js');

/**
 * Utility functions for working with Music instances.
 */
class UtilMusic
{
	/**
	 * Split a single list of events into a single pattern of multiple tracks.
	 *
	 * @param {Array<Event>} events
	 *
	 * @param {Function} fnGetTrackConfig
	 *   Function called with each event, and returns a TrackConfiguration
	 *   instance for the track that event should appear in.
	 *   For OPL data produced by {@link UtilOPL.parseOPL UtilOPL.parseOPL()}, the function
	 *   `UtilOPL.standardTrackSplitConfig` can be passed here to save writing
	 *   your own function for OPL data.
	 *
	 * @return {Music.Pattern} Track list suitable for appending to
	 *   {@link Music.patterns}.
	 */
	static splitEvents(events, fnGetTrackConfig) {
		const debug = Debug.extend('splitEvents');

		let pattern = new Music.Pattern();
		let trackConfig = [];

		// Split all the events up into separate channels.
		let channels = [];
		let absTime = 0;
		for (const ev of events) {
			if (ev.type === Music.DelayEvent) {
				absTime += ev.ticks;
				continue;
			}

			const tc = fnGetTrackConfig(ev);
			if (!tc) {
				throw new Error('fnGetTrackConfig failed to return a track index.');
			}
			if (!pattern.tracks[tc.trackIndex]) {
				pattern.tracks[tc.trackIndex] = {
					absTimeLastEvent: 0,
					events: [],
				};
				trackConfig[tc.trackIndex] = tc;
			}

			let track = pattern.tracks[tc.trackIndex];

			const eventPreDelay = absTime - track.absTimeLastEvent;
			if (eventPreDelay) {
				track.events.push(new Music.DelayEvent({ticks: eventPreDelay}));
			}
			//let cpEvent = ev.clone();
			track.events.push(ev);

			track.absTimeLastEvent = absTime;
		}

		// Tidy up.
		let cleanTracks = [], cleanTrackConfig = [];
		for (let idxTrack in pattern.tracks) {
			if (!pattern.tracks[idxTrack]) continue;
			delete pattern.tracks[idxTrack].absTimeLastEvent;
			cleanTracks.push(pattern.tracks[idxTrack]);
			cleanTrackConfig.push(trackConfig[idxTrack]);
		}
		pattern.tracks = cleanTracks;
		trackConfig = cleanTrackConfig;

		debug('Split events into channels:', trackConfig.map(tc =>
			`${Music.ChannelType.toString(tc.channelType)}-${tc.channelIndex}`
		));
		debug(`Split events into ${pattern.tracks.length} tracks.`);

		return {
			trackConfig: trackConfig,
			pattern: pattern,
		};
	}

	static mergeTracks(events, tracks) {
		const absEvents = [];
		for (let idxTrack = 0; idxTrack < tracks.length; idxTrack++) {
			const track = tracks[idxTrack];
			let tTrack = 0;

			for (const ev of track.events) {
				ev.custom.absTime = tTrack;
				ev.custom.idxTrack = idxTrack;

				if (ev.type === Music.DelayEvent) {
					tTrack += ev.ticks;
				} else {
					absEvents.push(ev);
				}
			}
		}

		// Now convert all the absTime values into DelayEvents.
		let absLastTime = 0;
		absEvents.sort((a, b) => a.custom.absTime - b.custom.absTime);
		for (let ev of absEvents) {
			if (ev.custom.absTime > absLastTime) {
				events.push(new Music.DelayEvent({ticks: ev.custom.absTime - absLastTime}));
			}
			absLastTime = ev.custom.absTime;
			delete ev.custom.absTime;
			events.push(ev);
		}
	}

	/**
	 * Merge only the patterns together, returning one long multi-track pattern.
	 */
	static mergePatterns(patterns) {
		if (patterns.length === 0) return new Pattern();

		let finalPattern = patterns[0].clone();

		for (let idxPattern = 1; idxPattern < patterns.length; idxPattern++) {
			const pattern = patterns[idxPattern];

			for (let idxTrack = 0; idxTrack < pattern.tracks.length; idxTrack++) {
				const track = pattern.tracks[idxTrack];
				const finalTrack = finalPattern.tracks[idxTrack];

				for (const ev of track.events) {
					const evc = ev.clone();
					finalTrack.push(evc);
				}
			}
		}

		return finalPattern;
	}

	static mergePatternsAndTracks(patterns) {
		let events = [];

		for (let idxPattern = 0; idxPattern < patterns.length; idxPattern++) {
			const pattern = patterns[idxPattern];

			if ((!pattern.tracks) || (pattern.tracks.length === undefined)) {
				throw new Error(`Music.patterns[${idxPattern}].tracks must be an array.`);
			}

			const tTrack = this.mergeTracks(events, pattern.tracks);
		}

		// Now all the DelayEvents have been removed but `absTime` exists on
		// everything, so run through and convert `absTime` back into DelayEvents,
		// but this time everything will be in the same track.

		let finalEvents = [];
		let lastTick = 0;
		for (const ev of events) {
			// There's a delay before the next event, so add a DelayEvent for it.
			if (ev.custom.absTime > lastTick) {
				const delta = ev.absTime - lastTick;
				finalEvents.push(new Music.DelayEvent({
					ticks: delta,
				}));
			}

			// Add the event itself.
			delete ev.custom.absTime;
			finalEvents.push(ev);
		}

		return finalEvents;
	}

	/**
	 * Remove all tempo events and run events at fixed timing.
	 *
	 * This is used for formats like IMF that run at a fixed speed.  It will copy
	 * all the events into a new array and adjust any `DelayEvent` instances such
	 * that the song will play at the correct speed when played at a rate where
	 * each delay tick represents `usPerTick` microseconds.
	 *
	 * The returned array will have no `TempoEvent` instances, and every other
	 * event will have been cloned.
	 *
	 * @param {Array<Event>} Events to adjust.  These are copied and this
	 *   parameter is not modified upon return.
	 *
	 * @param {Number} usPerTick
	 *   Number of microseconds each tick should represent in the returned delay
	 *   values.  This is the target tempo and the event timings will be adjusted
	 *   to match this rate.  For a tick rate of 700 ticks per second, pass
	 *   `1000000 / 700` as this parameter to convert the value into microseconds
	 *   per tick.
	 */
	static fixedTempo(events, usPerTick) {
		let output = [];
		let factor = 1;
		for (const evSrc of events) {
			if (evSrc.type === Music.TempoEvent) {
				factor = evSrc.usPerTick / usPerTick;
				// Don't copy tempo events across.
				continue;
			}

			let evDst = evSrc.clone();
			if (evDst.type === Music.DelayEvent) {
				evDst.ticks *= factor;
			}

			output.push(evDst);
		}

		return output;
	}
}

module.exports = UtilMusic;
