/*
 * OPL rhythm-mode declarations.
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

/**
 * Type of rhythm-mode instrument.
 *
 * @enum {Number}
 */
const Rhythm = {
	/**
	 * Normal melodic instrument.
	 */
	NO: 0,

	/**
	 * Hi-hat.
	 */
	HH: 1,

	/**
	 * Top cymbal.
	 */
	CY: 2,

	/**
	 * Tom tom.
	 */
	TT: 3,

	/**
	 * Snare drum.
	 */
	SD: 4,

	/**
	 * Bass drum.
	 */
	BD: 5,
};

Rhythm.toString = v => Object.keys(Rhythm)[v] || '??';

export default Rhythm;
