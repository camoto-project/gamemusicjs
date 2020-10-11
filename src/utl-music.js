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
	 * @param {Function} fnGetTrackIndex
	 *   Function called with each event, and returns an integer for the track
	 *   number that event should appear in.
	 *
	 * @return {Music.Pattern} Track list suitable for appending to
	 *   {@link Music.patterns}.
	 */
	static splitEvents(events, fnGetTrackIndex) {
		const debug = Debug.extend('splitEvents');

		// Split all the events up into separate channels
		let channels = [];
		let absTime = 0;
		for (const ev of events) {
			const c = fnGetTrackIndex(ev);
			if (c === undefined) {
				throw new Error('fnTrackIndex failed to return a track index.');
			}
			if (!channels[c]) {
				channels[c] = {
					absTimeLastEvent: 0,
					events: [],
				};
			}
			absTime += ev.preDelay;

			let cpEvent = ev.clone();
			cpEvent.preDelay = absTime - channels[c].absTimeLastEvent;
			channels[c].events.push(ev);

			channels[c].absTimeLastEvent += absTime;
		}
		debug('Split events into channels:', Object.keys(channels));

		let pattern = new Music.Pattern();
		let trackConfig = [];

		for (const idxChannel in channels) {
			const ch = channels[idxChannel];
			let track = new Music.Track();
			track.events = ch.events;

			let tc = new Music.TrackConfiguration();
			tc.channelType = Music.ChannelType.OPL;
			tc.channelIndex = idxChannel;
			trackConfig.push(tc);

			pattern.tracks.push(track);
		}
		debug(`Split events into ${pattern.tracks.length} tracks.`);

		return {
			trackConfig: trackConfig,
			pattern: pattern,
		};
	}

	static mergePatterns(patterns) {
		let events = [];

		let tPattern = 0;
		for (let idxPattern = 0; idxPattern < patterns.length; idxPattern++) {
			const pattern = patterns[idxPattern];

			if ((!pattern.tracks) || (pattern.tracks.length === undefined)) {
				throw new Error(`Music.patterns[${idxPattern}].tracks must be an array.`);
			}

			let tTrack = 0;
			for (let idxTrack = 0; idxTrack < pattern.tracks.length; idxTrack++) {
				const track = pattern.tracks[idxTrack];

				for (const ev of track.events) {
					ev.absTime = tPattern + tTrack;
					ev.idxTrack = idxTrack;

					if (ev.type === Music.DelayEvent) {
						tTrack += ev.ticks;
					} else {
						events.push(ev);
					}
				}
			}

			tPattern += tTrack;
		}

		// Now all the DelayEvents have been removed but `absTime` exists on
		// everything, so run through and convert `absTime` back into DelayEvents,
		// but this time everything will be in the same track.

		let finalEvents = [];
		let lastTick = 0;
		for (const ev of events) {
			// There's a delay before the next event, so add a DelayEvent for it.
			if (ev.absTime > lastTick) {
				const delta = ev.absTime - lastTick;
				finalEvents.push(new Music.DelayEvent({
					ticks: delta,
				}));
			}

			// Add the event itself.
			delete ev.absTime;
			finalEvents.push(ev);
		}

		return finalEvents;
	}

	/**
	 * Remove all tempo events and run events at fixed timing.
	 *
	 * This is used for formats like IMF that run at a fixed speed.  It will copy
	 * all the events into a new array and adjust the `preDelay` such that the
	 * song will play at the correct speed when played at a rate where each
	 * preDelay tick represents `usPerTick` microseconds.
	 *
	 * Upon return, all tempo events will be removed.
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
		for (const evSrc of events) {
			let evDst = evSrc.clone();

			// Also copy across our custom data used by mergePatterns().
			evDst.idxTrack = evSrc.idxTrack;

// TODO: adjust timings
			output.push(evDst);
		}

		return output;
	}
}

module.exports = UtilMusic;
