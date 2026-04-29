import { Code, ConnectError, createPromiseClient } from '@bufbuild/connect';
import { Timestamp } from '@bufbuild/protobuf';
import {
  DeleteTeaNoteRequest,
  GetTeaNoteRequest,
  ListTeaNotesRequest,
  NoteRatingsMsg,
  TeaNote,
  UpsertTeaNoteRequest,
} from '../generated/teanotes/v1/tea_notes_pb';
import { TeaNotesService } from '../generated/teanotes/v1/tea_notes_connect';
import { apiTransport } from './apiTransport';
import type { NoteRecord } from './notes';
import { normalizeTeaOrigin } from './originNormalization';

const client = createPromiseClient(TeaNotesService, apiTransport);

export function noteRecordToTeaNote(record: NoteRecord): TeaNote {
  const normalizedOrigin = normalizeTeaOrigin(record.country, record.originRegion, record.region);
  const ratings = new NoteRatingsMsg({
    aroma: record.ratings.aroma,
    taste: record.ratings.taste,
    aftertaste: record.ratings.aftertaste,
    balance: record.ratings.balance,
  });
  const updatedAt = Timestamp.fromDate(new Date(record.updatedAt));
  const createdAt = Timestamp.fromDate(new Date(record.createdAt || record.updatedAt));
  const harvestYear =
    record.harvestYear === null || record.harvestYear === undefined ? undefined : Number(record.harvestYear);
  return new TeaNote({
    id: record.id,
    noteColor: record.noteColor || undefined,
    isFavorite: Boolean(record.isFavorite),
    sessionTitle: record.sessionTitle || undefined,
    teaName: record.teaName,
    teaType: record.teaType,
    country: normalizedOrigin.country || undefined,
    region: normalizedOrigin.originRegion || normalizedOrigin.region || '',
    // legacy поля больше не заполняются текущей формой
    originDetail: undefined,
    cultivar: undefined,
    source: undefined,
    processingStyle: undefined,
    harvestSeason: record.harvestSeason || undefined,
    harvestYear,
    passportNotes: record.passportNotes || undefined,
    skippedFields: record.skippedFields ?? [],
    brewingMode: record.brewingMode,
    brewingMethod: record.brewingMethod,
    waterSource: record.waterSource || undefined,
    setupId: record.setupId ?? undefined,
    setupSummary: record.setupSummary,
    leafGrams: record.leafGrams ?? undefined,
    waterTemp: record.waterTemp ?? undefined,
    waterVolumeMl: record.waterVolumeMl ?? undefined,
    rinseCount: record.rinseCount ?? undefined,
    infusionsCount: record.infusionsCount ?? undefined,
    timeValue: record.timeValue ?? undefined,
    timeUnit: record.timeUnit,
    descriptors: record.descriptors,
    liquorColor: record.liquorColor || undefined,
    mouthfeel: record.mouthfeel || undefined,
    energyEffect: record.energyEffect || undefined,
    cupProfileNotes: record.cupProfileNotes || undefined,
    freeText: record.freeText,
    ratings,
    createdAt,
    updatedAt,
  });
}

export function teaNoteToRecord(note: TeaNote): NoteRecord {
  const r = note.ratings;
  const normalizedOrigin = normalizeTeaOrigin(note.country, note.region, note.region);
  return {
    id: note.id,
    noteColor: note.noteColor,
    isFavorite: note.isFavorite,
    sessionTitle: note.sessionTitle,
    teaName: note.teaName,
    teaType: note.teaType,
    country: normalizedOrigin.country,
    originRegion: normalizedOrigin.originRegion,
    region: normalizedOrigin.region,
    harvestSeason: note.harvestSeason,
    harvestYear: note.harvestYear === undefined ? null : note.harvestYear,
    passportNotes: note.passportNotes ?? '',
    skippedFields: note.skippedFields?.length ? [...note.skippedFields] : undefined,
    brewingMode: note.brewingMode as NoteRecord['brewingMode'],
    brewingMethod: note.brewingMethod,
    waterSource: note.waterSource,
    setupId: note.setupId ?? null,
    setupSummary: note.setupSummary,
    leafGrams: note.leafGrams ?? null,
    waterTemp: note.waterTemp ?? null,
    waterVolumeMl: note.waterVolumeMl ?? null,
    rinseCount: note.rinseCount ?? null,
    infusionsCount: note.infusionsCount ?? null,
    timeValue: note.timeValue ?? null,
    timeUnit: note.timeUnit,
    descriptors: [...note.descriptors],
    liquorColor: note.liquorColor,
    mouthfeel: note.mouthfeel,
    energyEffect: note.energyEffect,
    cupProfileNotes: note.cupProfileNotes ?? note.freeText,
    freeText: note.freeText,
    ratings: {
      aroma: r?.aroma ?? 0,
      taste: r?.taste ?? 0,
      aftertaste: r?.aftertaste ?? 0,
      balance: r?.balance ?? 0,
    },
    createdAt: note.createdAt?.toDate().toISOString() ?? note.updatedAt?.toDate().toISOString() ?? new Date().toISOString(),
    updatedAt: note.updatedAt?.toDate().toISOString() ?? new Date().toISOString(),
  };
}

export async function upsertTeaNoteRemote(record: NoteRecord): Promise<void> {
  const note = noteRecordToTeaNote(record);
  await client.upsertTeaNote(new UpsertTeaNoteRequest({ note }));
}

export async function listTeaNotesRemote(limit: number, offset: number): Promise<NoteRecord[]> {
  const res = await client.listTeaNotes(new ListTeaNotesRequest({ limit, offset }));
  return (res.notes ?? []).map(teaNoteToRecord);
}

export async function listAllTeaNotesRemote(pageSize = 200): Promise<NoteRecord[]> {
  const records: NoteRecord[] = [];
  const normalizedPageSize = Math.min(Math.max(pageSize, 1), 500);
  let offset = 0;

  while (true) {
    const batch = await listTeaNotesRemote(normalizedPageSize, offset);
    records.push(...batch);
    if (batch.length < normalizedPageSize) {
      return records;
    }
    offset += batch.length;
  }
}

export async function getTeaNoteRemote(noteId: string): Promise<NoteRecord | null> {
  const res = await client.getTeaNote(new GetTeaNoteRequest({ noteId }));
  return res.note ? teaNoteToRecord(res.note) : null;
}

export async function deleteTeaNoteRemote(noteId: string): Promise<void> {
  try {
    await client.deleteTeaNote(new DeleteTeaNoteRequest({ noteId }));
  } catch (reason) {
    const error = ConnectError.from(reason);
    if (error.code === Code.NotFound) {
      return;
    }
    throw error;
  }
}
