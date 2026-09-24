/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

// matches PDF files starting with billOfading number with one file extension
export function getBolNumFromFilename(filename: string): string | null {
	// ([A-Z | a-z | 0-9]+) first group -> bolNumMatch[1]
	// optional "_vyd" without "."
	// must end with ".pdf"
	// examples:
	// 26EDI0001.pdf
	// 26EDI0001_vyd.pdf
	const bolNumMatch = filename.match(/^([A-Za-z0-9]+)(_[^.]*)?\.pdf$/);

	// if there is no match OR the second group is NOT '_vyd' AND also not nothing returns null
	if (
		!bolNumMatch ||
		(bolNumMatch[2] !== '_vyd' && bolNumMatch[2] !== undefined)
	)
		return null;

	return bolNumMatch[1];
}

// matches PDF files named ASF_[DL].pdf
export function getBolNumFromFilenameNagel(filename: string): string | null {
	// ASF_[DL].pdf
	const bolNumMatch = filename.match(/^ASF_([A-Za-z0-9]+).pdf$/);
	if (!bolNumMatch) return null;

	return bolNumMatch[1];
}
