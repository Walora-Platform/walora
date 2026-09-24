/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { saveAs } from "file-saver";
import type { AxiosResponse } from "axios";

// downloads a blob response whose Content-Disposition header is `attachment; filename="..."`
export function downloadFileFromResponse(res: AxiosResponse<Blob>) {
	const contentDisposition = res.headers["content-disposition"].split(
		"filename=",
	)[1]; // attachment; filename="tarif"
	const filename = JSON.parse(contentDisposition);

	saveAs(res.data, filename);
}
