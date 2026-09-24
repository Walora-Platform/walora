/**
 * Copyright 2025-2026 Tomáš Bordák
 *
 * Licensed under the Apache License, Version 2.0.
 * See the LICENSE file in the project root for details.
 */

import { Worker, Job, Queue } from 'bullmq';
import redisConnection from '../config/redis.js';
import prisma from '../config/prisma.js';
import { Client } from 'basic-ftp';
import { createDocumentStorageDir } from '../utils/createDocumentStorageDir.js';
import fs from 'fs/promises';
import { v7 as uuidv7 } from 'uuid';
import path from 'path';
import {
	getBolNumFromFilename,
	getBolNumFromFilenameNagel,
} from '../utils/getBolNumFromFilename.js';
import { getYesterdayInterval } from '../utils/getYesterdayInterval.js';
import { currentDateTimeString } from '../utils/currentDateTimeString.js';

const documentsWorker = new Worker(
	'documents',
	async (job) => {
		try {
			switch (job.name) {
				case 'collect-confirmed-bill-of-lading': {
					let client: Client | null = null;

					try {
						client = new Client();

						// connect to FTP
						await client.access({
							host: process.env.FTP_HOST,
							user: process.env.FTP_USER,
							password: process.env.FTP_PASSWORD,
							timeout: 10000, // 10 seconds
						});

						// make sure the ARCHIVE directory exists
						const archiveDir = process.env.FTP_CONFIRMED_BOL_DIR_ARCHIVE;
						await client.ensureDir(archiveDir); // creates the directory if not exists AND !!changes working directory!!

						// make sure the IMPORT directory exists and change directory to it
						const importDir = process.env.FTP_CONFIRMED_BOL_DIR;
						await client.ensureDir(importDir); // also changes current working directory to provided path WHICH IS WHERE THE FILES ARE

						// ensure document storage dir exists (app/documents/YYYY/MM/)
						const storageDir = await createDocumentStorageDir();

						// get PDF files from IMPORT
						const files = await client.list();
						const pdfFiles = files.filter((f) =>
							f.name.toLowerCase().endsWith('.pdf'),
						);

						if (!pdfFiles.length) {
							client.close();
							return;
						}

						console.log(
							`\n------ FOUND ${pdfFiles.length} CONFIRMED PDFs FROM NAGEL ${currentDateTimeString()} ------`,
						);

						for (const file of pdfFiles) {
							const bolNum = getBolNumFromFilenameNagel(file.name);
							if (!bolNum) continue;

							const parcels = await prisma.parcel.findMany({
								where: { billOfLadingNum: bolNum },
								select: { id: true },
							});

							if (!parcels.length) continue;

							console.log('File:', file.name, 'DL:', bolNum);
							console.log('\tMatched parcels');

							// create document in DB for all parcels with the same bolNum (it can happen, but duplicity will be manually deleted by 4PL user)
							for (const parcel of parcels) {
								console.log('\t', parcel.id);

								const fileId = uuidv7(); // generate the uuid here to not waste DB roundtrips
								const filenameToStore = `${fileId}.pdf`;
								const localPath = path.join(storageDir, filenameToStore);

								// download the PDF from FTP
								await client.downloadTo(localPath, file.name);

								await prisma.$transaction([
									// 1: attach document to parcel
									prisma.document.create({
										data: {
											id: fileId,
											path: localPath,
											originalName: file.name,
											type: 'CONFIRMED_BILL_OF_LADING',
											parcelId: parcel.id,
										},
									}),
									// 2: change billOfLadingAttachmentStatus
									prisma.parcel.update({
										where: {
											id: parcel.id,
										},
										data: {
											billOfLadingAttachmentStatus:
												'CONFIRMED_BILL_OF_LADING_ATTACHED',
										},
									}),
								]);
							}

							// move processed file to archive (if absolute path are used, current working directory has no effect)
							await client.rename(
								path.join(importDir, file.name),
								path.join(archiveDir, file.name),
							);

							console.log('\tMoved to archive');
						}
					} finally {
						if (client) client.close();
					}
					break;
				}

				case 'collect-unconfirmed-bill-of-lading': {
					let client: Client | null = null;

					try {
						client = new Client();

						// connect to FTP
						await client.access({
							host: process.env.FTP_HOST,
							user: process.env.FTP_USER,
							password: process.env.FTP_PASSWORD,
							timeout: 10000, // 10 seconds
						});

						// make sure the ARCHIVE directory exists
						const archiveDir = process.env.FTP_UNCONFIRMED_BOL_DIR_ARCHIVE;
						await client.ensureDir(archiveDir); // creates the directory if not exists AND !!changes working directory!!

						// make sure the IMPORT directory exists and change directory to it
						const importDir = process.env.FTP_UNCONFIRMED_BOL_DIR;
						await client.ensureDir(importDir); // also changes current working directory to provided path WHICH IS WHERE THE FILES ARE

						// ensure storage dir exists (app/documents/YYYY/MM/)
						const storageDir = await createDocumentStorageDir();

						// get PDF files from IMPORT
						const files = await client.list();
						const pdfFiles = files.filter((f) =>
							f.name.toLowerCase().endsWith('.pdf'),
						);

						if (!pdfFiles.length) {
							client.close();
							return;
						}

						console.log(
							`\n------ FOUND ${pdfFiles.length} UNCONFIRMED PDFs FROM CUSTOMER ${currentDateTimeString()} ------`,
						);
						for (const file of pdfFiles) {
							const bolNum = getBolNumFromFilename(file.name);
							if (!bolNum) continue;

							const parcels = await prisma.parcel.findMany({
								where: { billOfLadingNum: bolNum },
								select: { id: true, billOfLadingAttachmentStatus: true },
							});

							if (!parcels.length) continue;

							console.log('File:', file.name, 'DL:', bolNum);
							console.log('\tMatched parcels');

							// create document in DB for all parcels with the same bolNum (it can happen, but duplicity will be manually deleted by 4PL user)
							for (const parcel of parcels) {
								console.log('\t', parcel.id);

								const fileId = uuidv7(); // generate the uuid here to not waste DB roundtrips
								const filenameToStore = `${fileId}.pdf`;
								const localPath = path.join(storageDir, filenameToStore);

								// download the PDF from FTP
								await client.downloadTo(localPath, file.name);

								// check if there is already confirmed BOL -> in that case dont change the status
								if (
									parcel.billOfLadingAttachmentStatus ===
									'CONFIRMED_BILL_OF_LADING_ATTACHED'
								) {
									// just create and attach the UNCONFIRMED
									await prisma.document.create({
										data: {
											id: fileId,
											path: localPath,
											originalName: file.name,
											type: 'UNCONFIRMED_BILL_OF_LADING',
											parcelId: parcel.id,
										},
									});
								} else {
									await prisma.$transaction([
										// 1: attach document to parcel
										prisma.document.create({
											data: {
												id: fileId,
												path: localPath,
												originalName: file.name,
												type: 'UNCONFIRMED_BILL_OF_LADING',
												parcelId: parcel.id,
											},
										}),
										// 2: change billOfLadingAttachmentStatus
										prisma.parcel.update({
											where: {
												id: parcel.id,
											},
											data: {
												billOfLadingAttachmentStatus:
													'UNCONFIRMED_BILL_OF_LADING_ATTACHED',
											},
										}),
									]);
								}
							}

							// move processed file to archive (if absolute path are used, current working directory has no effect)
							await client.rename(
								path.join(importDir, file.name),
								path.join(archiveDir, file.name),
							);

							console.log('\tMoved to archive');
						}
					} finally {
						if (client) client.close();
					}
					break;
				}

				case 'check-unconfirmed-bill-of-lading-attached': {
					const yesterday = getYesterdayInterval();

					const result = await prisma.parcel.updateMany({
						where: {
							createdAt: yesterday,
							billOfLadingAttachmentStatus: null,
						},
						data: {
							billOfLadingAttachmentStatus:
								'UNCONFIRMED_BILL_OF_LADING_NOT_ATTACHED_IN_TIME',
						},
					});

					if (result.count) {
						console.log(
							`\n------ System found unconfirmed DL on ${result.count} yesterday's parcels on ${currentDateTimeString()} ------`,
						);
					}

					break;
				}

				default: {
					console.log(
						`\n------ Unknown job name "${job.name}" in DocumentsWorker on ${currentDateTimeString()} ------`,
					);
				}
			}
		} catch (err) {
			console.error(`DocumentsWorker - Failed to process job ${job.id}`, err);
			throw err; // will trigger retry
		}
	},
	{
		connection: redisConnection,
		concurrency: 1, // only 1 worker (no parallelism and no race conditions for processing files from FTP)

		// since we need to retry if the job fails (attempts are set on Queue)
		// otherwise in retries it would be flagged as stalled job
		// e.g. when FTP is not reachable bcs some DNS problem etc.
		lockDuration: 120000, // 2 mins
	},
);

export default documentsWorker;
